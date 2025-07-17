import { prisma } from '@/lib/prisma';

export interface PricingCalculationInput {
  brandId?: string;
  role: string;
  weight: number;
  pincode: string;
  numBoxes: number;
  serviceType?: string;
  recipientType?: 'SERVICE_CENTER' | 'DISTRIBUTOR';
}

export interface PricingBreakdown {
  baseRate: number;
  roleMultiplier: number;
  weightSurcharge: number;
  pincodeSurcharge: number;
  serviceTypeSurcharge: number;
  recipientTypeMultiplier: number;
  totalPerBox: number;
  numBoxes: number;
  totalPrice: number;
  appliedRules: string[];
}

export interface PricingCalculationResult {
  success: boolean;
  price: number;
  breakdown: PricingBreakdown;
  error?: string;
}

/**
 * Calculate shipping cost using advanced pricing rules with admin-configured rates
 */
export async function calculateAdvancedPricing(
  input: PricingCalculationInput
): Promise<PricingCalculationResult> {
  try {
    const { brandId, role, weight, pincode, numBoxes, serviceType = 'STANDARD', recipientType } = input;

    const breakdown: PricingBreakdown = {
      baseRate: 0,
      roleMultiplier: 1,
      weightSurcharge: 0,
      pincodeSurcharge: 0,
      serviceTypeSurcharge: 0,
      recipientTypeMultiplier: 0,
      totalPerBox: 0,
      numBoxes: parseInt(numBoxes.toString()),
      totalPrice: 0,
      appliedRules: []
    };

    // Step 1: Get base rate (prioritize admin-configured brand-specific pricing)
    let baseRate = 50; // fallback
    let foundBrandPricing = false;

    if (brandId) {
      const brandPricing = await prisma.courierPricing.findUnique({
        where: { brandId, isActive: true }
      });
      if (brandPricing) {
        baseRate = brandPricing.perBoxRate;
        foundBrandPricing = true;
        breakdown.appliedRules.push(`Admin-configured brand rate: ₹${baseRate} per box`);
      }
    }

    // If no brand-specific rate, check for role-based pricing
    if (!foundBrandPricing) {
      const rolePricing = await prisma.roleBasedPricing.findUnique({
        where: { role, isActive: true }
      });
      if (rolePricing) {
        baseRate = rolePricing.baseRate;
        breakdown.roleMultiplier = rolePricing.multiplier;
        breakdown.appliedRules.push(`Role-based rate (${role}): ₹${baseRate} × ${breakdown.roleMultiplier}`);
      } else {
        // Use system default if no role-specific pricing
        const defaultRateSetting = await prisma.systemSettings.findUnique({
          where: { key: 'default_courier_rate' }
        });
        if (defaultRateSetting) {
          baseRate = parseFloat(defaultRateSetting.value);
        }
        breakdown.appliedRules.push(`Default system rate: ₹${baseRate} per box`);
      }
    }

    breakdown.baseRate = baseRate;

    // Step 2: Apply weight-based pricing
    const weightPricing = await prisma.weightBasedPricing.findFirst({
      where: {
        minWeight: { lte: weight },
        OR: [
          { maxWeight: null },
          { maxWeight: { gte: weight } }
        ],
        isActive: true
      },
      orderBy: { minWeight: 'desc' }
    });

    if (weightPricing) {
      const additionalWeight = Math.max(0, weight - weightPricing.minWeight);
      breakdown.weightSurcharge = additionalWeight * weightPricing.additionalRate;
      breakdown.appliedRules.push(
        `Weight surcharge: ${additionalWeight.toFixed(1)}kg × ₹${weightPricing.additionalRate} = ₹${breakdown.weightSurcharge.toFixed(2)}`
      );
    }

    // Step 3: Apply pincode-based pricing
    const pincodePricing = await prisma.pincodeBasedPricing.findUnique({
      where: { pincode, isActive: true }
    });
    if (pincodePricing) {
      breakdown.pincodeSurcharge = pincodePricing.surcharge;
      breakdown.appliedRules.push(
        `Pincode surcharge (${pincode}, ${pincodePricing.zone}): ₹${breakdown.pincodeSurcharge}`
      );
    }

    // Step 4: Apply service type surcharge (if applicable)
    if (serviceType !== 'STANDARD') {
      const serviceTypeSurcharges: Record<string, number> = {
        EXPRESS: 25,
        OVERNIGHT: 50,
        SAME_DAY: 100
      };
      breakdown.serviceTypeSurcharge = serviceTypeSurcharges[serviceType] || 0;
      if (breakdown.serviceTypeSurcharge > 0) {
        breakdown.appliedRules.push(`Service type (${serviceType}): ₹${breakdown.serviceTypeSurcharge}`);
      }
    }

    // Step 5: Apply recipient type multiplier (if applicable)
    if (recipientType === 'DISTRIBUTOR') {
      // Distributors might have different pricing - check for specific rules
      const distributorMultiplier = 1.1; // 10% markup for distributors
      breakdown.recipientTypeMultiplier = (breakdown.baseRate * breakdown.roleMultiplier) * (distributorMultiplier - 1);
      if (breakdown.recipientTypeMultiplier > 0) {
        breakdown.appliedRules.push(`Distributor surcharge (10%): ₹${breakdown.recipientTypeMultiplier.toFixed(2)}`);
      }
    }

    // Step 6: Calculate total per box
    breakdown.totalPerBox = 
      (breakdown.baseRate * breakdown.roleMultiplier) + 
      breakdown.weightSurcharge + 
      breakdown.pincodeSurcharge + 
      breakdown.serviceTypeSurcharge +
      breakdown.recipientTypeMultiplier;

    // Step 7: Calculate total price
    breakdown.totalPrice = breakdown.totalPerBox * breakdown.numBoxes;

    return {
      success: true,
      price: breakdown.totalPrice,
      breakdown
    };

  } catch (error) {
    console.error('Error calculating advanced pricing:', error);
    return {
      success: false,
      price: 0,
      breakdown: {
        baseRate: 0,
        roleMultiplier: 1,
        weightSurcharge: 0,
        pincodeSurcharge: 0,
        serviceTypeSurcharge: 0,
        recipientTypeMultiplier: 0,
        totalPerBox: 0,
        numBoxes: 0,
        totalPrice: 0,
        appliedRules: []
      },
      error: 'Failed to calculate pricing'
    };
  }
}

/**
 * Get pricing estimate for multiple scenarios
 */
export async function getPricingEstimates(
  baseInput: Omit<PricingCalculationInput, 'numBoxes'>,
  boxCounts: number[]
): Promise<Array<{ boxes: number; price: number; pricePerBox: number }>> {
  const estimates = [];
  
  for (const boxes of boxCounts) {
    const result = await calculateAdvancedPricing({
      ...baseInput,
      numBoxes: boxes
    });
    
    estimates.push({
      boxes,
      price: result.price,
      pricePerBox: result.breakdown.totalPerBox
    });
  }
  
  return estimates;
}

/**
 * Validate if a brand can afford the calculated pricing
 */
export async function validatePricingAffordability(
  brandId: string,
  calculatedPrice: number
): Promise<{ canAfford: boolean; currentBalance: number; shortfall?: number }> {
  try {
    const wallet = await prisma.brandWallet.findUnique({
      where: { brandId }
    });

    if (!wallet) {
      return { canAfford: false, currentBalance: 0, shortfall: calculatedPrice };
    }

    const canAfford = wallet.balance >= calculatedPrice;
    const shortfall = canAfford ? undefined : calculatedPrice - wallet.balance;

    return {
      canAfford,
      currentBalance: wallet.balance,
      shortfall
    };
  } catch (error) {
    console.error('Error validating pricing affordability:', error);
    return { canAfford: false, currentBalance: 0, shortfall: calculatedPrice };
  }
}

/**
 * Get pricing rules summary for a specific brand/role
 */
export async function getPricingRulesSummary(brandId?: string, role?: string) {
  try {
    const summary = {
      brandSpecific: null as any,
      roleSpecific: null as any,
      weightRules: [] as any[],
      pincodeRules: [] as any[],
      defaultRates: {} as any
    };

    // Brand-specific pricing
    if (brandId) {
      summary.brandSpecific = await prisma.courierPricing.findUnique({
        where: { brandId, isActive: true },
        include: { brand: { select: { name: true } } }
      });
    }

    // Role-specific pricing
    if (role) {
      summary.roleSpecific = await prisma.roleBasedPricing.findUnique({
        where: { role, isActive: true }
      });
    }

    // Weight-based rules
    summary.weightRules = await prisma.weightBasedPricing.findMany({
      where: { isActive: true },
      orderBy: { minWeight: 'asc' }
    });

    // Sample pincode rules (limit to avoid large response)
    summary.pincodeRules = await prisma.pincodeBasedPricing.findMany({
      where: { isActive: true },
      take: 10,
      orderBy: { pincode: 'asc' }
    });

    // Default rates
    const defaultRates = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['default_courier_rate', 'base_weight_rate', 'additional_weight_rate', 'remote_area_surcharge']
        }
      }
    });

    summary.defaultRates = defaultRates.reduce((acc, setting) => {
      acc[setting.key] = parseFloat(setting.value);
      return acc;
    }, {} as Record<string, number>);

    return summary;
  } catch (error) {
    console.error('Error getting pricing rules summary:', error);
    return null;
  }
}

/**
 * Bulk pricing calculation for multiple shipments
 */
export async function calculateBulkPricing(
  inputs: PricingCalculationInput[]
): Promise<Array<PricingCalculationResult & { inputIndex: number }>> {
  const results = [];
  
  for (let i = 0; i < inputs.length; i++) {
    const result = await calculateAdvancedPricing(inputs[i]);
    results.push({
      ...result,
      inputIndex: i
    });
  }
  
  return results;
}