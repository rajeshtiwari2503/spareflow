import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user session for authentication
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Brand role required.' });
    }

    const { method } = req;
    const brandId = user.id;

    switch (method) {
      case 'GET':
        return await handleGetInventorySummary(req, res, brandId);
      case 'PUT':
        return await handleUpdateInventory(req, res, brandId);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Inventory summary API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetInventorySummary(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  const { 
    category, 
    lowStock = 'false', 
    search, 
    page = '1', 
    limit = '50',
    sortBy = 'lastUpdated',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    // Build filter conditions
    const where: any = { brandId };
    const partWhere: any = {};

    if (category) partWhere.category = category;
    if (search) {
      partWhere.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { partNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (Object.keys(partWhere).length > 0) {
      where.part = partWhere;
    }

    // Add low stock filter if requested
    if (lowStock === 'true') {
      where.AND = [
        {
          OR: [
            { onHandQuantity: { lte: prisma.part.fields.minStockLevel } },
            { onHandQuantity: 0 }
          ]
        }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.brandInventory.count({ 
      where: {
        ...where,
        part: partWhere
      }
    });

    // Get inventory summary with part details
    const inventorySummary = await prisma.brandInventory.findMany({
      where: {
        ...where,
        part: partWhere
      },
      include: {
        part: {
          select: {
            id: true,
            code: true,
            name: true,
            partNumber: true,
            category: true,
            subCategory: true,
            imageUrl: true,
            price: true,
            costPrice: true,
            minStockLevel: true,
            maxStockLevel: true,
            reorderPoint: true,
            reorderQty: true,
            weight: true,
            status: true,
            featured: true
          }
        }
      },
      orderBy: {
        [sortBy as string]: sortOrder
      },
      skip: offset,
      take: limitNum
    });

    // Calculate overall statistics
    const overallStats = await prisma.brandInventory.aggregate({
      where: { brandId },
      _sum: {
        onHandQuantity: true,
        reservedQuantity: true,
        availableQuantity: true
      },
      _count: {
        id: true
      }
    });

    // Get low stock alerts
    const lowStockItems = await prisma.brandInventory.findMany({
      where: {
        brandId,
        OR: [
          {
            AND: [
              { onHandQuantity: { gt: 0 } },
              { 
                part: {
                  minStockLevel: { not: null }
                }
              }
            ]
          },
          { onHandQuantity: 0 }
        ]
      },
      include: {
        part: {
          select: {
            id: true,
            code: true,
            name: true,
            minStockLevel: true,
            category: true
          }
        }
      },
      take: 10
    });

    // Calculate total inventory value
    const inventoryValue = await prisma.brandInventory.findMany({
      where: { brandId },
      select: {
        onHandQuantity: true,
        averageCost: true,
        part: {
          select: {
            price: true,
            costPrice: true
          }
        }
      }
    });

    const totalValue = inventoryValue.reduce((sum, item) => {
      const cost = item.averageCost || item.part.costPrice || item.part.price || 0;
      return sum + (item.onHandQuantity * cost);
    }, 0);

    // Get recent movements (last 7 days)
    const recentMovements = await prisma.inventoryLedger.findMany({
      where: {
        brandId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        part: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return res.status(200).json({
      success: true,
      data: {
        inventory: inventorySummary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        },
        statistics: {
          totalParts: overallStats._count.id,
          totalOnHand: overallStats._sum.onHandQuantity || 0,
          totalReserved: overallStats._sum.reservedQuantity || 0,
          totalAvailable: overallStats._sum.availableQuantity || 0,
          totalValue: Math.round(totalValue * 100) / 100,
          lowStockCount: lowStockItems.length
        },
        lowStockAlerts: lowStockItems,
        recentMovements
      }
    });

  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch inventory summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleUpdateInventory(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  const { partId, updates } = req.body;

  if (!partId) {
    return res.status(400).json({ error: 'Part ID is required' });
  }

  try {
    // Validate that the inventory record exists
    const existingInventory = await prisma.brandInventory.findUnique({
      where: {
        brandId_partId: {
          brandId,
          partId
        }
      }
    });

    if (!existingInventory) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    // Update the inventory record
    const updatedInventory = await prisma.brandInventory.update({
      where: {
        brandId_partId: {
          brandId,
          partId
        }
      },
      data: {
        ...updates,
        lastUpdated: new Date()
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
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedInventory,
      message: 'Inventory updated successfully'
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    return res.status(500).json({ 
      error: 'Failed to update inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}