import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { verifyPayment } from '@/lib/payment';
import { creditToWallet } from '@/lib/wallet';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔍 Payment verification request received:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    // Authenticate user
    const user = await getUserFromRequest(req);
    if (!user) {
      console.error('❌ Authentication failed - no user found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'BRAND') {
      console.error('❌ Access denied - user role:', user.role);
      return res.status(403).json({ error: 'Access denied. Brand role required.' });
    }

    console.log('✅ User authenticated:', { userId: user.id, role: user.role });

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_id 
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      console.error('❌ Missing required fields:', {
        razorpay_order_id: !!razorpay_order_id,
        razorpay_payment_id: !!razorpay_payment_id,
        razorpay_signature: !!razorpay_signature,
        order_id: !!order_id
      });
      return res.status(400).json({ 
        error: 'Missing required payment verification data' 
      });
    }

    console.log('✅ All required fields present');

    // Verify Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('❌ Razorpay key secret not configured');
      return res.status(500).json({ error: 'Payment gateway configuration error' });
    }

    console.log('🔐 Verifying signature...');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    console.log('🔐 Signature verification:', {
      isValid: isSignatureValid,
      provided: razorpay_signature.substring(0, 10) + '...',
      expected: expectedSignature.substring(0, 10) + '...'
    });

    if (!isSignatureValid) {
      console.error('❌ Invalid payment signature');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    console.log('✅ Signature verified successfully');

    // Get payment order from database
    console.log('🔍 Looking up payment order:', order_id);
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: order_id }
    });

    if (!paymentOrder) {
      console.error('❌ Payment order not found:', order_id);
      return res.status(404).json({ error: 'Payment order not found' });
    }

    console.log('✅ Payment order found:', {
      id: paymentOrder.id,
      amount: paymentOrder.amount,
      status: paymentOrder.status,
      userId: paymentOrder.userId
    });

    if (paymentOrder.userId !== user.id) {
      console.error('❌ Unauthorized access - user mismatch:', {
        orderUserId: paymentOrder.userId,
        requestUserId: user.id
      });
      return res.status(403).json({ error: 'Unauthorized access to payment order' });
    }

    if (paymentOrder.status !== 'CREATED') {
      console.error('❌ Payment order already processed:', paymentOrder.status);
      return res.status(400).json({ 
        error: `Payment order already processed. Status: ${paymentOrder.status}` 
      });
    }

    console.log('✅ Payment order validation passed');

    // Verify payment with Razorpay API
    console.log('🔍 Verifying payment with Razorpay API...');
    const verificationResponse = await verifyPayment({
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id, // Use razorpay_order_id instead of our internal order_id
      signature: razorpay_signature
    });

    console.log('📋 Razorpay verification response:', verificationResponse);

    if (!verificationResponse.success) {
      console.error('❌ Payment verification API call failed:', verificationResponse.error);
      
      // Update payment order status to failed
      await prisma.paymentOrder.update({
        where: { id: order_id },
        data: { 
          status: 'FAILED',
          razorpayPaymentId: razorpay_payment_id,
          failureReason: verificationResponse.error || 'Payment verification API failed'
        }
      });

      return res.status(400).json({ 
        error: 'Payment verification failed',
        details: verificationResponse.error 
      });
    }

    // Check if payment is actually captured/successful
    if (!verificationResponse.verified || verificationResponse.status !== 'captured') {
      console.error('❌ Payment not captured:', {
        verified: verificationResponse.verified,
        status: verificationResponse.status,
        paymentId: razorpay_payment_id
      });
      
      // Update payment order status to failed
      await prisma.paymentOrder.update({
        where: { id: order_id },
        data: { 
          status: 'FAILED',
          razorpayPaymentId: razorpay_payment_id,
          failureReason: `Payment status: ${verificationResponse.status}, verified: ${verificationResponse.verified}`
        }
      });

      return res.status(400).json({ 
        error: 'Payment not captured successfully',
        details: `Payment status: ${verificationResponse.status}` 
      });
    }

    console.log('✅ Payment verification successful');

    // Process wallet credit in transaction
    console.log('💰 Processing wallet credit...');
    const result = await prisma.$transaction(async (tx) => {
      // Update payment order status
      console.log('📝 Updating payment order status to COMPLETED...');
      const updatedPaymentOrder = await tx.paymentOrder.update({
        where: { id: order_id },
        data: { 
          status: 'COMPLETED',
          razorpayPaymentId: razorpay_payment_id,
          completedAt: new Date()
        }
      });

      console.log('✅ Payment order updated successfully');

      // Credit amount to wallet
      console.log('💳 Crediting amount to wallet:', {
        userId: user.id,
        amount: paymentOrder.amount,
        paymentId: razorpay_payment_id
      });

      const walletResult = await creditToWallet(
        user.id,
        paymentOrder.amount,
        `Wallet recharge via Razorpay - Order: ${order_id}`,
        razorpay_payment_id
      );

      console.log('💳 Wallet credit result:', walletResult);

      if (!walletResult.success) {
        console.error('❌ Wallet credit failed:', walletResult.error);
        throw new Error(walletResult.error || 'Failed to credit wallet');
      }

      console.log('✅ Wallet credited successfully');

      return {
        paymentOrder: updatedPaymentOrder,
        walletTransaction: walletResult,
        newBalance: walletResult.newBalance
      };
    });

    console.log('🎉 Payment verification and wallet credit completed successfully');

    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Payment verified and wallet credited successfully',
      data: {
        orderId: order_id,
        paymentId: razorpay_payment_id,
        amount: paymentOrder.amount,
        newWalletBalance: result.newBalance,
        transactionId: result.walletTransaction.transactionId
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Try to update payment order status to failed if possible
    try {
      const { order_id } = req.body;
      if (order_id) {
        await prisma.paymentOrder.update({
          where: { id: order_id },
          data: { 
            status: 'FAILED',
            failureReason: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    } catch (updateError) {
      console.error('Failed to update payment order status:', updateError);
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}