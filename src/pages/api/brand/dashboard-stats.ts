import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication with enhanced error handling
    const user = await verifyToken(req);
    if (!user) {
      console.log('Dashboard stats - No user found from token verification');
      return res.status(401).json({ error: 'Unauthorized - Please login again' });
    }

    if (user.role !== 'BRAND') {
      console.log('Dashboard stats - User role mismatch:', user.role);
      return res.status(403).json({ error: 'Access denied. Brand role required.' });
    }

    console.log('Dashboard stats - Authenticated user:', user.id, user.email, user.role);

    // Use user ID as brand ID for now
    const brandId = user.id;

    // Get current date for monthly calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch dashboard statistics with real data
    const [
      totalParts,
      activeShipments,
      authorizedServiceCenters,
      authorizedDistributors,
      walletBalance,
      pendingReturns,
      monthlyRevenue,
      recentShipments,
      lowStockParts,
      totalRevenue,
      totalWalletTransactions,
      deliveredShipments
    ] = await Promise.all([
      // Total Parts in catalog
      prisma.part.count({
        where: { brandId: brandId }
      }),

      // Active Shipments (in-transit)
      prisma.shipment.count({
        where: {
          brandId: brandId,
          status: {
            in: ['INITIATED', 'DISPATCHED']
          }
        }
      }),

      // Authorized Service Centers
      prisma.brandAuthorizedServiceCenter.count({
        where: {
          brandId: brandId,
          status: 'Active'
        }
      }),

      // Authorized Distributors
      prisma.brandAuthorizedDistributor.count({
        where: {
          brandId: brandId,
          status: 'Active'
        }
      }),

      // Wallet Balance
      prisma.wallet.findUnique({
        where: { userId: user.id },
        select: { balance: true }
      }),

      // Pending Returns
      prisma.returnRequest.count({
        where: {
          part: {
            brandId: brandId
          },
          status: 'REQUESTED'
        }
      }),

      // Monthly Revenue from wallet transactions
      prisma.walletTransaction.aggregate({
        where: {
          userId: brandId,
          type: 'DEBIT',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: { amount: true }
      }),

      // Recent Shipments (last 5)
      prisma.shipment.findMany({
        where: { brandId: brandId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
          serviceCenter: {
            select: {
              name: true
            }
          }
        }
      }),

      // Low Stock Parts - get all parts and filter in memory for field comparison
      prisma.part.findMany({
        where: {
          brandId: brandId,
          stockQuantity: { lte: 5 } // Low stock threshold
        },
        select: {
          id: true,
          name: true,
          partNumber: true,
          stockQuantity: true,
          minStockLevel: true
        },
        take: 5
      }),

      // Total Revenue (all time)
      prisma.walletTransaction.aggregate({
        where: {
          userId: brandId,
          type: 'DEBIT'
        },
        _sum: { amount: true }
      }),

      // Total wallet transactions for metrics
      prisma.walletTransaction.count({
        where: {
          userId: brandId
        }
      }),

      // Delivered shipments for success rate
      prisma.shipment.count({
        where: {
          brandId: brandId,
          status: 'DELIVERED'
        }
      })
    ]);

    // Calculate additional metrics
    const totalAuthorizedPartners = authorizedServiceCenters + authorizedDistributors;
    const currentWalletBalance = walletBalance?.balance || 0;
    const currentMonthlyRevenue = monthlyRevenue._sum.amount || 0;
    const currentTotalRevenue = totalRevenue._sum.amount || 0;

    // Debug logging
    console.log('Dashboard stats debug:', {
      brandId,
      totalParts,
      activeShipments,
      authorizedServiceCenters,
      authorizedDistributors,
      currentWalletBalance,
      pendingReturns,
      lowStockPartsCount: lowStockParts.length,
      currentMonthlyRevenue,
      currentTotalRevenue
    });

    // Get shipment trends (last 7 days) with real data
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const shipmentTrends = await prisma.shipment.groupBy({
      by: ['createdAt'],
      where: {
        brandId: brandId,
        createdAt: {
          gte: last7Days
        }
      },
      _count: {
        id: true
      }
    });

    // Get return trends with real data
    const returnTrends = await prisma.returnRequest.groupBy({
      by: ['status'],
      where: {
        part: {
          brandId: brandId
        }
      },
      _count: {
        id: true
      }
    });

    // Get top performing parts (by shipment frequency) with real data
    const topParts = await prisma.boxPart.groupBy({
      by: ['partId'],
      where: {
        box: {
          shipment: {
            brandId: brandId,
            status: 'DELIVERED'
          }
        }
      },
      _count: {
        partId: true
      },
      orderBy: {
        _count: {
          partId: 'desc'
        }
      },
      take: 5
    });

    // Get part details for top performing parts
    const topPartDetails = await Promise.all(
      topParts.map(async (item) => {
        const part = await prisma.part.findUnique({
          where: { id: item.partId },
          select: {
            id: true,
            name: true,
            partNumber: true,
            price: true
          }
        });
        return {
          ...part,
          partName: part?.name,
          shipmentCount: item._count.partId
        };
      })
    );

    // Calculate performance metrics
    const totalShipments = await prisma.shipment.count({
      where: { brandId: brandId }
    });

    const shipmentSuccessRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;
    const returnRate = totalShipments > 0 ? (pendingReturns / totalShipments) * 100 : 0;

    // Get recent notifications (mock for now as we don't have a notification system implemented)
    const recentNotifications = [];

    const dashboardStats = {
      metrics: {
        totalParts,
        activeShipments,
        authorizedPartners: totalAuthorizedPartners,
        walletBalance: currentWalletBalance,
        pendingReturns,
        monthlyRevenue: currentMonthlyRevenue,
        totalRevenue: currentTotalRevenue,
        shipmentSuccessRate: Math.round(shipmentSuccessRate * 10) / 10,
        returnRate: Math.round(returnRate * 10) / 10
      },
      breakdown: {
        authorizedServiceCenters,
        authorizedDistributors
      },
      recentActivity: {
        shipments: recentShipments,
        notifications: recentNotifications
      },
      alerts: {
        lowStockParts
      },
      trends: {
        shipments: shipmentTrends,
        returns: returnTrends
      },
      topPerformers: {
        parts: topPartDetails
      },
      summary: {
        totalTransactions: totalWalletTransactions,
        averageOrderValue: totalWalletTransactions > 0 ? Math.round(currentTotalRevenue / totalWalletTransactions) : 0,
        growthRate: 0 // Would need historical data to calculate
      }
    };

    res.status(200).json(dashboardStats);

  } catch (error) {
    console.error('Brand dashboard stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}