import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Use getUserFromRequest for proper authentication
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Brand role required.' })
    }

    if (req.method === 'GET') {
      // Get wallet information with transactions
      const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id }
      })

      // Get recent transactions separately
      const transactions = await prisma.walletTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
          status: true,
          balanceAfter: true
        }
      })

      if (!wallet) {
        // Create wallet if it doesn't exist
        const newWallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0
          }
        })

        return res.status(200).json({
          success: true,
          wallet: {
            ...newWallet,
            currentBalance: newWallet.balance, // Show as current balance
            totalCredit: newWallet.totalEarned,
            totalDebit: newWallet.totalSpent,
            transactions: []
          }
        })
      }

      return res.status(200).json({
        success: true,
        wallet: {
          ...wallet,
          currentBalance: wallet.balance, // Show as current balance
          totalCredit: wallet.totalEarned,
          totalDebit: wallet.totalSpent,
          transactions
        }
      })

    } else if (req.method === 'POST') {
      // Add money to wallet (recharge)
      const { amount, paymentMethod, transactionId } = req.body

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount. Amount must be greater than 0.' })
      }

      const rechargeAmount = parseFloat(amount)
      
      if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount format.' })
      }

      // Get or create wallet
      let wallet = await prisma.wallet.findUnique({
        where: { userId: user.id }
      })

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0
          }
        })
      }

      // Create transaction and update balance atomically
      const result = await prisma.$transaction(async (tx) => {
        // Calculate new balance
        const newBalance = wallet!.balance + rechargeAmount
        const newTotalEarned = wallet!.totalEarned + rechargeAmount

        // Create wallet transaction
        const walletTransaction = await tx.walletTransaction.create({
          data: {
            userId: user.id,
            type: 'CREDIT',
            amount: rechargeAmount,
            description: `Wallet recharge via ${paymentMethod || 'Payment Gateway'}`,
            balanceAfter: newBalance,
            status: 'COMPLETED'
          }
        })

        // Update wallet balance and totals
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet!.id },
          data: {
            balance: newBalance,
            totalEarned: newTotalEarned,
            lastRecharge: new Date()
          }
        })

        return { walletTransaction, updatedWallet }
      })

      // Get recent transactions for response
      const transactions = await prisma.walletTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
          status: true,
          balanceAfter: true
        }
      })

      return res.status(200).json({
        success: true,
        message: 'Wallet recharged successfully',
        transaction: result.walletTransaction,
        wallet: {
          ...result.updatedWallet,
          currentBalance: result.updatedWallet.balance,
          totalCredit: result.updatedWallet.totalEarned,
          totalDebit: result.updatedWallet.totalSpent,
          transactions
        }
      })

    } else {
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Brand wallet API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}