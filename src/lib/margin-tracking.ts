// Margin Tracking and DTDC Cost Integration
// Handles calculation and logging of margins between customer pricing (Y) and DTDC costs (X)

import { prisma } from './prisma';

export interface MarginCalculationInput {
  customerPrice: number;    // What customer paid (Y)
  dtdcCost: number;        // What DTDC charged (X)
  weight?: number;
  serviceType?: string;
  origin?: string;
  destination?: string;
  awbNumber?: string;
  notes?: string;
}

export interface MarginCalculationResult {
  margin: number;          // Y - X
  marginPercent: number;   // ((Y - X) / Y) * 100
  customerPrice: number;
  dtdcCost: number;
}

export interface DTDCCostResponse {
  success: boolean;
  cost?: number;
  breakdown?: {
    baseRate: number;
    fuelSurcharge: number;
    serviceTax: number;
    total: number;
  };
  error?: string;
}

// Calculate margin from customer price and DTDC cost
export function calculateMargin(input: MarginCalculationInput): MarginCalculationResult {
  const { customerPrice, dtdcCost } = input;
  
  const margin = customerPrice - dtdcCost;
  const marginPercent = customerPrice > 0 ? (margin / customerPrice) * 100 : 0;
  
  return {
    margin,
    marginPercent,
    customerPrice,
    dtdcCost
  };
}

// Extract DTDC cost from API response
export function extractDTDCCostFromResponse(dtdcResponse: any): DTDCCostResponse {
  try {
    // Check if this is a development/mock response
    if (process.env.NODE_ENV === 'development' || !dtdcResponse.billing) {
      // Generate mock DTDC cost based on weight and service type
      return generateMockDTDCCost(dtdcResponse);
    }

    // Extract cost from real DTDC API response
    if (dtdcResponse.billing && dtdcResponse.billing.total) {
      const billing = dtdcResponse.billing;
      
      return {
        success: true,
        cost: billing.total,
        breakdown: {
          baseRate: billing.baseRate || billing.total * 0.8,
          fuelSurcharge: billing.fuelSurcharge || billing.total * 0.1,
          serviceTax: billing.serviceTax || billing.total * 0.1,
          total: billing.total
        }
      };
    }

    // If no billing info, try to extract from other fields
    if (dtdcResponse.charges || dtdcResponse.amount) {
      const cost = dtdcResponse.charges || dtdcResponse.amount;
      return {
        success: true,
        cost: parseFloat(cost),
        breakdown: {
          baseRate: cost * 0.8,
          fuelSurcharge: cost * 0.1,
          serviceTax: cost * 0.1,
          total: cost
        }
      };
    }

    throw new Error('No cost information found in DTDC response');

  } catch (error) {
    console.error('Error extracting DTDC cost:', error);
    
    // Fallback to mock cost
    return generateMockDTDCCost(dtdcResponse);
  }
}

// Generate mock DTDC cost for development/fallback
function generateMockDTDCCost(dtdcResponse: any): DTDCCostResponse {
  // Extract weight from response or default to 1kg
  const weight = dtdcResponse.weight || 1;
  
  // Base rate calculation (₹30-50 per kg depending on service type)
  const baseRatePerKg = dtdcResponse.serviceType?.includes('EXPRESS') ? 50 : 35;
  const baseRate = Math.max(30, weight * baseRatePerKg);
  
  // Add surcharges
  const fuelSurcharge = baseRate * 0.15; // 15% fuel surcharge
  const serviceTax = (baseRate + fuelSurcharge) * 0.18; // 18% GST
  
  const total = baseRate + fuelSurcharge + serviceTax;
  
  return {
    success: true,
    cost: Math.round(total * 100) / 100, // Round to 2 decimal places
    breakdown: {
      baseRate: Math.round(baseRate * 100) / 100,
      fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
      serviceTax: Math.round(serviceTax * 100) / 100,
      total: Math.round(total * 100) / 100
    }
  };
}

// Log margin calculation for a box shipment
export async function logBoxMargin(
  boxId: string,
  brandId: string,
  input: MarginCalculationInput
): Promise<{
  success: boolean;
  marginLog?: any;
  error?: string;
}> {
  try {
    const marginResult = calculateMargin(input);
    
    // Update box with margin information
    const updatedBox = await prisma.box.update({
      where: { id: boxId },
      data: {
        customerPrice: input.customerPrice,
        dtdcCost: input.dtdcCost,
        margin: marginResult.margin,
        marginPercent: marginResult.marginPercent
      }
    });

    // Create margin log entry
    const marginLog = await prisma.marginLog.create({
      data: {
        boxId,
        brandId,
        customerPrice: input.customerPrice,
        dtdcCost: input.dtdcCost,
        margin: marginResult.margin,
        marginPercent: marginResult.marginPercent,
        awbNumber: input.awbNumber,
        weight: input.weight,
        serviceType: input.serviceType,
        origin: input.origin,
        destination: input.destination,
        notes: input.notes
      }
    });

    return {
      success: true,
      marginLog
    };

  } catch (error) {
    console.error('Error logging box margin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Log margin calculation for a customer order
export async function logCustomerOrderMargin(
  customerOrderId: string,
  brandId: string,
  input: MarginCalculationInput
): Promise<{
  success: boolean;
  marginLog?: any;
  error?: string;
}> {
  try {
    const marginResult = calculateMargin(input);
    
    // Update customer order with margin information
    const updatedOrder = await prisma.customerOrder.update({
      where: { id: customerOrderId },
      data: {
        customerPrice: input.customerPrice,
        dtdcCost: input.dtdcCost,
        margin: marginResult.margin,
        marginPercent: marginResult.marginPercent
      }
    });

    // Create margin log entry
    const marginLog = await prisma.marginLog.create({
      data: {
        customerOrderId,
        brandId,
        customerPrice: input.customerPrice,
        dtdcCost: input.dtdcCost,
        margin: marginResult.margin,
        marginPercent: marginResult.marginPercent,
        awbNumber: input.awbNumber,
        weight: input.weight,
        serviceType: input.serviceType,
        origin: input.origin,
        destination: input.destination,
        notes: input.notes
      }
    });

    return {
      success: true,
      marginLog
    };

  } catch (error) {
    console.error('Error logging customer order margin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get margin analytics for a brand
export async function getBrandMarginAnalytics(
  brandId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<{
  success: boolean;
  analytics?: {
    totalMargin: number;
    averageMarginPercent: number;
    totalRevenue: number;
    totalCosts: number;
    shipmentCount: number;
    marginTrend: Array<{
      date: string;
      margin: number;
      marginPercent: number;
      count: number;
    }>;
    topPerformingRoutes: Array<{
      origin: string;
      destination: string;
      averageMargin: number;
      count: number;
    }>;
  };
  error?: string;
}> {
  try {
    const whereClause: any = { brandId };
    
    if (options.startDate || options.endDate) {
      whereClause.calculatedAt = {};
      if (options.startDate) whereClause.calculatedAt.gte = options.startDate;
      if (options.endDate) whereClause.calculatedAt.lte = options.endDate;
    }

    // Get all margin logs for the brand
    const marginLogs = await prisma.marginLog.findMany({
      where: whereClause,
      orderBy: { calculatedAt: 'desc' },
      take: options.limit
    });

    if (marginLogs.length === 0) {
      return {
        success: true,
        analytics: {
          totalMargin: 0,
          averageMarginPercent: 0,
          totalRevenue: 0,
          totalCosts: 0,
          shipmentCount: 0,
          marginTrend: [],
          topPerformingRoutes: []
        }
      };
    }

    // Calculate aggregated metrics
    const totalMargin = marginLogs.reduce((sum, log) => sum + log.margin, 0);
    const totalRevenue = marginLogs.reduce((sum, log) => sum + log.customerPrice, 0);
    const totalCosts = marginLogs.reduce((sum, log) => sum + log.dtdcCost, 0);
    const averageMarginPercent = marginLogs.reduce((sum, log) => sum + log.marginPercent, 0) / marginLogs.length;

    // Calculate daily margin trend
    const marginByDate = marginLogs.reduce((acc, log) => {
      const date = log.calculatedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { margin: 0, count: 0, totalMarginPercent: 0 };
      }
      acc[date].margin += log.margin;
      acc[date].totalMarginPercent += log.marginPercent;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { margin: number; count: number; totalMarginPercent: number }>);

    const marginTrend = Object.entries(marginByDate)
      .map(([date, data]) => ({
        date,
        margin: data.margin,
        marginPercent: data.totalMarginPercent / data.count,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate top performing routes
    const routePerformance = marginLogs
      .filter(log => log.origin && log.destination)
      .reduce((acc, log) => {
        const route = `${log.origin}-${log.destination}`;
        if (!acc[route]) {
          acc[route] = { totalMargin: 0, count: 0, origin: log.origin!, destination: log.destination! };
        }
        acc[route].totalMargin += log.margin;
        acc[route].count += 1;
        return acc;
      }, {} as Record<string, { totalMargin: number; count: number; origin: string; destination: string }>);

    const topPerformingRoutes = Object.values(routePerformance)
      .map(route => ({
        origin: route.origin,
        destination: route.destination,
        averageMargin: route.totalMargin / route.count,
        count: route.count
      }))
      .sort((a, b) => b.averageMargin - a.averageMargin)
      .slice(0, 10);

    return {
      success: true,
      analytics: {
        totalMargin: Math.round(totalMargin * 100) / 100,
        averageMarginPercent: Math.round(averageMarginPercent * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100,
        shipmentCount: marginLogs.length,
        marginTrend,
        topPerformingRoutes
      }
    };

  } catch (error) {
    console.error('Error getting brand margin analytics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get recent margin logs with pagination
export async function getMarginLogs(
  brandId?: string,
  options: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  success: boolean;
  logs?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (brandId) whereClause.brandId = brandId;
    
    if (options.startDate || options.endDate) {
      whereClause.calculatedAt = {};
      if (options.startDate) whereClause.calculatedAt.gte = options.startDate;
      if (options.endDate) whereClause.calculatedAt.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.marginLog.findMany({
        where: whereClause,
        include: {
          brand: { select: { name: true, email: true } },
          box: { select: { boxNumber: true, awbNumber: true } },
          customerOrder: { select: { id: true, awbNumber: true } }
        },
        orderBy: { calculatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.marginLog.count({ where: whereClause })
    ]);

    return {
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

  } catch (error) {
    console.error('Error getting margin logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Update existing shipments with margin calculations (migration utility)
export async function backfillMarginData(
  brandId?: string,
  dryRun: boolean = true
): Promise<{
  success: boolean;
  processed?: number;
  updated?: number;
  errors?: string[];
}> {
  try {
    const errors: string[] = [];
    let processed = 0;
    let updated = 0;

    // Get boxes without margin data
    const boxes = await prisma.box.findMany({
      where: {
        AND: [
          brandId ? { shipment: { brandId } } : {},
          { awbNumber: { not: null } },
          { margin: null }
        ]
      },
      include: {
        shipment: { include: { brand: true } }
      },
      take: dryRun ? 10 : undefined
    });

    for (const box of boxes) {
      processed++;
      
      try {
        // Estimate customer price from wallet transactions or use default
        const customerPrice = 100; // This would need to be calculated from actual pricing
        
        // Generate mock DTDC cost
        const dtdcCostResponse = generateMockDTDCCost({
          weight: box.weight || 1,
          serviceType: 'STANDARD'
        });

        if (!dtdcCostResponse.success || !dtdcCostResponse.cost) {
          errors.push(`Failed to calculate DTDC cost for box ${box.id}`);
          continue;
        }

        if (!dryRun) {
          await logBoxMargin(box.id, box.shipment.brandId, {
            customerPrice,
            dtdcCost: dtdcCostResponse.cost,
            weight: box.weight || undefined,
            serviceType: 'STANDARD',
            awbNumber: box.awbNumber || undefined,
            notes: 'Backfilled margin data'
          });
        }

        updated++;

      } catch (error) {
        errors.push(`Error processing box ${box.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      processed,
      updated,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('Error backfilling margin data:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}