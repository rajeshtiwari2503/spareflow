import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { creditToWallet } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user || authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = authResult.user;

    if (req.method === 'GET') {
      // Check if export is requested
      if (req.query.export === 'true') {
        const transactions = await prisma.walletTransaction.findMany({
          include: {
            user: {
              select: { name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        const csvHeader = 'ID,User Name,User Email,Type,Amount,Description,Status,Created At\n';
        const csvData = transactions.map(txn => 
          `${txn.id},"${txn.user?.name || 'Unknown'}","${txn.user?.email || 'Unknown'}","${txn.type}","${txn.amount}","${txn.description}","COMPLETED","${txn.createdAt}"`
        ).join('\n');
        
        return res.status(200).json({ csv: csvHeader + csvData });
      }

      // Fetch wallet transactions with user information
      const transactions = await prisma.walletTransaction.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Transform to match expected format
      const formattedTransactions = transactions.map(txn => ({
        id: txn.id,
        userId: txn.userId,
        userName: txn.user?.name || 'Unknown User',
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        status: 'COMPLETED',
        createdAt: txn.createdAt,
        wallet: {
          brand: {
            id: txn.user?.id,
            name: txn.user?.name,
            email: txn.user?.email
          }
        }
      }));

      // Fetch brand wallets with proper relationships
      const brandWallets = await prisma.brandWallet.findMany({
        include: {
          brand: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Also fetch generic wallets for brands
      const genericWallets = await prisma.wallet.findMany({
        where: {
          user: {
            role: 'BRAND'
          }
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Combine and format wallets
      const allWallets = [
        ...brandWallets.map(wallet => ({
          id: wallet.id,
          brandId: wallet.brandId,
          balance: wallet.balance,
          totalSpent: wallet.totalSpent,
          lastRecharge: wallet.lastRecharge,
          brand: wallet.brand,
          transactions: []
        })),
        ...genericWallets.filter(gw => !brandWallets.find(bw => bw.brandId === gw.userId)).map(wallet => ({
          id: wallet.id,
          brandId: wallet.userId,
          balance: wallet.balance,
          totalSpent: wallet.totalSpent,
          lastRecharge: wallet.lastRecharge,
          brand: {
            id: wallet.user.id,
            name: wallet.user.name,
            email: wallet.user.email
          },
          transactions: []
        }))
      ];

      res.status(200).json({
        transactions: formattedTransactions,
        wallets: allWallets,
        brandsWithoutWallets: []
      });
    } else if (req.method === 'POST') {
      const { action, brandId, userId, type, amount, description, status } = req.body;

      if (action === 'recharge' || !action) {
        const targetUserId = brandId || userId;
        
        if (!targetUserId || !amount || amount <= 0) {
          return res.status(400).json({ error: 'User ID and valid amount are required' });
        }

        // Verify the target user exists and is a brand
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, name: true, email: true, role: true }
        });

        if (!targetUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        if (targetUser.role !== 'BRAND') {
          return res.status(400).json({ error: 'Can only recharge brand wallets' });
        }

        const rechargeAmount = parseFloat(amount);
        const rechargeDescription = description || `Admin recharge of ₹${rechargeAmount}`;

        try {
          // Use the wallet service to credit the wallet
          const walletResult = await creditToWallet(
            targetUserId,
            rechargeAmount,
            rechargeDescription,
            `ADMIN_RECHARGE_${Date.now()}`
          );

          if (!walletResult.success) {
            return res.status(400).json({ 
              error: walletResult.error || 'Failed to recharge wallet' 
            });
          }

          // Also update/create BrandWallet for compatibility
          await prisma.brandWallet.upsert({
            where: { brandId: targetUserId },
            update: {
              balance: { increment: rechargeAmount },
              lastRecharge: new Date()
            },
            create: {
              brandId: targetUserId,
              balance: rechargeAmount,
              totalSpent: 0,
              lastRecharge: new Date()
            }
          });

          // Fetch the transaction details
          const transaction = await prisma.walletTransaction.findUnique({
            where: { id: walletResult.transactionId },
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          });

          const formattedTransaction = {
            id: transaction?.id,
            userId: transaction?.userId,
            userName: transaction?.user?.name || 'Unknown User',
            type: transaction?.type,
            amount: transaction?.amount,
            description: transaction?.description,
            status: 'COMPLETED',
            createdAt: transaction?.createdAt,
          };

          res.status(200).json({
            success: true,
            message: `Successfully recharged ₹${rechargeAmount} to ${targetUser.name}'s wallet`,
            transaction: formattedTransaction,
            newBalance: walletResult.newBalance
          });

        } catch (error) {
          console.error('Error during wallet recharge:', error);
          return res.status(500).json({ 
            error: 'Failed to process wallet recharge',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } else if (req.method === 'PUT') {
      const { id, userId, type, amount, description, status } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }

      const transaction = await prisma.walletTransaction.update({
        where: { id },
        data: {
          ...(userId && { userId }),
          ...(type && { type }),
          ...(amount && { amount: parseFloat(amount) }),
          ...(description && { description }),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      const formattedTransaction = {
        id: transaction.id,
        userId: transaction.userId,
        userName: transaction.user?.name || 'Unknown User',
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        status: status || 'COMPLETED',
        createdAt: transaction.createdAt,
      };

      res.status(200).json({
        success: true,
        message: 'Transaction updated successfully',
        transaction: formattedTransaction
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in wallet API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}