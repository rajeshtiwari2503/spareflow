import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getInventory(req, res);
      case 'POST':
        return await updateInventory(req, res);
      case 'PUT':
        return await consumeInventory(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Service Center Inventory API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getInventory(req: NextApiRequest, res: NextApiResponse) {
  const { serviceCenterProfileId, lowStock, page = 1, limit = 10 } = req.query;

  if (!serviceCenterProfileId) {
    return res.status(400).json({ error: 'Service center profile ID is required' });
  }

  const where: any = {
    serviceCenterProfileId: serviceCenterProfileId as string
  };

  // Filter for low stock items
  if (lowStock === 'true') {
    where.currentStock = {
      lte: prisma.serviceCenterInventory.fields.minStockLevel
    };
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [inventory, total] = await Promise.all([
    prisma.serviceCenterInventory.findMany({
      where,
      include: {
        part: {
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        consumptionLogs: {
          orderBy: { consumedAt: 'desc' },
          take: 5
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: parseInt(limit as string)
    }),
    prisma.serviceCenterInventory.count({ where })
  ]);

  // Calculate stock status for each item
  const inventoryWithStatus = inventory.map(item => ({
    ...item,
    stockStatus: item.currentStock <= item.minStockLevel ? 'LOW' : 
                 item.currentStock >= item.maxStockLevel ? 'HIGH' : 'NORMAL',
    stockPercentage: Math.round((item.currentStock / item.maxStockLevel) * 100)
  }));

  return res.status(200).json({
    inventory: inventoryWithStatus,
    pagination: {
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
}

async function updateInventory(req: NextApiRequest, res: NextApiResponse) {
  const {
    serviceCenterProfileId,
    partId,
    currentStock,
    minStockLevel,
    maxStockLevel,
    unitCost,
    location,
    notes
  } = req.body;

  if (!serviceCenterProfileId || !partId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if inventory item already exists
  const existingInventory = await prisma.serviceCenterInventory.findUnique({
    where: {
      serviceCenterProfileId_partId: {
        serviceCenterProfileId,
        partId
      }
    }
  });

  let inventory;

  if (existingInventory) {
    // Update existing inventory
    inventory = await prisma.serviceCenterInventory.update({
      where: {
        serviceCenterProfileId_partId: {
          serviceCenterProfileId,
          partId
        }
      },
      data: {
        currentStock: currentStock !== undefined ? parseInt(currentStock) : undefined,
        minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : undefined,
        maxStockLevel: maxStockLevel !== undefined ? parseInt(maxStockLevel) : undefined,
        unitCost: unitCost !== undefined ? parseFloat(unitCost) : undefined,
        location,
        notes,
        lastRestocked: currentStock !== undefined ? new Date() : undefined
      },
      include: {
        part: {
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
  } else {
    // Create new inventory item
    inventory = await prisma.serviceCenterInventory.create({
      data: {
        serviceCenterProfileId,
        partId,
        currentStock: parseInt(currentStock) || 0,
        minStockLevel: parseInt(minStockLevel) || 5,
        maxStockLevel: parseInt(maxStockLevel) || 50,
        unitCost: parseFloat(unitCost) || 0,
        location,
        notes,
        lastRestocked: new Date()
      },
      include: {
        part: {
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
  }

  // Check for low stock and create notification
  if (inventory.currentStock <= inventory.minStockLevel) {
    const serviceCenterProfile = await prisma.serviceCenterProfile.findUnique({
      where: { id: serviceCenterProfileId },
      include: { user: true }
    });

    if (serviceCenterProfile) {
      await prisma.notification.create({
        data: {
          userId: serviceCenterProfile.userId,
          title: 'Low Stock Alert',
          message: `${inventory.part.name} is running low. Current stock: ${inventory.currentStock}, Minimum level: ${inventory.minStockLevel}`,
          type: 'LOW_STOCK_ALERT',
          relatedId: inventory.id
        }
      });
    }
  }

  return res.status(200).json(inventory);
}

async function consumeInventory(req: NextApiRequest, res: NextApiResponse) {
  const {
    serviceCenterInventoryId,
    quantity,
    reason,
    customerInfo,
    jobNumber,
    notes
  } = req.body;

  if (!serviceCenterInventoryId || !quantity || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get current inventory
  const inventory = await prisma.serviceCenterInventory.findUnique({
    where: { id: serviceCenterInventoryId },
    include: {
      part: true,
      serviceCenterProfile: {
        include: { user: true }
      }
    }
  });

  if (!inventory) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  const consumeQty = parseInt(quantity);

  if (inventory.currentStock < consumeQty) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  // Create consumption log and update inventory in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create consumption log
    const consumptionLog = await tx.inventoryConsumption.create({
      data: {
        serviceCenterInventoryId,
        quantity: consumeQty,
        reason,
        customerInfo,
        jobNumber,
        notes
      }
    });

    // Update inventory stock
    const updatedInventory = await tx.serviceCenterInventory.update({
      where: { id: serviceCenterInventoryId },
      data: {
        currentStock: inventory.currentStock - consumeQty,
        lastConsumed: new Date()
      },
      include: {
        part: {
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        consumptionLogs: {
          orderBy: { consumedAt: 'desc' },
          take: 5
        }
      }
    });

    return { consumptionLog, updatedInventory };
  });

  // Check for low stock after consumption
  if (result.updatedInventory.currentStock <= result.updatedInventory.minStockLevel) {
    await prisma.notification.create({
      data: {
        userId: inventory.serviceCenterProfile.userId,
        title: 'Low Stock Alert',
        message: `${inventory.part.name} is running low after consumption. Current stock: ${result.updatedInventory.currentStock}, Minimum level: ${result.updatedInventory.minStockLevel}`,
        type: 'LOW_STOCK_ALERT',
        relatedId: inventory.id
      }
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: inventory.serviceCenterProfile.userId,
      action: 'INVENTORY_CONSUMED',
      details: JSON.stringify({
        partId: inventory.partId,
        partName: inventory.part.name,
        quantity: consumeQty,
        reason,
        jobNumber,
        remainingStock: result.updatedInventory.currentStock
      })
    }
  });

  return res.status(200).json(result);
}