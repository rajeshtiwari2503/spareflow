import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Brand role required.' });
    }

    if (req.method === 'GET') {
      const { sku, lowStock, fastMoving } = req.query;

      // Get current inventory with part details
      const where: any = {
        brandId: user.id
      };

      if (sku) {
        where.part = {
          OR: [
            { code: { contains: sku as string, mode: 'insensitive' } },
            { partNumber: { contains: sku as string, mode: 'insensitive' } },
            { name: { contains: sku as string, mode: 'insensitive' } }
          ]
        };
      }

      if (lowStock === 'true') {
        where.onHandQuantity = { lte: 10 }; // Configurable threshold
      }

      const inventoryData = await prisma.brandInventory.findMany({
        where,
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              partNumber: true,
              minStockLevel: true,
              maxStockLevel: true,
              category: true,
              price: true,
              weight: true
            }
          }
        },
        orderBy: { lastUpdated: 'desc' }
      });

      // Get recent movements (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentMovements = await prisma.inventoryLedger.findMany({
        where: {
          brandId: user.id,
          createdAt: { gte: thirtyDaysAgo }
        },
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              partNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      // Calculate summary statistics
      const totalParts = inventoryData.length;
      const totalValue = inventoryData.reduce((sum, item) => 
        sum + (item.onHandQuantity * (item.part.price || 0)), 0
      );
      const lowStockItems = inventoryData.filter(item => 
        item.onHandQuantity <= (item.part.minStockLevel || 5)
      ).length;
      const outOfStockItems = inventoryData.filter(item => 
        item.onHandQuantity === 0
      ).length;

      // Get fast-moving items (high activity in last 30 days)
      const fastMovingItems = await prisma.inventoryLedger.groupBy({
        by: ['partId'],
        where: {
          brandId: user.id,
          createdAt: { gte: thirtyDaysAgo },
          actionType: { in: ['TRANSFER_OUT', 'CONSUMED'] }
        },
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 10
      });

      // Get monthly consumption trends
      const monthlyTrends = await prisma.inventoryLedger.groupBy({
        by: ['actionType'],
        where: {
          brandId: user.id,
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: {
          quantity: true
        }
      });

      // Get alerts for low stock
      const alerts = inventoryData
        .filter(item => item.onHandQuantity <= (item.part.minStockLevel || 5))
        .map(item => ({
          type: item.onHandQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          partId: item.partId,
          partCode: item.part.code,
          partName: item.part.name,
          currentStock: item.onHandQuantity,
          minStockLevel: item.part.minStockLevel || 5,
          severity: item.onHandQuantity === 0 ? 'CRITICAL' : 'WARNING'
        }));

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalParts,
            totalValue,
            lowStockItems,
            outOfStockItems
          },
          inventory: inventoryData,
          recentMovements,
          fastMovingItems,
          monthlyTrends,
          alerts
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Brand inventory dashboard error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}