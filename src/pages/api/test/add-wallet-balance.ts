import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';
import { creditToWallet } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;

    // Only brands can add wallet balance (for testing)
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Only brands can add wallet balance' });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (amount > 10000) {
      return res.status(400).json({ error: 'Maximum test amount is ₹10,000' });
    }

    console.log(`💰 Adding ₹${amount} to wallet for brand:`, user.email);

    // Credit amount to wallet
    const result = await creditToWallet(
      user.id,
      amount,
      `Test wallet recharge - ₹${amount}`,
      `TEST_RECHARGE_${Date.now()}`
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to add wallet balance',
        details: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully added ₹${amount} to your wallet`,
      transaction: {
        amount,
        transactionId: result.transactionId,
        newBalance: result.newBalance,
        description: `Test wallet recharge - ₹${amount}`
      },
      walletInfo: {
        previousBalance: (result.newBalance || 0) - amount,
        newBalance: result.newBalance,
        amountAdded: amount
      }
    });

  } catch (error) {
    console.error('Error adding wallet balance:', error);
    return res.status(500).json({
      error: 'Failed to add wallet balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}