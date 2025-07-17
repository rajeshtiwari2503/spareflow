import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { generateAWB } from '@/lib/dtdc';
import { createPayment, generateOrderId, toSmallestCurrencyUnit, formatCurrency } from '@/lib/payment';
import { sendOrderConfirmation, formatPhoneNumber } from '@/lib/whatsapp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('Checkout API - Request body:', JSON.stringify(req.body, null, 2));
      
      const {
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        items,
        totalAmount,
        paymentMethod = 'UPI'
      } = req.body;

      // Extract shipping details with better validation
      const name = customerName || shippingAddress?.name || '';
      const phone = customerPhone || shippingAddress?.phone || '';
      const email = customerEmail || `${phone}@spareflow.com`;
      const address = shippingAddress?.address || '';
      const city = shippingAddress?.city || 'Unknown';
      const state = shippingAddress?.state || 'Unknown';
      const pincode = shippingAddress?.pincode || '';
      const cartItems = items || [];

      console.log('Checkout validation - Name:', name, 'Phone:', phone, 'Address:', address, 'Pincode:', pincode, 'Items:', cartItems.length);

      // Enhanced validation with detailed error messages
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Valid customer name is required (minimum 2 characters)' });
      }
      
      if (!phone || phone.trim().length < 10) {
        return res.status(400).json({ success: false, error: 'Valid phone number is required (minimum 10 digits)' });
      }
      
      if (!address || address.trim().length < 10) {
        return res.status(400).json({ success: false, error: 'Complete address is required (minimum 10 characters)' });
      }
      
      if (!pincode || !/^\d{6}$/.test(pincode.trim())) {
        return res.status(400).json({ success: false, error: 'Valid 6-digit pincode is required' });
      }
      
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart items are required' });
      }

      // Validate each cart item
      for (const item of cartItems) {
        if (!item.partId || !item.quantity || !item.price) {
          return res.status(400).json({ success: false, error: 'Invalid cart item: missing partId, quantity, or price' });
        }
        if (item.quantity <= 0 || item.price <= 0) {
          return res.status(400).json({ success: false, error: 'Invalid cart item: quantity and price must be positive' });
        }
      }

      // Calculate total amount with validation
      const calculatedTotal = totalAmount || cartItems.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.price) * parseInt(item.quantity)), 0
      );

      console.log('Calculated total amount:', calculatedTotal);

      // Validate minimum order amount
      if (calculatedTotal < 50) {
        return res.status(400).json({ success: false, error: 'Minimum order amount is ₹50' });
      }

      // Validate maximum order amount (safety check)
      if (calculatedTotal > 100000) {
        return res.status(400).json({ success: false, error: 'Maximum order amount is ₹1,00,000' });
      }

      // Create or find customer with better error handling
      let customer;
      try {
        customer = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: email },
              { name: name, role: 'CUSTOMER' }
            ]
          }
        });

        if (!customer) {
          console.log('Creating new customer:', name, email);
          customer = await prisma.user.create({
            data: {
              name: name.trim(),
              email: email.trim(),
              password: 'temp_password', // In real app, this would be handled differently
              role: 'CUSTOMER'
            }
          });
          console.log('Customer created successfully:', customer.id);
        } else {
          console.log('Found existing customer:', customer.id);
        }
      } catch (error) {
        console.error('Error creating/finding customer:', error);
        return res.status(500).json({ success: false, error: 'Failed to process customer information' });
      }

      // Generate unique order ID for payment
      const orderId = generateOrderId('SF_ORDER');
      console.log('Generated order ID:', orderId);

      // Create payment if not COD
      let paymentResult = null;
      if (paymentMethod !== 'COD') {
        try {
          console.log('Creating payment for amount:', calculatedTotal);
          paymentResult = await createPayment({
            amount: toSmallestCurrencyUnit(calculatedTotal),
            currency: 'INR',
            orderId: orderId,
            customerDetails: {
              name: name,
              email: email,
              phone: phone
            },
            description: `SpareFlow Order - ${cartItems.length} item(s)`,
            metadata: {
              customer_id: customer.id,
              address: address,
              pincode: pincode,
              items_count: cartItems.length
            }
          });

          if (!paymentResult.success) {
            console.error('Payment creation failed:', paymentResult.error);
            return res.status(400).json({ 
              success: false,
              error: 'Payment creation failed', 
              details: paymentResult.error 
            });
          }
          console.log('Payment created successfully:', paymentResult.paymentId);
        } catch (error) {
          console.error('Payment creation error:', error);
          return res.status(500).json({ 
            success: false,
            error: 'Payment processing failed', 
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Process each cart item
      const orderPromises = cartItems.map(async (item: any) => {
        // Generate AWB for this order
        const awbResult = await generateAWB({
          consignee_name: customerName,
          consignee_phone: customerPhone,
          consignee_address: address,
          consignee_city: 'Unknown', // Would be extracted from address in real implementation
          consignee_state: 'Unknown', // Would be extracted from address in real implementation
          consignee_pincode: pincode,
          product_type: 'NON-DOC',
          weight: item.weight || 0.5,
          pieces: 1,
          reference_number: `${orderId}_${item.partId}`
        });

        // Create customer order
        const order = await prisma.customerOrder.create({
          data: {
            customerId: customer.id,
            partId: item.partId,
            quantity: item.quantity,
            awbNumber: awbResult.success ? awbResult.awb_number : `PENDING_${Date.now()}`,
            status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT'
          }
        });

        return {
          orderId: order.id,
          awbNumber: awbResult.success ? awbResult.awb_number : null,
          trackingUrl: awbResult.success ? awbResult.tracking_url : null,
          partName: item.partName,
          quantity: item.quantity,
          amount: item.price * item.quantity,
          awbSuccess: awbResult.success
        };
      });

      const orders = await Promise.all(orderPromises);

      // Prepare order details for WhatsApp
      const orderDetails = orders.map(order => 
        `• ${order.partName} (Qty: ${order.quantity}) - ${formatCurrency(order.amount * 100)}${order.awbNumber ? `\n  📋 AWB: ${order.awbNumber}` : ''}`
      ).join('\n');

      const trackingLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://spareflow.com'}/track`;

      // Send WhatsApp confirmation
      let whatsappSent = false;
      try {
        const formattedPhone = formatPhoneNumber(customerPhone);
        const whatsappResult = await sendOrderConfirmation(
          formattedPhone,
          customerName,
          orderDetails,
          totalAmount,
          trackingLink
        );
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          console.error('WhatsApp notification failed:', whatsappResult.error);
        }
      } catch (error) {
        console.error('WhatsApp notification error:', error);
      }

      // Prepare response
      const response: any = {
        success: true,
        message: paymentMethod === 'COD' ? 'Order placed successfully' : 'Payment created successfully',
        orderId: orderId,
        orders,
        totalAmount: calculatedTotal,
        formattedAmount: formatCurrency(calculatedTotal * 100),
        whatsappSent,
        paymentMethod
      };

      // Add payment details if not COD - return Razorpay order format
      if (paymentResult) {
        response.order = {
          id: paymentResult.paymentId || orderId,
          amount: toSmallestCurrencyUnit(calculatedTotal),
          currency: 'INR'
        };
        response.payment = {
          paymentId: paymentResult.paymentId,
          status: paymentResult.status,
          paymentUrl: paymentResult.paymentUrl
        };
      }

      res.status(200).json(response);

    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ 
        error: 'Failed to process checkout',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}