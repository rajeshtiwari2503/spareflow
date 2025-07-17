import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { advancedPricingEngine, PricingRule, PricingContext } from '@/lib/advanced-pricing-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || !['BRAND', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rule, testContext } = req.body;

    // Validate input
    if (!rule || !testContext) {
      return res.status(400).json({ 
        error: 'Missing required fields: rule, testContext' 
      });
    }

    // Validate test context
    const requiredFields = ['weight', 'distance', 'baseCost', 'brandId'];
    for (const field of requiredFields) {
      if (testContext[field] === undefined || testContext[field] === null) {
        return res.status(400).json({ 
          error: `Missing required test context field: ${field}` 
        });
      }
    }

    // Set default values for optional fields
    const fullTestContext: PricingContext = {
      weight: testContext.weight,
      distance: testContext.distance,
      volume: testContext.volume || 1000,
      value: testContext.value || 10000,
      destinationPincode: testContext.destinationPincode || '110001',
      serviceType: testContext.serviceType || 'standard',
      customerTier: testContext.customerTier || 'regular',
      shipmentTime: new Date(testContext.shipmentTime || Date.now()),
      quantity: testContext.quantity || 1,
      brandId: testContext.brandId,
      customerId: testContext.customerId || 'test-customer',
      baseCost: testContext.baseCost
    };

    // Test the pricing rule
    const result = await advancedPricingEngine.testPricingRule(rule, fullTestContext);
    
    res.status(200).json({
      success: true,
      result,
      testContext: fullTestContext,
      message: 'Pricing rule test completed successfully'
    });
  } catch (error) {
    console.error('Pricing rule test API error:', error);
    res.status(500).json({ 
      error: 'Failed to test pricing rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}