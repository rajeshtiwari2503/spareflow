import { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest } from '@/lib/auth'
import { debugWalletConsistency, getWalletSummary } from '@/lib/enhanced-wallet'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get authenticated user
    const user = await getUserFromRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    console.log(`=== WALLET DEBUG REQUEST FOR USER: ${user.id} (${user.role}) ===`)

    // Get wallet debug information
    const debugInfo = await debugWalletConsistency(user.id)
    
    // Get wallet summary
    const walletSummary = await getWalletSummary(user.id)

    // Additional checks for brand users
    let brandSpecificInfo = null
    if (user.role === 'BRAND') {
      // Check if there's an old BrandWallet record
      const { prisma } = await import('@/lib/prisma')
      const oldBrandWallet = await prisma.brandWallet.findUnique({
        where: { brandId: user.id }
      })

      brandSpecificInfo = {
        hasOldBrandWallet: !!oldBrandWallet,
        oldBrandWalletBalance: oldBrandWallet?.balance || 0,
        oldBrandWalletTotalSpent: oldBrandWallet?.totalSpent || 0
      }
    }

    res.status(200).json({
      success: true,
      userId: user.id,
      userRole: user.role,
      debugInfo,
      walletSummary,
      brandSpecificInfo,
      timestamp: new Date().toISOString(),
      recommendations: generateRecommendations(debugInfo, brandSpecificInfo)
    })

  } catch (error) {
    console.error('Error in wallet debug API:', error)
    res.status(500).json({
      error: 'Failed to debug wallet',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function generateRecommendations(debugInfo: any, brandSpecificInfo: any): string[] {
  const recommendations: string[] = []

  if (!debugInfo.walletData) {
    recommendations.push('Create a new wallet record for this user')
  }

  if (!debugInfo.isConsistent) {
    recommendations.push('Wallet balance is inconsistent with transaction history - needs reconciliation')
  }

  if (debugInfo.issues.length > 0) {
    recommendations.push(`Address the following issues: ${debugInfo.issues.join(', ')}`)
  }

  if (brandSpecificInfo?.hasOldBrandWallet && brandSpecificInfo.oldBrandWalletBalance > 0) {
    recommendations.push(`Migrate balance from old BrandWallet (₹${brandSpecificInfo.oldBrandWalletBalance}) to new Wallet system`)
  }

  if (debugInfo.transactionCount === 0) {
    recommendations.push('No transactions found - this might be a new wallet')
  }

  return recommendations
}