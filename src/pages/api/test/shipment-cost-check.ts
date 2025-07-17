import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { calculateShippingCost } from '@/lib/unified-pricing';
import { checkWalletBalance, getWalletBalance } from '@/lib/wallet';

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

    // Only brands can test shipment costs
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Only brands can test shipment costs' });
    }

    const {
      weight = 1, // kg
      numBoxes = 1,
      priority = 'MEDIUM',
      recipientPincode = '400001',
      declaredValue = 1000
    } = req.body;

    console.log('🧪 Testing shipment cost calculation for brand:', user.email);

    // Step 1: Get current wallet balance
    const walletBalance = await getWalletBalance(user.id);
    console.log('💰 Current wallet balance:', walletBalance);

    // Step 2: Calculate shipping cost
    const shippingCost = await calculateShippingCost({
      brandId: user.id,
      weight,
      distance: 100,
      priority,
      numBoxes,
      declaredValue,
      recipientPincode
    });

    console.log('📊 Calculated shipping cost:', shippingCost);

    // Step 3: Check if wallet has sufficient balance
    const balanceCheck = await checkWalletBalance(user.id, shippingCost.finalTotal);
    console.log('✅ Balance check result:', balanceCheck);

    // Step 4: Get brand pricing info
    const brandPricing = await prisma.courierPricing.findUnique({
      where: { brandId: user.id }
    });

    return res.status(200).json({
      success: true,
      testParameters: {
        weight,
        numBoxes,
        priority,
        recipientPincode,
        declaredValue
      },
      walletInfo: {
        balance: walletBalance?.balance || 0,
        totalSpent: walletBalance?.total_spent || 0,
        lastRecharge: walletBalance?.last_recharge
      },
      shippingCost: {
        ...shippingCost,
        breakdown: {
          baseRate: shippingCost.baseRate,
          weightCharges: shippingCost.weightCharges,
          serviceCharges: shippingCost.serviceCharges,
          remoteAreaSurcharge: shippingCost.remoteAreaSurcharge,
          platformMarkup: shippingCost.platformMarkup,
          finalTotal: shippingCost.finalTotal
        }
      },
      balanceCheck: {
        sufficient: balanceCheck.sufficient,
        currentBalance: balanceCheck.currentBalance,
        required: shippingCost.finalTotal,
        shortfall: balanceCheck.shortfall || 0
      },
      brandPricing: brandPricing ? {
        perBoxRate: brandPricing.perBoxRate,
        isActive: brandPricing.isActive
      } : null,
      canCreateShipment: balanceCheck.sufficient,
      message: balanceCheck.sufficient 
        ? '✅ Sufficient balance - shipment can be created'
        : `❌ Insufficient balance - need ₹${balanceCheck.shortfall} more`
    });

  } catch (error) {
    console.error('Error testing shipment cost:', error);
    return res.status(500).json({
      error: 'Failed to test shipment cost',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}