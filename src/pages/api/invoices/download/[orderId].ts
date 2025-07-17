import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { orderId } = req.query;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // Get order details
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: user.id
      },
      include: {
        items: {
          include: {
            part: true
          }
        },
        customer: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Create PDF invoice
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(12).text('SpareFlow - AI Spare Logistics Platform', 50, 80);
    doc.text('Email: support@spareflow.com', 50, 95);
    doc.text('Phone: +91-9876543210', 50, 110);

    // Order details
    doc.text(`Invoice Number: INV-${order.orderNumber}`, 350, 50);
    doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 350, 65);
    doc.text(`Order Status: ${order.status}`, 350, 80);
    doc.text(`Payment Status: ${order.paymentStatus}`, 350, 95);

    // Customer details
    doc.text('Bill To:', 50, 150);
    doc.text(order.customer.name, 50, 165);
    doc.text(order.customer.email, 50, 180);
    doc.text(order.customer.phone || '', 50, 195);

    if (order.shippingAddress) {
      const address = typeof order.shippingAddress === 'string' 
        ? JSON.parse(order.shippingAddress) 
        : order.shippingAddress;
      
      doc.text('Ship To:', 350, 150);
      doc.text(address.name || order.customer.name, 350, 165);
      doc.text(address.address || '', 350, 180);
      doc.text(`${address.city || ''}, ${address.state || ''} ${address.pincode || ''}`, 350, 195);
      doc.text(address.phone || '', 350, 210);
    }

    // Items table
    const tableTop = 250;
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 250, tableTop);
    doc.text('Price', 300, tableTop);
    doc.text('Total', 400, tableTop);
    
    // Draw line
    doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();

    let yPosition = tableTop + 30;
    let subtotal = 0;

    order.items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      doc.text(item.part.name, 50, yPosition);
      doc.text(item.quantity.toString(), 250, yPosition);
      doc.text(`₹${item.price}`, 300, yPosition);
      doc.text(`₹${itemTotal}`, 400, yPosition);
      
      yPosition += 20;
    });

    // Totals
    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
    yPosition += 15;

    doc.text('Subtotal:', 300, yPosition);
    doc.text(`₹${subtotal}`, 400, yPosition);
    yPosition += 15;

    doc.text('Tax (18% GST):', 300, yPosition);
    const tax = subtotal * 0.18;
    doc.text(`₹${tax.toFixed(2)}`, 400, yPosition);
    yPosition += 15;

    doc.fontSize(14).text('Total:', 300, yPosition);
    doc.text(`₹${(subtotal + tax).toFixed(2)}`, 400, yPosition);

    // Footer
    doc.fontSize(10).text('Thank you for your business!', 50, doc.page.height - 100);
    doc.text('This is a computer generated invoice.', 50, doc.page.height - 85);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Invoice download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate invoice'
    });
  }
}