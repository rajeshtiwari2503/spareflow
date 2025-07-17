import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { advancedPricingEngine, PricingRule, PricingContext } from '@/lib/advanced-pricing-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user || !['BRAND', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;
    const brandId = user.role === 'BRAND' ? user.id : req.query.brandId as string;

    switch (method) {
      case 'GET':
        return handleGetRules(req, res, brandId);
      case 'POST':
        return handleCreateRule(req, res, brandId);
      case 'PUT':
        return handleUpdateRule(req, res, brandId);
      case 'DELETE':
        return handleDeleteRule(req, res, brandId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Advanced pricing rules API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetRules(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  try {
    const rules = await advancedPricingEngine.getPricingRules(brandId);
    
    res.status(200).json({
      success: true,
      rules,
      count: rules.length
    });
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
}

async function handleCreateRule(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  try {
    const ruleData = {
      ...req.body,
      brandId
    };

    // Validate required fields
    if (!ruleData.name || !ruleData.conditions || !ruleData.actions) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, conditions, actions' 
      });
    }

    const newRule = await advancedPricingEngine.createPricingRule(ruleData);
    
    res.status(201).json({
      success: true,
      rule: newRule,
      message: 'Pricing rule created successfully'
    });
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    res.status(500).json({ error: 'Failed to create pricing rule' });
  }
}

async function handleUpdateRule(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  try {
    const { ruleId } = req.query;
    
    if (!ruleId) {
      return res.status(400).json({ error: 'Rule ID is required' });
    }

    const updatedRule = await advancedPricingEngine.updatePricingRule(
      ruleId as string, 
      req.body
    );
    
    res.status(200).json({
      success: true,
      rule: updatedRule,
      message: 'Pricing rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(500).json({ error: 'Failed to update pricing rule' });
  }
}

async function handleDeleteRule(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  try {
    const { ruleId } = req.query;
    
    if (!ruleId) {
      return res.status(400).json({ error: 'Rule ID is required' });
    }

    const success = await advancedPricingEngine.deletePricingRule(ruleId as string);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Pricing rule deleted successfully'
      });
    } else {
      res.status(404).json({ error: 'Pricing rule not found' });
    }
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    res.status(500).json({ error: 'Failed to delete pricing rule' });
  }
}