import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { calculateAdvancedPricing } from '@/lib/advanced-pricing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serviceCenterId, weight, boxes, pincode } = req.body;

    if (!serviceCenterId || !weight || !boxes || !pincode) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'serviceCenterId, weight, boxes, and pincode are required'
      });
    }

    // Get service center wallet balance
    const serviceCenter = await prisma.user.findUnique({
      where: { id: serviceCenterId },
      include: {
        wallet: true
      }
    });

    if (!serviceCenter) {
      return res.status(404).json({
        error: 'Service center not found'
      });
    }

    const walletBalance = serviceCenter.wallet?.balance || 0;

    // Calculate shipping cost using advanced pricing
    const pricingInput = {
      brandId: 'distributor-shipping', // Special identifier for distributor shipping
      role: 'DISTRIBUTOR',
      weight: parseFloat(weight),
      pincode: pincode,
      numBoxes: parseInt(boxes),
      serviceType: 'STANDARD'
    };

    const pricingResult = await calculateAdvancedPricing(pricingInput);

    if (!pricingResult.success) {
      return res.status(500).json({
        error: 'Failed to calculate shipping cost',
        details: pricingResult.error
      });
    }

    const totalCost = pricingResult.price;
    const canProceed = walletBalance >= totalCost;
    const shortfall = canProceed ? 0 : totalCost - walletBalance;

    return res.status(200).json({
      baseRate: pricingResult.breakdown?.baseRate || totalCost * 0.7,
      weightCharge: pricingResult.breakdown?.weightCharge || totalCost * 0.3,
      totalCost: totalCost,
      serviceCenterWalletBalance: walletBalance,
      canProceed: canProceed,
      shortfall: shortfall > 0 ? shortfall : undefined,
      breakdown: pricingResult.breakdown
    });

  } catch (error) {
    console.error('Error calculating shipping estimate:', error);
    return res.status(500).json({
      error: 'Failed to calculate shipping estimate',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}