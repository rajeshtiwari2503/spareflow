import { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { creditToWallet, getOrCreateWallet } from '@/lib/enhanced-wallet'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get authenticated user
    const user = await getUserFromRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    console.log(`=== WALLET MIGRATION REQUEST FOR USER: ${user.id} (${user.role}) ===`)

    const migrationResults = {
      userId: user.id,
      userRole: user.role,
      actions: [] as string[],
      errors: [] as string[],
      beforeMigration: {} as any,
      afterMigration: {} as any
    }

    // Check current state
    const currentWallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    })

    const oldBrandWallet = await prisma.brandWallet.findUnique({
      where: { brandId: user.id }
    })

    migrationResults.beforeMigration = {
      hasNewWallet: !!currentWallet,
      newWalletBalance: currentWallet?.balance || 0,
      hasOldBrandWallet: !!oldBrandWallet,
      oldBrandWalletBalance: oldBrandWallet?.balance || 0
    }

    // Ensure new wallet exists
    const wallet = await getOrCreateWallet(user.id)
    migrationResults.actions.push('Ensured new wallet exists')

    // Migrate from old BrandWallet if needed
    if (oldBrandWallet && oldBrandWallet.balance > 0) {
      try {
        const migrationResult = await creditToWallet(
          user.id,
          oldBrandWallet.balance,
          `Migration from old BrandWallet system - Balance: ₹${oldBrandWallet.balance}`,
          'MIGRATION'
        )

        if (migrationResult.success) {
          // Zero out the old wallet to prevent double migration
          await prisma.brandWallet.update({
            where: { brandId: user.id },
            data: { balance: 0 }
          })

          migrationResults.actions.push(`Migrated ₹${oldBrandWallet.balance} from old BrandWallet`)
        } else {
          migrationResults.errors.push(`Failed to migrate from old BrandWallet: ${migrationResult.error}`)
        }
      } catch (error) {
        migrationResults.errors.push(`Error during migration: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Get final state
    const finalWallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    })

    const finalOldWallet = await prisma.brandWallet.findUnique({
      where: { brandId: user.id }
    })

    migrationResults.afterMigration = {
      hasNewWallet: !!finalWallet,
      newWalletBalance: finalWallet?.balance || 0,
      hasOldBrandWallet: !!finalOldWallet,
      oldBrandWalletBalance: finalOldWallet?.balance || 0
    }

    // Calculate migration summary
    const balanceChange = (finalWallet?.balance || 0) - (currentWallet?.balance || 0)
    
    res.status(200).json({
      success: true,
      migrationResults,
      summary: {
        balanceChange,
        totalActions: migrationResults.actions.length,
        totalErrors: migrationResults.errors.length,
        migrationNeeded: !!oldBrandWallet && oldBrandWallet.balance > 0,
        migrationCompleted: migrationResults.errors.length === 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in wallet migration API:', error)
    res.status(500).json({
      error: 'Failed to migrate wallet',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}