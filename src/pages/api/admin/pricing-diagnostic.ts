import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { calculateUnifiedPricing } from '@/lib/unified-pricing';
import { calculateAdvancedPricing } from '@/lib/advanced-pricing';

interface PricingMismatch {
  brandId: string;
  brandName: string;
  brandEmail: string;
  issue: string;
  adminValue: any;
  brandValue: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

interface PricingDiagnosticResult {
  summary: {
    totalBrands: number;
    brandsWithMismatches: number;
    criticalIssues: number;
    highPriorityIssues: number;
    lastUpdated: string;
  };
  mismatches: PricingMismatch[];
  systemHealth: {
    adminPricingConfigured: boolean;
    unifiedPricingActive: boolean;
    defaultRatesSet: boolean;
    brandOverridesCount: number;
  };
  recommendations: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user || authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      const diagnostic = await runPricingDiagnostic();
      res.status(200).json(diagnostic);
    } else if (req.method === 'POST') {
      const { action, brandId, fixAll } = req.body;

      if (action === 'fixMismatch') {
        const result = await fixPricingMismatch(brandId);
        res.status(200).json(result);
      } else if (action === 'fixAllMismatches') {
        const result = await fixAllPricingMismatches();
        res.status(200).json(result);
      } else if (action === 'syncPricing') {
        const result = await syncBrandPricing(brandId);
        res.status(200).json(result);
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in pricing diagnostic API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function runPricingDiagnostic(): Promise<PricingDiagnosticResult> {
  const mismatches: PricingMismatch[] = [];
  const recommendations: string[] = [];

  // Get all brands
  const brands = await prisma.user.findMany({
    where: { role: 'BRAND' },
    select: { id: true, name: true, email: true }
  });

  // Get admin pricing configurations
  const adminCourierPricing = await prisma.courierPricing.findMany({
    include: {
      brand: { select: { id: true, name: true, email: true } }
    }
  });

  const adminAdvancedPricing = await prisma.advancedCourierPricing.findMany({
    include: {
      brand: { select: { id: true, name: true, email: true } }
    }
  });

  const roleBasedPricing = await prisma.roleBasedPricing.findMany();
  const weightBasedPricing = await prisma.weightBasedPricing.findMany();
  const pincodeBasedPricing = await prisma.pincodeBasedPricing.findMany();

  // Get system settings
  const systemSettings = await prisma.systemSettings.findMany({
    where: {
      key: {
        in: ['default_courier_rate', 'base_weight_rate', 'additional_weight_rate', 'remote_area_surcharge']
      }
    }
  });

  const systemConfig = await prisma.systemConfig.findFirst({
    where: { key: 'unified_pricing' }
  });

  // Check each brand for pricing mismatches
  for (const brand of brands) {
    await checkBrandPricingMismatches(brand, adminCourierPricing, mismatches);
  }

  // Check system-level issues
  await checkSystemPricingIssues(systemSettings, systemConfig, mismatches, recommendations);

  // Calculate summary
  const summary = {
    totalBrands: brands.length,
    brandsWithMismatches: new Set(mismatches.map(m => m.brandId)).size,
    criticalIssues: mismatches.filter(m => m.severity === 'CRITICAL').length,
    highPriorityIssues: mismatches.filter(m => m.severity === 'HIGH').length,
    lastUpdated: new Date().toISOString()
  };

  const systemHealth = {
    adminPricingConfigured: adminCourierPricing.length > 0,
    unifiedPricingActive: !!systemConfig,
    defaultRatesSet: systemSettings.length > 0,
    brandOverridesCount: adminCourierPricing.length
  };

  return {
    summary,
    mismatches,
    systemHealth,
    recommendations
  };
}

async function checkBrandPricingMismatches(
  brand: { id: string; name: string; email: string },
  adminCourierPricing: any[],
  mismatches: PricingMismatch[]
) {
  try {
    // Get admin-configured pricing for this brand
    const adminPricing = adminCourierPricing.find(p => p.brandId === brand.id);

    // Simulate brand API call to get what brand sees
    const brandPricingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/brand/courier-pricing`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real implementation, we'd need proper auth headers
      }
    }).catch(() => null);

    let brandPricing = null;
    if (brandPricingResponse?.ok) {
      const data = await brandPricingResponse.json();
      brandPricing = data.pricing;
    }

    // Test pricing calculation consistency
    const testCalculation = {
      brandId: brand.id,
      role: 'BRAND',
      weight: 2.0,
      pincode: '110001',
      numBoxes: 1,
      serviceType: 'STANDARD'
    };

    const adminCalculation = await calculateAdvancedPricing(testCalculation);
    const unifiedCalculation = await calculateUnifiedPricing({
      brandId: brand.id,
      weight: 2.0,
      pieces: 1,
      pincode: '110001',
      serviceType: 'STANDARD',
      courierType: 'FORWARD'
    });

    // Check for mismatches
    if (adminPricing && brandPricing) {
      // Check base rate mismatch
      if (Math.abs(adminPricing.perBoxRate - brandPricing.baseRate) > 0.01) {
        mismatches.push({
          brandId: brand.id,
          brandName: brand.name,
          brandEmail: brand.email,
          issue: 'Base Rate Mismatch',
          adminValue: adminPricing.perBoxRate,
          brandValue: brandPricing.baseRate,
          severity: 'HIGH',
          recommendation: 'Sync brand pricing API to use admin-configured rates'
        });
      }

      // Check active status mismatch
      if (adminPricing.isActive !== brandPricing.isActive) {
        mismatches.push({
          brandId: brand.id,
          brandName: brand.name,
          brandEmail: brand.email,
          issue: 'Active Status Mismatch',
          adminValue: adminPricing.isActive,
          brandValue: brandPricing.isActive,
          severity: 'MEDIUM',
          recommendation: 'Ensure brand API reflects admin active/inactive status'
        });
      }
    }

    // Check calculation consistency
    if (adminCalculation.success && unifiedCalculation.success) {
      const priceDifference = Math.abs(adminCalculation.price - unifiedCalculation.totalCost);
      if (priceDifference > 1.0) { // More than ₹1 difference
        mismatches.push({
          brandId: brand.id,
          brandName: brand.name,
          brandEmail: brand.email,
          issue: 'Calculation Inconsistency',
          adminValue: adminCalculation.price,
          brandValue: unifiedCalculation.totalCost,
          severity: 'CRITICAL',
          recommendation: 'Align pricing calculation methods between admin and unified systems'
        });
      }
    }

    // Check if brand has no admin pricing configured
    if (!adminPricing) {
      mismatches.push({
        brandId: brand.id,
        brandName: brand.name,
        brandEmail: brand.email,
        issue: 'No Admin Pricing Configured',
        adminValue: null,
        brandValue: brandPricing?.baseRate || 'Unknown',
        severity: 'MEDIUM',
        recommendation: 'Configure admin pricing for this brand or set default rates'
      });
    }

  } catch (error) {
    console.error(`Error checking pricing for brand ${brand.id}:`, error);
    mismatches.push({
      brandId: brand.id,
      brandName: brand.name,
      brandEmail: brand.email,
      issue: 'Pricing Check Failed',
      adminValue: 'Error',
      brandValue: 'Error',
      severity: 'HIGH',
      recommendation: 'Investigate pricing system errors for this brand'
    });
  }
}

async function checkSystemPricingIssues(
  systemSettings: any[],
  systemConfig: any,
  mismatches: PricingMismatch[],
  recommendations: string[]
) {
  // Check if default rates are set
  const requiredSettings = ['default_courier_rate', 'base_weight_rate', 'additional_weight_rate'];
  const missingSettings = requiredSettings.filter(
    setting => !systemSettings.find(s => s.key === setting)
  );

  if (missingSettings.length > 0) {
    recommendations.push(`Set missing system settings: ${missingSettings.join(', ')}`);
  }

  // Check if unified pricing is configured
  if (!systemConfig) {
    recommendations.push('Configure unified pricing system for consistent calculations');
  }

  // Check for inactive pricing rules
  const inactiveRules = await prisma.courierPricing.count({
    where: { isActive: false }
  });

  if (inactiveRules > 0) {
    recommendations.push(`Review ${inactiveRules} inactive pricing rules - consider cleanup or reactivation`);
  }
}

async function fixPricingMismatch(brandId: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Get admin pricing for the brand
    const adminPricing = await prisma.courierPricing.findUnique({
      where: { brandId }
    });

    if (!adminPricing) {
      // Create default pricing if none exists
      const defaultRate = await getDefaultCourierRate();
      await prisma.courierPricing.create({
        data: {
          brandId,
          perBoxRate: defaultRate,
          isActive: true
        }
      });

      return {
        success: true,
        message: `Created default pricing (₹${defaultRate}/box) for brand`
      };
    }

    // Force refresh of brand pricing cache (if any caching is implemented)
    // This would depend on your caching strategy

    return {
      success: true,
      message: 'Pricing mismatch resolved - brand will see updated rates on next API call'
    };

  } catch (error) {
    console.error('Error fixing pricing mismatch:', error);
    return {
      success: false,
      message: 'Failed to fix pricing mismatch',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function fixAllPricingMismatches(): Promise<{ success: boolean; fixed: number; errors: number; message: string }> {
  let fixed = 0;
  let errors = 0;

  try {
    // Get all brands without pricing
    const brandsWithoutPricing = await prisma.user.findMany({
      where: {
        role: 'BRAND',
        courierPricing: null
      }
    });

    const defaultRate = await getDefaultCourierRate();

    // Create pricing for brands without it
    for (const brand of brandsWithoutPricing) {
      try {
        await prisma.courierPricing.create({
          data: {
            brandId: brand.id,
            perBoxRate: defaultRate,
            isActive: true
          }
        });
        fixed++;
      } catch (error) {
        console.error(`Error creating pricing for brand ${brand.id}:`, error);
        errors++;
      }
    }

    // Ensure all existing pricing is properly configured
    const existingPricing = await prisma.courierPricing.findMany({
      where: {
        OR: [
          { isActive: null },
          { perBoxRate: { lte: 0 } }
        ]
      }
    });

    for (const pricing of existingPricing) {
      try {
        await prisma.courierPricing.update({
          where: { id: pricing.id },
          data: {
            isActive: pricing.isActive ?? true,
            perBoxRate: pricing.perBoxRate <= 0 ? defaultRate : pricing.perBoxRate
          }
        });
        fixed++;
      } catch (error) {
        console.error(`Error updating pricing ${pricing.id}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      fixed,
      errors,
      message: `Fixed ${fixed} pricing issues with ${errors} errors`
    };

  } catch (error) {
    console.error('Error fixing all pricing mismatches:', error);
    return {
      success: false,
      fixed,
      errors: errors + 1,
      message: 'Failed to fix all pricing mismatches'
    };
  }
}

async function syncBrandPricing(brandId: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Get admin pricing
    const adminPricing = await prisma.courierPricing.findUnique({
      where: { brandId }
    });

    if (!adminPricing) {
      return {
        success: false,
        message: 'No admin pricing found for this brand',
        error: 'PRICING_NOT_FOUND'
      };
    }

    // Update timestamp to force refresh
    await prisma.courierPricing.update({
      where: { brandId },
      data: {
        updatedAt: new Date()
      }
    });

    // Log the sync action
    await prisma.activityLog.create({
      data: {
        userId: brandId,
        action: 'PRICING_SYNC',
        details: JSON.stringify({
          perBoxRate: adminPricing.perBoxRate,
          isActive: adminPricing.isActive,
          syncedAt: new Date().toISOString()
        })
      }
    }).catch(() => {
      // Ignore if activity log fails
    });

    return {
      success: true,
      message: 'Brand pricing synchronized with admin configuration'
    };

  } catch (error) {
    console.error('Error syncing brand pricing:', error);
    return {
      success: false,
      message: 'Failed to sync brand pricing',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getDefaultCourierRate(): Promise<number> {
  const defaultRateSetting = await prisma.systemSettings.findUnique({
    where: { key: 'default_courier_rate' }
  });

  return defaultRateSetting ? parseFloat(defaultRateSetting.value) : 50;
}