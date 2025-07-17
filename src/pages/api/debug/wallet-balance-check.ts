import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getWalletBalance, checkWalletBalance } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    
    // Get wallet balance using both methods
    const walletBalance = await getWalletBalance(user.id);
    
    // Get recent transactions
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get wallet record directly from database
    const walletRecord = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    // Check balance for a test amount
    const testAmount = 100;
    const balanceCheck = await checkWalletBalance(user.id, testAmount);

    return res.status(200).json({
      success: true,
      userId: user.id,
      userRole: user.role,
      walletBalance,
      walletRecord,
      balanceCheck: {
        testAmount,
        ...balanceCheck
      },
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt
      })),
      debug: {
        walletExists: !!walletRecord,
        balanceFromWalletService: walletBalance?.balance || 0,
        balanceFromDirectQuery: walletRecord?.balance || 0,
        transactionCount: recentTransactions.length
      }
    });

  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return res.status(500).json({
      error: 'Failed to check wallet balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}