import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || !['BRAND', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { timeRange = '30d', brandId, action } = req.query;
    
    // Handle different action types
    if (action === 'summary') {
      return handleSummaryRequest(req, res, user);
    }
    
    if (action === 'logs') {
      return handleLogsRequest(req, res, user);
    }

    // Default behavior for main analytics
    const targetBrandId = user.role === 'BRAND' ? user.id : brandId as string;

    // For SUPER_ADMIN, if no brandId is provided, return aggregated data
    if (user.role === 'SUPER_ADMIN' && !targetBrandId) {
      return handleAggregatedAnalytics(req, res, timeRange as string);
    }

    if (!targetBrandId && user.role === 'BRAND') {
      return res.status(400).json({ error: 'Brand ID is required' });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get shipment data for margin analysis
    const shipments = await prisma.shipment.findMany({
      where: {
        brandId: targetBrandId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
        }
      },
      include: {
        boxes: {
          include: {
            parts: {
              include: {
                part: true
              }
            }
          }
        },
        serviceCenter: {
          select: {
            name: true,
            address: true
          }
        },
        distributor: {
          select: {
            name: true,
            address: true
          }
        }
      }
    });

    // Calculate margins for each shipment
    const marginData = shipments.map(shipment => {
      const totalPartsCost = shipment.boxes.reduce((total, box) => {
        return total + box.parts.reduce((boxTotal, boxPart) => {
          return boxTotal + (boxPart.part.price * boxPart.quantity);
        }, 0);
      }, 0);

      const shippingCost = shipment.cost || 0;
      const totalCost = totalPartsCost + shippingCost;
      
      // Estimate revenue (parts cost + margin + shipping)
      const estimatedMarginPercent = 0.25; // 25% default margin
      const revenue = totalPartsCost * (1 + estimatedMarginPercent) + shippingCost;
      const margin = revenue - totalCost;
      const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

      return {
        shipmentId: shipment.id,
        date: shipment.createdAt,
        revenue,
        costs: totalCost,
        margin,
        marginPercent,
        partsCost: totalPartsCost,
        shippingCost,
        customerName: shipment.serviceCenter?.name || shipment.distributor?.name || 'Unknown',
        destination: shipment.destinationPincode,
        weight: shipment.weight || 0,
        status: shipment.status
      };
    });

    // Aggregate data by time periods
    const aggregatedData = aggregateMarginData(marginData, timeRange as string);

    // Calculate product-level margins
    const productMargins = await calculateProductMargins(targetBrandId, startDate, endDate);

    // Calculate customer-level margins
    const customerMargins = await calculateCustomerMargins(targetBrandId, startDate, endDate);

    // Calculate regional margins
    const regionMargins = calculateRegionalMargins(marginData);

    // Calculate summary metrics
    const totalRevenue = marginData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCosts = marginData.reduce((sum, item) => sum + item.costs, 0);
    const totalMargin = totalRevenue - totalCosts;
    const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    const summaryMetrics = {
      totalRevenue,
      totalCosts,
      grossMargin: totalMargin,
      grossMarginPercent: avgMarginPercent,
      netMargin: totalMargin * 0.85, // Assuming 15% additional costs
      netMarginPercent: avgMarginPercent * 0.85,
      totalShipments: marginData.length,
      avgOrderValue: marginData.length > 0 ? totalRevenue / marginData.length : 0,
      avgMarginPerOrder: marginData.length > 0 ? totalMargin / marginData.length : 0
    };

    res.status(200).json({
      success: true,
      timeRange,
      summaryMetrics,
      marginData: aggregatedData,
      productMargins,
      customerMargins,
      regionMargins,
      rawData: marginData.slice(0, 100) // Limit raw data for performance
    });

  } catch (error) {
    console.error('Margin analytics API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch margin analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function aggregateMarginData(data: any[], timeRange: string) {
  const groupedData = new Map();
  
  data.forEach(item => {
    let key: string;
    const date = new Date(item.date);
    
    switch (timeRange) {
      case '7d':
        key = date.toISOString().split('T')[0]; // Daily
        break;
      case '30d':
        key = date.toISOString().split('T')[0]; // Daily
        break;
      case '90d':
        // Weekly grouping
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case '1y':
        // Monthly grouping
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        period: key,
        revenue: 0,
        costs: 0,
        margin: 0,
        shipmentCount: 0,
        totalWeight: 0
      });
    }
    
    const group = groupedData.get(key);
    group.revenue += item.revenue;
    group.costs += item.costs;
    group.margin += item.margin;
    group.shipmentCount += 1;
    group.totalWeight += item.weight;
  });
  
  return Array.from(groupedData.values()).map(group => ({
    ...group,
    marginPercent: group.revenue > 0 ? (group.margin / group.revenue) * 100 : 0,
    avgOrderValue: group.shipmentCount > 0 ? group.revenue / group.shipmentCount : 0,
    avgWeight: group.shipmentCount > 0 ? group.totalWeight / group.shipmentCount : 0
  }));
}

async function calculateProductMargins(brandId: string, startDate: Date, endDate: Date) {
  try {
    const productData = await prisma.part.findMany({
      where: {
        brandId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        boxParts: {
          include: {
            box: {
              include: {
                shipment: {
                  where: {
                    status: {
                      in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return productData.map(part => {
      const totalQuantity = part.boxParts.reduce((sum, bp) => sum + bp.quantity, 0);
      const revenue = totalQuantity * part.price;
      const estimatedCost = revenue * 0.6; // Assuming 40% margin
      const margin = revenue - estimatedCost;
      const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

      return {
        productId: part.id,
        productName: part.name,
        productCode: part.code,
        category: part.category || 'Uncategorized',
        revenue,
        costs: estimatedCost,
        margin,
        marginPercent,
        units: totalQuantity,
        avgPrice: part.price,
        trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend
        trendPercent: (Math.random() - 0.5) * 20 // Mock trend percentage
      };
    }).filter(item => item.units > 0);
  } catch (error) {
    console.error('Error calculating product margins:', error);
    return [];
  }
}

async function calculateCustomerMargins(brandId: string, startDate: Date, endDate: Date) {
  try {
    const customerData = await prisma.shipment.groupBy({
      by: ['serviceCenterUserId', 'distributorUserId'],
      where: {
        brandId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
        }
      },
      _count: {
        id: true
      },
      _sum: {
        cost: true,
        weight: true
      }
    });

    // This is a simplified version - in reality, you'd need to join with user data
    return customerData.map((customer, index) => {
      const customerId = customer.serviceCenterUserId || customer.distributorUserId || `customer_${index}`;
      const estimatedRevenue = (customer._sum.cost || 0) * 1.25; // 25% markup
      const costs = customer._sum.cost || 0;
      const margin = estimatedRevenue - costs;
      const marginPercent = estimatedRevenue > 0 ? (margin / estimatedRevenue) * 100 : 0;

      return {
        customerId,
        customerName: `Customer ${index + 1}`, // Would be actual name in real implementation
        customerTier: Math.random() > 0.7 ? 'Premium' : 'Regular',
        revenue: estimatedRevenue,
        costs,
        margin,
        marginPercent,
        orders: customer._count.id,
        avgOrderValue: customer._count.id > 0 ? estimatedRevenue / customer._count.id : 0,
        lifetime: Math.floor(Math.random() * 36) + 6 // Mock lifetime in months
      };
    });
  } catch (error) {
    console.error('Error calculating customer margins:', error);
    return [];
  }
}

function calculateRegionalMargins(marginData: any[]) {
  const regionMap = new Map();
  
  marginData.forEach(item => {
    // Simple region mapping based on pincode (this would be more sophisticated in reality)
    const pincode = item.destination;
    let region = 'Unknown';
    
    if (pincode) {
      const firstDigit = pincode.charAt(0);
      switch (firstDigit) {
        case '1':
        case '2':
          region = 'North';
          break;
        case '3':
        case '4':
          region = 'West';
          break;
        case '5':
        case '6':
          region = 'South';
          break;
        case '7':
        case '8':
          region = 'East';
          break;
        default:
          region = 'Central';
      }
    }
    
    if (!regionMap.has(region)) {
      regionMap.set(region, {
        region,
        revenue: 0,
        costs: 0,
        margin: 0,
        shipments: 0,
        totalDistance: 0,
        totalWeight: 0
      });
    }
    
    const regionData = regionMap.get(region);
    regionData.revenue += item.revenue;
    regionData.costs += item.costs;
    regionData.margin += item.margin;
    regionData.shipments += 1;
    regionData.totalWeight += item.weight;
    regionData.totalDistance += Math.random() * 1000 + 200; // Mock distance
  });
  
  return Array.from(regionMap.values()).map(region => ({
    ...region,
    marginPercent: region.revenue > 0 ? (region.margin / region.revenue) * 100 : 0,
    avgDistance: region.shipments > 0 ? region.totalDistance / region.shipments : 0,
    avgCost: region.shipments > 0 ? region.costs / region.shipments : 0
  }));
}

async function handleSummaryRequest(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { timeRange = '30d', brandId } = req.query;
    const targetBrandId = user.role === 'BRAND' ? user.id : brandId as string;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get basic summary metrics
    const shipmentCount = await prisma.shipment.count({
      where: {
        ...(targetBrandId && { brandId: targetBrandId }),
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
        }
      }
    });

    const totalCosts = await prisma.shipment.aggregate({
      where: {
        ...(targetBrandId && { brandId: targetBrandId }),
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
        }
      },
      _sum: {
        cost: true
      }
    });

    const estimatedRevenue = (totalCosts._sum.cost || 0) * 1.25; // 25% markup
    const margin = estimatedRevenue - (totalCosts._sum.cost || 0);
    const marginPercent = estimatedRevenue > 0 ? (margin / estimatedRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalRevenue: estimatedRevenue,
        totalCosts: totalCosts._sum.cost || 0,
        grossMargin: margin,
        grossMarginPercent: marginPercent,
        netMargin: margin * 0.85,
        netMarginPercent: marginPercent * 0.85,
        totalShipments: shipmentCount,
        avgOrderValue: shipmentCount > 0 ? estimatedRevenue / shipmentCount : 0,
        timeRange
      }
    });

  } catch (error) {
    console.error('Summary request error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleLogsRequest(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { page = '1', limit = '50', brandId } = req.query;
    const targetBrandId = user.role === 'BRAND' ? user.id : brandId as string;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const logs = await prisma.shipment.findMany({
      where: {
        ...(targetBrandId && { brandId: targetBrandId }),
        status: {
          in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
        }
      },
      include: {
        serviceCenter: {
          select: {
            name: true
          }
        },
        distributor: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limitNum
    });

    const totalCount = await prisma.shipment.count({
      where: {
        ...(targetBrandId && { brandId: targetBrandId }),
        status: {
          in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
        }
      }
    });

    const transformedLogs = logs.map(shipment => {
      const estimatedRevenue = (shipment.cost || 0) * 1.25;
      const margin = estimatedRevenue - (shipment.cost || 0);
      const marginPercent = estimatedRevenue > 0 ? (margin / estimatedRevenue) * 100 : 0;

      return {
        id: shipment.id,
        date: shipment.createdAt,
        customer: shipment.serviceCenter?.name || shipment.distributor?.name || 'Unknown',
        revenue: estimatedRevenue,
        cost: shipment.cost || 0,
        margin,
        marginPercent,
        status: shipment.status,
        destination: shipment.destinationPincode
      };
    });

    res.status(200).json({
      success: true,
      logs: transformedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('Logs request error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleAggregatedAnalytics(req: NextApiRequest, res: NextApiResponse, timeRange: string) {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get aggregated data across all brands
    const aggregatedData = await prisma.shipment.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['DELIVERED', 'IN_TRANSIT', 'DISPATCHED']
        }
      },
      _sum: {
        cost: true
      },
      _count: {
        id: true
      }
    });

    const totalCosts = aggregatedData._sum.cost || 0;
    const totalRevenue = totalCosts * 1.25; // 25% markup
    const grossMargin = totalRevenue - totalCosts;
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    const summaryMetrics = {
      totalRevenue,
      totalCosts,
      grossMargin,
      grossMarginPercent,
      netMargin: grossMargin * 0.85,
      netMarginPercent: grossMarginPercent * 0.85,
      totalShipments: aggregatedData._count.id,
      avgOrderValue: aggregatedData._count.id > 0 ? totalRevenue / aggregatedData._count.id : 0,
      avgMarginPerOrder: aggregatedData._count.id > 0 ? grossMargin / aggregatedData._count.id : 0
    };

    // Mock data for charts since we don't have detailed breakdown
    const mockMarginData = [{
      period: new Date().toISOString().split('T')[0],
      revenue: totalRevenue,
      costs: totalCosts,
      margin: grossMargin,
      marginPercent: grossMarginPercent,
      shipmentCount: aggregatedData._count.id,
      avgOrderValue: summaryMetrics.avgOrderValue
    }];

    res.status(200).json({
      success: true,
      timeRange,
      summaryMetrics,
      marginData: mockMarginData,
      productMargins: [],
      customerMargins: [],
      regionMargins: [],
      rawData: []
    });

  } catch (error) {
    console.error('Aggregated analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch aggregated analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}