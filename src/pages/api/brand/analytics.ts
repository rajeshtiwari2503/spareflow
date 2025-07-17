import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { timeRange = '30d' } = req.query;
    const brandId = user.id;

    // Calculate date ranges
    const now = new Date();
    const startDate = new Date();
    const previousPeriodStart = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        previousPeriodStart.setDate(now.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        previousPeriodStart.setDate(now.getDate() - 60);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        previousPeriodStart.setDate(now.getDate() - 180);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        previousPeriodStart.setFullYear(now.getFullYear() - 2);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
        previousPeriodStart.setDate(now.getDate() - 60);
    }

    // Fetch real data from database
    const [
      totalRevenue,
      previousRevenue,
      totalShipments,
      previousShipments,
      deliveredShipments,
      returnRequests,
      walletTransactions,
      topParts,
      lowStockParts,
      serviceCenters,
      distributors
    ] = await Promise.all([
      // Current period revenue from wallet transactions
      prisma.walletTransaction.aggregate({
        where: {
          userId: brandId,
          type: 'DEBIT',
          createdAt: { gte: startDate }
        },
        _sum: { amount: true }
      }),
      
      // Previous period revenue for growth calculation
      prisma.walletTransaction.aggregate({
        where: {
          userId: brandId,
          type: 'DEBIT',
          createdAt: { 
            gte: previousPeriodStart,
            lt: startDate
          }
        },
        _sum: { amount: true }
      }),

      // Current period shipments
      prisma.shipment.count({
        where: {
          brandId,
          createdAt: { gte: startDate }
        }
      }),

      // Previous period shipments for growth calculation
      prisma.shipment.count({
        where: {
          brandId,
          createdAt: { 
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),

      // Delivered shipments for success rate
      prisma.shipment.count({
        where: {
          brandId,
          status: 'DELIVERED',
          createdAt: { gte: startDate }
        }
      }),

      // Return requests for return rate
      prisma.returnRequest.count({
        where: {
          part: { brandId },
          createdAt: { gte: startDate }
        }
      }),

      // Wallet transactions for average order value
      prisma.walletTransaction.findMany({
        where: {
          userId: brandId,
          type: 'DEBIT',
          createdAt: { gte: startDate }
        },
        select: { amount: true }
      }),

      // Top performing parts by shipment frequency
      prisma.boxPart.groupBy({
        by: ['partId'],
        where: {
          box: {
            shipment: {
              brandId,
              createdAt: { gte: startDate }
            }
          }
        },
        _count: { partId: true },
        orderBy: { _count: { partId: 'desc' } },
        take: 5
      }),

      // Low stock parts
      prisma.part.count({
        where: {
          brandId,
          stockQuantity: { lte: 5 } // Using fixed value since we can't reference other fields in where clause
        }
      }),

      // Authorized service centers
      prisma.brandAuthorizedServiceCenter.count({
        where: { brandId, status: 'Active' }
      }),

      // Authorized distributors
      prisma.brandAuthorizedDistributor.count({
        where: { brandId, status: 'Active' }
      })
    ]);

    // Calculate metrics
    const currentRevenue = totalRevenue._sum.amount || 0;
    const prevRevenue = previousRevenue._sum.amount || 0;
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const currentShipments = totalShipments;
    const prevShipments = previousShipments;
    const shipmentGrowth = prevShipments > 0 ? ((currentShipments - prevShipments) / prevShipments) * 100 : 0;

    const averageOrderValue = walletTransactions.length > 0 
      ? walletTransactions.reduce((sum, t) => sum + t.amount, 0) / walletTransactions.length 
      : 0;

    const deliverySuccessRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;
    const returnRate = totalShipments > 0 ? (returnRequests / totalShipments) * 100 : 0;

    // Get part details for top parts
    const topPartDetails = await Promise.all(
      topParts.map(async (item) => {
        const part = await prisma.part.findUnique({
          where: { id: item.partId },
          select: { name: true, partNumber: true, price: true }
        });
        return {
          name: part?.name || 'Unknown Part',
          code: part?.partNumber || 'N/A',
          revenue: (part?.price || 0) * item._count.partId,
          quantity: item._count.partId
        };
      })
    );

    // Generate daily revenue data
    const dailyRevenue = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayTransactions = await prisma.walletTransaction.aggregate({
        where: {
          userId: brandId,
          type: 'DEBIT',
          createdAt: { gte: dayStart, lte: dayEnd }
        },
        _sum: { amount: true }
      });

      const dayShipments = await prisma.shipment.count({
        where: {
          brandId,
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      });

      dailyRevenue.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: dayTransactions._sum.amount || 0,
        shipments: dayShipments
      });
    }

    // Regional performance (mock for now as we don't have region data in schema)
    const regionPerformance = [
      { region: 'North', shipments: Math.floor(totalShipments * 0.35), revenue: Math.floor(currentRevenue * 0.35) },
      { region: 'South', shipments: Math.floor(totalShipments * 0.30), revenue: Math.floor(currentRevenue * 0.30) },
      { region: 'East', shipments: Math.floor(totalShipments * 0.20), revenue: Math.floor(currentRevenue * 0.20) },
      { region: 'West', shipments: Math.floor(totalShipments * 0.15), revenue: Math.floor(currentRevenue * 0.15) }
    ];

    // AI-based recommendations
    const recommendations = [];
    if (lowStockParts > 0) {
      recommendations.push({
        type: 'inventory',
        message: `${lowStockParts} parts are below minimum stock level. Consider restocking.`,
        priority: 'high' as const
      });
    }
    if (returnRate > 5) {
      recommendations.push({
        type: 'quality',
        message: 'Return rate is above 5%. Review product quality and packaging.',
        priority: 'medium' as const
      });
    }
    if (deliverySuccessRate < 90) {
      recommendations.push({
        type: 'logistics',
        message: 'Delivery success rate is below 90%. Optimize logistics partners.',
        priority: 'high' as const
      });
    }

    const analyticsData = {
      overview: {
        totalRevenue: currentRevenue,
        totalShipments: currentShipments,
        averageOrderValue: Math.round(averageOrderValue),
        customerSatisfaction: 4.2, // This would come from customer feedback system
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        shipmentGrowth: Math.round(shipmentGrowth * 100) / 100
      },
      performance: {
        deliverySuccess: Math.round(deliverySuccessRate * 100) / 100,
        onTimeDelivery: Math.max(0, deliverySuccessRate - 5), // Estimate based on delivery success
        returnRate: Math.round(returnRate * 100) / 100,
        customerRetention: Math.max(70, 100 - returnRate * 2) // Estimate based on return rate
      },
      trends: {
        dailyRevenue,
        topParts: topPartDetails,
        regionPerformance
      },
      forecasting: {
        predictedRevenue: Math.round(currentRevenue * 1.12), // 12% growth prediction
        predictedShipments: Math.round(currentShipments * 1.08), // 8% growth prediction
        stockAlerts: lowStockParts,
        recommendations
      }
    };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}