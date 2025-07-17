import { NextApiRequest, NextApiResponse } from 'next';
import { calculateUnifiedPricing } from '@/lib/unified-pricing';
import { checkWalletBalance } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { 
        brandId, 
        weight, 
        pieces = 1, 
        checkAffordability = false,
        pincode,
        serviceType = 'STANDARD'
      } = req.body;

      if (!brandId) {
        return res.status(400).json({ 
          error: 'Brand ID is required' 
        });
      }

      if (!weight || weight <= 0) {
        return res.status(400).json({ 
          error: 'Valid weight is required' 
        });
      }

      if (pieces <= 0) {
        return res.status(400).json({ 
          error: 'Number of pieces must be greater than 0' 
        });
      }

      // Calculate unified pricing
      const pricingResult = await calculateUnifiedPricing({
        brandId,
        weight,
        pieces,
        pincode,
        serviceType
      });

      if (!pricingResult.success) {
        return res.status(500).json({
          error: 'Pricing calculation failed',
          details: pricingResult.error
        });
      }

      let affordabilityInfo = undefined;
      
      if (checkAffordability) {
        const balanceCheck = await checkWalletBalance(brandId, pricingResult.totalCost);
        affordabilityInfo = {
          canAfford: balanceCheck.sufficient,
          currentBalance: balanceCheck.currentBalance,
          estimatedCost: pricingResult.totalCost,
          shortfall: balanceCheck.shortfall
        };
      }

      res.status(200).json({
        success: true,
        costEstimate: {
          base_cost: pricingResult.breakdown.baseRate,
          weight_cost: pricingResult.breakdown.weightCharges,
          total_cost: pricingResult.totalCost,
          currency: 'INR'
        },
        affordability: affordabilityInfo,
        breakdown: {
          ...pricingResult.breakdown,
          totalCost: pricingResult.totalCost,
          currency: 'INR',
          pieces,
          totalWeight: weight * pieces
        },
        appliedRules: pricingResult.appliedRules
      });

    } catch (error) {
      console.error('Error calculating cost estimate:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}