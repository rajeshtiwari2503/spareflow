import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { createPayment, generateOrderId, toSmallestCurrencyUnit, validatePaymentAmount } from '@/lib/payment';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Brand role required.' });
    }

    const { amount } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
    }

    // Validate payment amount (minimum ₹10, maximum ₹1,00,000)
    if (amount < 10 || amount > 100000) {
      return res.status(400).json({ 
        error: 'Invalid amount. Minimum ₹10, Maximum ₹1,00,000' 
      });
    }

    // Generate unique order ID
    const orderId = generateOrderId('WALLET');

    // Convert amount to smallest currency unit (paise)
    const amountInPaise = toSmallestCurrencyUnit(amount, 'INR');

    // Create payment order with Razorpay
    const paymentRequest = {
      amount: amountInPaise,
      currency: 'INR',
      orderId: orderId,
      customerDetails: {
        name: user.name || user.email,
        email: user.email,
        phone: user.phone || '9999999999' // Default phone if not available
      },
      description: `Wallet Recharge - ₹${amount}`,
      metadata: {
        userId: user.id,
        userRole: user.role,
        rechargeAmount: amount,
        timestamp: new Date().toISOString()
      }
    };

    const paymentResponse = await createPayment(paymentRequest);

    if (!paymentResponse.success) {
      return res.status(400).json({ 
        error: 'Failed to create payment order',
        details: paymentResponse.error 
      });
    }

    // Store payment order in database for tracking
    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        id: orderId,
        userId: user.id,
        razorpayOrderId: paymentResponse.paymentId || '',
        amount: amount,
        currency: 'INR',
        status: 'CREATED',
        purpose: 'WALLET_RECHARGE',
        metadata: JSON.stringify({
          customerDetails: paymentRequest.customerDetails,
          description: paymentRequest.description
        })
      }
    });

    // Return order details for frontend
    return res.status(200).json({
      success: true,
      order: {
        id: orderId,
        razorpayOrderId: paymentResponse.paymentId,
        amount: amount,
        amountInPaise: amountInPaise,
        currency: 'INR',
        status: 'created',
        customerDetails: paymentRequest.customerDetails
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Wallet recharge order creation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}