import { prisma } from '@/lib/prisma';

export interface UnifiedPricingConfig {
  // Forward courier pricing
  defaultRate: number;
  weightRatePerKg: number;
  minimumCharge: number;
  freeWeightLimit: number;
  markupPercentage: number;
  remoteAreaSurcharge: number;
  expressMultiplier: number;
  standardMultiplier: number;
  
  // Reverse courier pricing
  reverseDefaultRate: number;
  reverseWeightRatePerKg: number;
  reverseMinimumCharge: number;
  reverseFreeWeightLimit: number;
  reverseMarkupPercentage: number;
  reverseRemoteAreaSurcharge: number;
  reverseExpressMultiplier: number;
  reverseStandardMultiplier: number;
  
  // Return reason-based pricing
  defectivePartRate: number; // Brand pays - usually 0 or very low
  wrongPartRate: number; // Brand pays - usually 0 or very low
  excessStockRate: number; // Service Center pays - full rate
  customerReturnRate: number; // Customer pays - full rate + handling
}

export interface BrandOverride {
  brandId: string;
  brandName: string;
  brandEmail: string;
  perBoxRate: number;
  reversePerBoxRate?: number;
  isActive: boolean;
}

export interface PricingCalculationRequest {
  brandId: string;
  weight: number;
  pieces: number;
  pincode?: string;
  serviceType: 'STANDARD' | 'EXPRESS';
  courierType?: 'FORWARD' | 'REVERSE';
  returnReason?: 'DEFECTIVE' | 'WRONG_PART' | 'EXCESS_STOCK' | 'CUSTOMER_RETURN';
  direction?: 'BRAND_TO_SERVICE_CENTER' | 'SERVICE_CENTER_TO_BRAND' | 'DISTRIBUTOR_TO_SERVICE_CENTER' | 'SERVICE_CENTER_TO_DISTRIBUTOR';
}

export interface PricingCalculationResult {
  success: boolean;
  totalCost: number;
  breakdown: {
    baseRate: number;
    weightCharges: number;
    serviceCharges: number;
    remoteAreaSurcharge: number;
    platformMarkup: number;
    finalCost: number;
  };
  appliedRules: string[];
  costResponsibility: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  payerId?: string;
  error?: string;
}

export interface CourierTransactionData {
  userId: string;
  payerId?: string;
  courierType: 'FORWARD' | 'REVERSE';
  serviceType: 'STANDARD' | 'EXPRESS';
  direction: string;
  weight: number;
  pieces: number;
  originPincode: string;
  destinationPincode: string;
  originAddress: string;
  destinationAddress: string;
  baseRate: number;
  weightCharges: number;
  serviceCharges: number;
  remoteAreaSurcharge: number;
  platformMarkup: number;
  totalCost: number;
  costResponsibility?: string;
  returnReason?: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

// Default configuration with both forward and reverse pricing
const DEFAULT_CONFIG: UnifiedPricingConfig = {
  // Forward courier pricing
  defaultRate: 50,
  weightRatePerKg: 25,
  minimumCharge: 75,
  freeWeightLimit: 0.5,
  markupPercentage: 15,
  remoteAreaSurcharge: 25,
  expressMultiplier: 1.5,
  standardMultiplier: 1.0,
  
  // Reverse courier pricing
  reverseDefaultRate: 45, // Slightly lower base rate for returns
  reverseWeightRatePerKg: 25,
  reverseMinimumCharge: 50,
  reverseFreeWeightLimit: 0.5,
  reverseMarkupPercentage: 10, // Lower markup for returns
  reverseRemoteAreaSurcharge: 25,
  reverseExpressMultiplier: 1.5,
  reverseStandardMultiplier: 1.0,
  
  // Return reason-based pricing
  defectivePartRate: 0, // Brand pays - free for defective parts
  wrongPartRate: 0, // Brand pays - free for wrong parts
  excessStockRate: 50, // Service Center pays - full rate
  customerReturnRate: 60 // Customer pays - full rate + handling fee
};

// Remote area pincodes detection
const REMOTE_AREA_PATTERNS = ['79', '18', '37', '85', '86', '87', '88', '89'];

function isRemoteArea(pincode?: string): boolean {
  if (!pincode) return false;
  return REMOTE_AREA_PATTERNS.some(pattern => pincode.startsWith(pattern));
}

export async function getUnifiedPricingConfig(): Promise<UnifiedPricingConfig> {
  try {
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'unified_pricing' }
    });

    if (config && config.value) {
      const parsedConfig = JSON.parse(config.value as string);
      // Merge with defaults to ensure all fields are present
      return { ...DEFAULT_CONFIG, ...parsedConfig };
    }

    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error fetching unified pricing config:', error);
    return DEFAULT_CONFIG;
  }
}

export async function updateUnifiedPricingConfig(config: UnifiedPricingConfig): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.systemConfig.upsert({
      where: { key: 'unified_pricing' },
      update: { 
        value: JSON.stringify(config),
        updatedAt: new Date()
      },
      create: {
        key: 'unified_pricing',
        value: JSON.stringify(config),
        description: 'Unified pricing configuration for forward and reverse courier services'
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating unified pricing config:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getBrandsWithPricingOverrides(): Promise<BrandOverride[]> {
  try {
    const overrides = await prisma.courierPricing.findMany({
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return overrides.map(override => ({
      brandId: override.brandId,
      brandName: override.brand.name,
      brandEmail: override.brand.email,
      perBoxRate: override.perBoxRate,
      isActive: override.isActive
    }));
  } catch (error) {
    console.error('Error fetching brand pricing overrides:', error);
    return [];
  }
}

export async function setBrandPricingOverride(
  brandId: string, 
  perBoxRate: number, 
  isActive: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, verify that the brand exists and has the correct role
    const brand = await prisma.user.findUnique({
      where: { 
        id: brandId,
        role: 'BRAND'
      }
    });

    if (!brand) {
      return { 
        success: false, 
        error: 'Brand not found or user is not a brand' 
      };
    }

    await prisma.courierPricing.upsert({
      where: { brandId },
      update: {
        perBoxRate,
        isActive,
        updatedAt: new Date()
      },
      create: {
        brandId,
        perBoxRate,
        isActive
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error setting brand pricing override:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function removeBrandPricingOverride(brandId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.courierPricing.delete({
      where: { brandId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing brand pricing override:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function calculateUnifiedPricing(request: PricingCalculationRequest): Promise<PricingCalculationResult> {
  try {
    const { 
      brandId, 
      weight, 
      pieces, 
      pincode, 
      serviceType, 
      courierType = 'FORWARD',
      returnReason,
      direction 
    } = request;
    
    const appliedRules: string[] = [];
    let costResponsibility: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER' = 'BRAND';

    // Get global config
    const config = await getUnifiedPricingConfig();
    appliedRules.push(`Using unified pricing configuration (${courierType} courier)`);

    // Determine cost responsibility for reverse shipments
    if (courierType === 'REVERSE' && returnReason) {
      switch (returnReason) {
        case 'DEFECTIVE':
        case 'WRONG_PART':
          costResponsibility = 'BRAND';
          appliedRules.push(`Cost responsibility: BRAND (${returnReason.toLowerCase()} part)`);
          break;
        case 'EXCESS_STOCK':
          costResponsibility = 'SERVICE_CENTER';
          appliedRules.push('Cost responsibility: SERVICE_CENTER (excess stock)');
          break;
        case 'CUSTOMER_RETURN':
          costResponsibility = 'CUSTOMER';
          appliedRules.push('Cost responsibility: CUSTOMER (customer return)');
          break;
        default:
          costResponsibility = 'SERVICE_CENTER';
          appliedRules.push('Cost responsibility: SERVICE_CENTER (default)');
      }
    }

    // Determine base rate based on courier type and return reason
    let baseRatePerBox: number;
    
    if (courierType === 'REVERSE' && returnReason) {
      switch (returnReason) {
        case 'DEFECTIVE':
          baseRatePerBox = config.defectivePartRate;
          appliedRules.push(`Defective part rate: ₹${baseRatePerBox}/box (Brand pays)`);
          break;
        case 'WRONG_PART':
          baseRatePerBox = config.wrongPartRate;
          appliedRules.push(`Wrong part rate: ₹${baseRatePerBox}/box (Brand pays)`);
          break;
        case 'EXCESS_STOCK':
          baseRatePerBox = config.excessStockRate;
          appliedRules.push(`Excess stock rate: ₹${baseRatePerBox}/box (Service Center pays)`);
          break;
        case 'CUSTOMER_RETURN':
          baseRatePerBox = config.customerReturnRate;
          appliedRules.push(`Customer return rate: ₹${baseRatePerBox}/box (Customer pays)`);
          break;
        default:
          baseRatePerBox = config.reverseDefaultRate;
          appliedRules.push(`Default reverse rate: ₹${baseRatePerBox}/box`);
      }
    } else if (courierType === 'REVERSE') {
      baseRatePerBox = config.reverseDefaultRate;
      appliedRules.push(`Default reverse rate: ₹${baseRatePerBox}/box`);
    } else {
      // Forward courier - check for brand-specific override
      const brandOverride = await prisma.courierPricing.findUnique({
        where: { brandId }
      });

      if (brandOverride && brandOverride.isActive) {
        baseRatePerBox = brandOverride.perBoxRate;
        appliedRules.push(`Brand-specific forward rate: ₹${baseRatePerBox}/box`);
      } else {
        baseRatePerBox = config.defaultRate;
        appliedRules.push(`Default forward rate: ₹${baseRatePerBox}/box`);
      }
    }

    // Calculate base cost
    const baseRate = baseRatePerBox * pieces;
    appliedRules.push(`Base cost: ₹${baseRatePerBox} × ${pieces} pieces = ₹${baseRate}`);

    // Calculate weight charges
    let weightCharges = 0;
    const totalWeight = weight * pieces;
    const freeWeightLimit = courierType === 'REVERSE' ? config.reverseFreeWeightLimit : config.freeWeightLimit;
    const weightRate = courierType === 'REVERSE' ? config.reverseWeightRatePerKg : config.weightRatePerKg;
    const excessWeight = Math.max(0, totalWeight - (freeWeightLimit * pieces));
    
    if (excessWeight > 0) {
      weightCharges = excessWeight * weightRate;
      appliedRules.push(`Weight charges: ${excessWeight.toFixed(2)}kg × ₹${weightRate}/kg = ₹${weightCharges.toFixed(2)}`);
    } else {
      appliedRules.push(`No weight charges (within free limit of ${freeWeightLimit}kg per piece)`);
    }

    // Apply service type multiplier
    const expressMultiplier = courierType === 'REVERSE' ? config.reverseExpressMultiplier : config.expressMultiplier;
    const standardMultiplier = courierType === 'REVERSE' ? config.reverseStandardMultiplier : config.standardMultiplier;
    const serviceMultiplier = serviceType === 'EXPRESS' ? expressMultiplier : standardMultiplier;
    const serviceCharges = (baseRate + weightCharges) * (serviceMultiplier - 1);
    
    if (serviceType === 'EXPRESS') {
      appliedRules.push(`Express service multiplier: ${serviceMultiplier}x (additional ₹${serviceCharges.toFixed(2)})`);
    } else {
      appliedRules.push(`Standard service: no additional charges`);
    }

    // Check for remote area surcharge
    let remoteAreaSurcharge = 0;
    const remoteAreaRate = courierType === 'REVERSE' ? config.reverseRemoteAreaSurcharge : config.remoteAreaSurcharge;
    if (isRemoteArea(pincode)) {
      remoteAreaSurcharge = remoteAreaRate * pieces;
      appliedRules.push(`Remote area surcharge: ₹${remoteAreaRate} × ${pieces} pieces = ₹${remoteAreaSurcharge}`);
    } else {
      appliedRules.push('No remote area surcharge');
    }

    // Calculate subtotal before markup
    const subtotal = baseRate + weightCharges + serviceCharges + remoteAreaSurcharge;

    // Apply platform markup
    const markupPercentage = courierType === 'REVERSE' ? config.reverseMarkupPercentage : config.markupPercentage;
    const platformMarkup = subtotal * (markupPercentage / 100);
    appliedRules.push(`Platform markup: ${markupPercentage}% of ₹${subtotal.toFixed(2)} = ₹${platformMarkup.toFixed(2)}`);

    // Calculate final cost
    let finalCost = subtotal + platformMarkup;

    // Apply minimum charge
    const minimumCharge = courierType === 'REVERSE' ? config.reverseMinimumCharge : config.minimumCharge;
    if (finalCost < minimumCharge) {
      appliedRules.push(`Minimum charge applied: ₹${minimumCharge} (was ₹${finalCost.toFixed(2)})`);
      finalCost = minimumCharge;
    } else {
      appliedRules.push(`Final cost: ₹${finalCost.toFixed(2)}`);
    }

    return {
      success: true,
      totalCost: Math.round(finalCost * 100) / 100,
      breakdown: {
        baseRate: Math.round(baseRate * 100) / 100,
        weightCharges: Math.round(weightCharges * 100) / 100,
        serviceCharges: Math.round(serviceCharges * 100) / 100,
        remoteAreaSurcharge: Math.round(remoteAreaSurcharge * 100) / 100,
        platformMarkup: Math.round(platformMarkup * 100) / 100,
        finalCost: Math.round(finalCost * 100) / 100
      },
      appliedRules,
      costResponsibility
    };

  } catch (error) {
    console.error('Error calculating unified pricing:', error);
    return {
      success: false,
      totalCost: 0,
      breakdown: {
        baseRate: 0,
        weightCharges: 0,
        serviceCharges: 0,
        remoteAreaSurcharge: 0,
        platformMarkup: 0,
        finalCost: 0
      },
      appliedRules: [],
      costResponsibility: 'BRAND',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createCourierTransaction(data: CourierTransactionData): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const transactionNumber = `CT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const transaction = await prisma.courierTransaction.create({
      data: {
        transactionNumber,
        userId: data.userId,
        payerId: data.payerId || data.userId,
        courierType: data.courierType,
        serviceType: data.serviceType,
        direction: data.direction,
        weight: data.weight,
        pieces: data.pieces,
        originPincode: data.originPincode,
        destinationPincode: data.destinationPincode,
        originAddress: data.originAddress,
        destinationAddress: data.destinationAddress,
        baseRate: data.baseRate,
        weightCharges: data.weightCharges,
        serviceCharges: data.serviceCharges,
        remoteAreaSurcharge: data.remoteAreaSurcharge,
        platformMarkup: data.platformMarkup,
        totalCost: data.totalCost,
        costResponsibility: data.costResponsibility,
        returnReason: data.returnReason,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes
      }
    });

    return { success: true, transactionId: transaction.id };
  } catch (error) {
    console.error('Error creating courier transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function deductWalletAmount(
  userId: string, 
  amount: number, 
  reason: string,
  assignedBy: 'system' | 'admin' | 'manual' = 'system',
  reference?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // Start a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get current wallet balance
      const wallet = await tx.wallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < amount) {
        throw new Error(`Insufficient balance. Current: ₹${wallet.balance}, Required: ₹${amount}`);
      }

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: wallet.balance - amount,
          totalSpent: wallet.totalSpent + amount
        }
      });

      // Create wallet transaction record
      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          description: `${reason} (${assignedBy})${reference ? ` - Ref: ${reference}` : ''}`,
          balanceAfter: updatedWallet.balance,
          status: 'COMPLETED'
        }
      });

      return updatedWallet.balance;
    });

    return { success: true, newBalance: result };
  } catch (error) {
    console.error('Error deducting wallet amount:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function checkWalletBalance(userId: string, estimatedCost: number): Promise<{
  sufficient: boolean;
  currentBalance: number;
  shortfall: number;
}> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    const currentBalance = wallet?.balance || 0;
    const sufficient = currentBalance >= estimatedCost;
    const shortfall = sufficient ? 0 : estimatedCost - currentBalance;

    return {
      sufficient,
      currentBalance,
      shortfall
    };
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return {
      sufficient: false,
      currentBalance: 0,
      shortfall: estimatedCost
    };
  }
}

// Legacy function name for backward compatibility
export async function calculateShippingCost(params: {
  brandId: string;
  weight: number;
  distance?: number;
  priority?: string;
  numBoxes?: number;
  declaredValue?: number;
  recipientPincode?: string;
}): Promise<{
  success: boolean;
  baseRate: number;
  weightCharges: number;
  serviceCharges: number;
  remoteAreaSurcharge: number;
  platformMarkup: number;
  finalTotal: number;
  breakdown?: any;
  error?: string;
}> {
  try {
    const serviceType = params.priority === 'HIGH' || params.priority === 'CRITICAL' ? 'EXPRESS' : 'STANDARD';
    
    const result = await calculateUnifiedPricing({
      brandId: params.brandId,
      weight: params.weight,
      pieces: params.numBoxes || 1,
      pincode: params.recipientPincode,
      serviceType,
      courierType: 'FORWARD'
    });

    if (!result.success) {
      return {
        success: false,
        baseRate: 0,
        weightCharges: 0,
        serviceCharges: 0,
        remoteAreaSurcharge: 0,
        platformMarkup: 0,
        finalTotal: 0,
        error: result.error
      };
    }

    return {
      success: true,
      baseRate: result.breakdown.baseRate,
      weightCharges: result.breakdown.weightCharges,
      serviceCharges: result.breakdown.serviceCharges,
      remoteAreaSurcharge: result.breakdown.remoteAreaSurcharge,
      platformMarkup: result.breakdown.platformMarkup,
      finalTotal: result.totalCost,
      breakdown: result.breakdown
    };
  } catch (error) {
    console.error('Error calculating shipping cost:', error);
    return {
      success: false,
      baseRate: 0,
      weightCharges: 0,
      serviceCharges: 0,
      remoteAreaSurcharge: 0,
      platformMarkup: 0,
      finalTotal: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function migratePricingData(): Promise<{ success: boolean; migrated: number; error?: string }> {
  try {
    let migratedCount = 0;

    // Check if unified config exists, if not create it with current system defaults
    const existingConfig = await prisma.systemConfig.findFirst({
      where: { key: 'unified_pricing' }
    });

    if (!existingConfig) {
      // Try to get existing system settings values
      const systemSettings = await prisma.systemSettings.findMany({
        where: {
          key: {
            in: ['default_markup_percentage', 'shipping_rate_per_kg', 'minimum_order_value']
          }
        }
      });

      const settingsMap = systemSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      const migratedConfig: UnifiedPricingConfig = {
        ...DEFAULT_CONFIG,
        markupPercentage: parseFloat(settingsMap['default_markup_percentage']) || DEFAULT_CONFIG.markupPercentage,
        weightRatePerKg: parseFloat(settingsMap['shipping_rate_per_kg']) || DEFAULT_CONFIG.weightRatePerKg,
        minimumCharge: parseFloat(settingsMap['minimum_order_value']) || DEFAULT_CONFIG.minimumCharge
      };

      await updateUnifiedPricingConfig(migratedConfig);
      migratedCount++;
    }

    // Ensure all existing courier pricing entries are marked as active
    const existingPricing = await prisma.courierPricing.findMany();
    if (existingPricing.length > 0) {
      await prisma.courierPricing.updateMany({
        where: {
          isActive: null
        },
        data: {
          isActive: true
        }
      });
      migratedCount += existingPricing.length;
    }

    // Initialize reverse courier config if it doesn't exist
    const reverseConfig = await prisma.reverseCourierConfig.findFirst();
    if (!reverseConfig) {
      await prisma.reverseCourierConfig.create({
        data: {
          defectivePartRate: DEFAULT_CONFIG.defectivePartRate,
          wrongPartRate: DEFAULT_CONFIG.wrongPartRate,
          excessStockRate: DEFAULT_CONFIG.excessStockRate,
          reverseStandardMultiplier: DEFAULT_CONFIG.reverseStandardMultiplier,
          reverseExpressMultiplier: DEFAULT_CONFIG.reverseExpressMultiplier,
          reverseWeightRatePerKg: DEFAULT_CONFIG.reverseWeightRatePerKg,
          reverseFreeWeightLimit: DEFAULT_CONFIG.reverseFreeWeightLimit,
          reverseRemoteAreaSurcharge: DEFAULT_CONFIG.reverseRemoteAreaSurcharge,
          reverseMarkupPercentage: DEFAULT_CONFIG.reverseMarkupPercentage,
          reverseMinimumCharge: DEFAULT_CONFIG.reverseMinimumCharge
        }
      });
      migratedCount++;
    }

    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error('Error migrating pricing data:', error);
    return { 
      success: false, 
      migrated: 0,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Helper function to get courier transactions with filters
export async function getCourierTransactions(filters: {
  userId?: string;
  courierType?: 'FORWARD' | 'REVERSE';
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.courierType) where.courierType = filters.courierType;
    if (filters.status) where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const transactions = await prisma.courierTransaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters.limit || 50,
      skip: filters.offset || 0
    });

    const total = await prisma.courierTransaction.count({ where });

    return { success: true, transactions, total };
  } catch (error) {
    console.error('Error fetching courier transactions:', error);
    return { success: false, transactions: [], total: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}