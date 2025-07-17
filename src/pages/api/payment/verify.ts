import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyPayment } from '@/lib/payment';
import { sendOrderConfirmation, formatPhoneNumber } from '@/lib/whatsapp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const {
        paymentId,
        orderId,
        signature
      } = req.body;

      // Validate required fields
      if (!paymentId || !orderId) {
        return res.status(400).json({ error: 'Payment ID and Order ID are required' });
      }

      // Verify payment with gateway
      const verificationResult = await verifyPayment({
        paymentId,
        orderId,
        signature
      });

      if (!verificationResult.success) {
        return res.status(400).json({ 
          error: 'Payment verification failed', 
          details: verificationResult.error 
        });
      }

      if (!verificationResult.verified) {
        return res.status(400).json({ 
          error: 'Payment not verified', 
          details: 'Payment signature or status verification failed' 
        });
      }

      // Update customer orders status
      const updatedOrders = await prisma.customerOrder.updateMany({
        where: {
          awbNumber: {
            contains: orderId.split('_')[2] // Extract order reference from orderId
          },
          status: 'PENDING_PAYMENT'
        },
        data: {
          status: 'CONFIRMED'
        }
      });

      // Get order details for notification
      const orders = await prisma.customerOrder.findMany({
        where: {
          awbNumber: {
            contains: orderId.split('_')[2]
          }
        },
        include: {
          customer: true,
          part: true
        }
      });

      if (orders.length > 0) {
        const customer = orders[0].customer;
        
        // Send WhatsApp confirmation for successful payment
        try {
          const orderDetails = orders.map(order => 
            `• ${order.part.name} (Qty: ${order.quantity}) - ₹${order.part.price * order.quantity}
  📋 AWB: ${order.awbNumber}`
          ).join('\n');

          const totalAmount = orders.reduce((sum, order) => sum + (order.part.price * order.quantity), 0);
          const trackingLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://spareflow.com'}/track`;

          const formattedPhone = formatPhoneNumber(customer.name); // Assuming phone is stored in name field for demo
          await sendOrderConfirmation(
            formattedPhone,
            customer.name,
            orderDetails,
            totalAmount,
            trackingLink
          );
        } catch (error) {
          console.error('WhatsApp notification error after payment:', error);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: verificationResult.paymentId,
        orderId: orderId,
        amount: verificationResult.amount,
        status: verificationResult.status,
        ordersUpdated: updatedOrders.count
      });

    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ 
        error: 'Failed to verify payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}