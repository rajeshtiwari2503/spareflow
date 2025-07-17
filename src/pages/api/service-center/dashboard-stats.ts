import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'SERVICE_CENTER') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { serviceCenterProfileId } = req.query;

    if (!serviceCenterProfileId) {
      return res.status(400).json({ error: 'Service center profile ID is required' });
    }

    // Get service center profile to ensure it belongs to the authenticated user
    const serviceCenterProfile = await prisma.serviceCenterProfile.findFirst({
      where: {
        id: serviceCenterProfileId as string,
        userId: user.id
      }
    });

    if (!serviceCenterProfile) {
      return res.status(404).json({ error: 'Service center profile not found' });
    }

    // Calculate dashboard statistics
    const [
      inventoryStats,
      spareRequestsStats,
      shipmentsStats,
      consumptionStats
    ] = await Promise.all([
      // Inventory statistics
      prisma.serviceCenterInventory.aggregate({
        where: { serviceCenterProfileId: serviceCenterProfileId as string },
        _sum: { currentStock: true },
        _count: { id: true }
      }),

      // Low stock items count
      prisma.serviceCenterInventory.count({
        where: {
          serviceCenterProfileId: serviceCenterProfileId as string,
          currentStock: { lte: prisma.serviceCenterInventory.fields.minStockLevel }
        }
      }),

      // Spare requests statistics
      prisma.spareRequest.count({
        where: {
          serviceCenterProfileId: serviceCenterProfileId as string,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      }),

      // Pending shipments count
      prisma.shipmentReceived.count({
        where: {
          serviceCenterProfileId: serviceCenterProfileId as string,
          status: 'PENDING'
        }
      }),

      // Monthly consumption (last 30 days)
      prisma.inventoryConsumption.aggregate({
        where: {
          serviceCenterInventory: {
            serviceCenterProfileId: serviceCenterProfileId as string
          },
          consumedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _sum: { quantity: true }
      })
    ]);

    // Calculate total inventory value (approximate)
    const inventoryWithCosts = await prisma.serviceCenterInventory.findMany({
      where: { serviceCenterProfileId: serviceCenterProfileId as string },
      select: {
        currentStock: true,
        unitCost: true
      }
    });

    const totalInventoryValue = inventoryWithCosts.reduce((total, item) => {
      return total + (item.currentStock * (item.unitCost || 0));
    }, 0);

    // Calculate average response time for spare requests (in hours)
    const completedRequests = await prisma.spareRequest.findMany({
      where: {
        serviceCenterProfileId: serviceCenterProfileId as string,
        status: { in: ['DELIVERED', 'REJECTED'] },
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    let averageResponseTime = 0;
    if (completedRequests.length > 0) {
      const totalResponseTime = completedRequests.reduce((total, request) => {
        const responseTime = request.updatedAt.getTime() - request.createdAt.getTime();
        return total + responseTime;
      }, 0);
      
      averageResponseTime = totalResponseTime / completedRequests.length / (1000 * 60 * 60); // Convert to hours
    }

    const stats = {
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      lowStockItems: inventoryStats._count.id > 0 ? await prisma.serviceCenterInventory.count({
        where: {
          serviceCenterProfileId: serviceCenterProfileId as string,
          OR: [
            { currentStock: { lte: 5 } }, // Default min stock level
            {
              AND: [
                { minStockLevel: { not: null } },
                { currentStock: { lte: prisma.serviceCenterInventory.fields.minStockLevel } }
              ]
            }
          ]
        }
      }) : 0,
      pendingShipments: shipmentsStats,
      pendingRequests: spareRequestsStats,
      monthlyConsumption: consumptionStats._sum.quantity || 0,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10
    };

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Service Center Dashboard Stats API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}