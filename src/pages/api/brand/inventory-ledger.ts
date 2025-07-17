import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

interface InventoryLedgerEntry {
  brandId: string;
  partId: string;
  partNumber?: string;
  actionType: 'ADD' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'REVERSE_IN' | 'REVERSE_OUT' | 'CONSUMED';
  quantity: number;
  source: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER' | 'SYSTEM';
  destination: 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER' | 'BRAND' | 'SYSTEM';
  shipmentId?: string;
  referenceNote?: string;
  createdBy?: string;
  unitCost?: number;
  totalValue?: number;
}

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
        return await handleGetLedger(req, res, brandId);
      case 'POST':
        return await handleCreateLedgerEntry(req, res, brandId);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Inventory ledger API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetLedger(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  const { 
    partId, 
    actionType, 
    source, 
    destination, 
    startDate, 
    endDate, 
    page = '1', 
    limit = '50',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  // Build filter conditions
  const where: any = { brandId };

  if (partId) where.partId = partId;
  if (actionType) where.actionType = actionType;
  if (source) where.source = source;
  if (destination) where.destination = destination;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  try {
    // Get total count for pagination
    const totalCount = await prisma.inventoryLedger.count({ where });

    // Get ledger entries with related data
    const ledgerEntries = await prisma.inventoryLedger.findMany({
      where,
      include: {
        part: {
          select: {
            id: true,
            code: true,
            name: true,
            partNumber: true,
            imageUrl: true,
            category: true,
            costPrice: true,
            price: true
          }
        },
        shipment: {
          select: {
            id: true,
            awbNumber: true,
            status: true,
            recipientType: true,
            courierPartner: true
          }
        }
      },
      orderBy: {
        [sortBy as string]: sortOrder
      },
      skip: offset,
      take: limitNum
    });

    // Calculate summary statistics
    const summary = await prisma.inventoryLedger.groupBy({
      by: ['actionType'],
      where: {
        brandId,
        createdAt: {
          gte: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          lte: endDate ? new Date(endDate as string) : new Date()
        }
      },
      _sum: {
        quantity: true,
        totalValue: true
      },
      _count: {
        id: true
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        entries: ledgerEntries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        },
        summary: summary.reduce((acc, item) => {
          acc[item.actionType] = {
            count: item._count.id,
            totalQuantity: item._sum.quantity || 0,
            totalValue: item._sum.totalValue || 0
          };
          return acc;
        }, {} as Record<string, any>)
      }
    });
  } catch (error) {
    console.error('Error fetching inventory ledger:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch inventory ledger',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleCreateLedgerEntry(req: NextApiRequest, res: NextApiResponse, brandId: string) {
  const entryData: InventoryLedgerEntry = req.body;

  // Validate required fields
  if (!entryData.partId || !entryData.actionType || !entryData.quantity || !entryData.source || !entryData.destination) {
    return res.status(400).json({ 
      error: 'Missing required fields: partId, actionType, quantity, source, destination' 
    });
  }

  // Validate action type
  const validActionTypes = ['ADD', 'TRANSFER_OUT', 'TRANSFER_IN', 'REVERSE_IN', 'REVERSE_OUT', 'CONSUMED'];
  if (!validActionTypes.includes(entryData.actionType)) {
    return res.status(400).json({ 
      error: 'Invalid action type. Must be one of: ' + validActionTypes.join(', ')
    });
  }

  try {
    // Start transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get current brand inventory
      let brandInventory = await tx.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId,
            partId: entryData.partId
          }
        }
      });

      // Calculate new balance based on action type
      let newBalance = brandInventory?.onHandQuantity || 0;
      
      switch (entryData.actionType) {
        case 'ADD':
        case 'TRANSFER_IN':
        case 'REVERSE_IN':
          newBalance += entryData.quantity;
          break;
        case 'TRANSFER_OUT':
        case 'REVERSE_OUT':
        case 'CONSUMED':
          newBalance -= entryData.quantity;
          break;
      }

      // Ensure balance doesn't go negative
      if (newBalance < 0) {
        throw new Error(`Insufficient inventory. Current: ${brandInventory?.onHandQuantity || 0}, Requested: ${entryData.quantity}`);
      }

      // Get part details for cost calculation
      const part = await tx.part.findUnique({
        where: { id: entryData.partId },
        select: { costPrice: true, price: true, partNumber: true }
      });

      if (!part) {
        throw new Error('Part not found');
      }

      // Calculate unit cost and total value if not provided
      const unitCost = entryData.unitCost || part.costPrice || part.price || 0;
      const totalValue = entryData.totalValue || (unitCost * entryData.quantity);

      // Create ledger entry
      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          brandId,
          partId: entryData.partId,
          partNumber: entryData.partNumber || part.partNumber,
          actionType: entryData.actionType,
          quantity: entryData.quantity,
          source: entryData.source,
          destination: entryData.destination,
          shipmentId: entryData.shipmentId,
          referenceNote: entryData.referenceNote,
          createdBy: entryData.createdBy,
          unitCost,
          totalValue,
          balanceAfter: newBalance
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

      // Update or create brand inventory record
      const now = new Date();
      const inventoryUpdate = {
        onHandQuantity: newBalance,
        availableQuantity: newBalance, // For now, assuming no reservations
        lastUpdated: now,
        averageCost: unitCost, // Simplified - should be weighted average
        lastCost: unitCost
      };

      if (['ADD', 'TRANSFER_IN', 'REVERSE_IN'].includes(entryData.actionType)) {
        inventoryUpdate.lastRestocked = now;
      } else if (['TRANSFER_OUT', 'REVERSE_OUT', 'CONSUMED'].includes(entryData.actionType)) {
        inventoryUpdate.lastIssued = now;
      }

      await tx.brandInventory.upsert({
        where: {
          brandId_partId: {
            brandId,
            partId: entryData.partId
          }
        },
        update: inventoryUpdate,
        create: {
          brandId,
          partId: entryData.partId,
          ...inventoryUpdate
        }
      });

      // Also update the main parts table stock quantity for consistency
      await tx.part.update({
        where: { id: entryData.partId },
        data: { stockQuantity: newBalance }
      });

      return ledgerEntry;
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Inventory ledger entry created successfully'
    });

  } catch (error) {
    console.error('Error creating inventory ledger entry:', error);
    return res.status(500).json({ 
      error: 'Failed to create inventory ledger entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}