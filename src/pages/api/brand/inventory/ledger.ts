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
      const { partId, actionType, startDate, endDate, page = 1, limit = 50 } = req.query;
      
      const where: any = {
        brandId: user.id
      };

      if (partId) where.partId = partId;
      if (actionType) where.actionType = actionType;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [ledgerEntries, totalCount] = await Promise.all([
        prisma.inventoryLedger.findMany({
          where,
          include: {
            part: {
              select: {
                id: true,
                code: true,
                name: true,
                partNumber: true
              }
            },
            shipment: {
              select: {
                id: true,
                awbNumber: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit)
        }),
        prisma.inventoryLedger.count({ where })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          entries: ledgerEntries,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          }
        }
      });
    }

    if (req.method === 'POST') {
      const { 
        partId, 
        actionType, 
        quantity, 
        source, 
        destination, 
        shipmentId, 
        referenceNote,
        unitCost 
      } = req.body;

      // Validate required fields
      if (!partId || !actionType || !quantity || !source || !destination) {
        return res.status(400).json({ 
          error: 'Missing required fields: partId, actionType, quantity, source, destination' 
        });
      }

      // Get current brand inventory
      const currentInventory = await prisma.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId: user.id,
            partId
          }
        }
      });

      let newBalance = 0;
      
      // Calculate new balance based on action type
      switch (actionType) {
        case 'ADD':
        case 'TRANSFER_IN':
        case 'REVERSE_IN':
          newBalance = (currentInventory?.onHandQuantity || 0) + quantity;
          break;
        case 'TRANSFER_OUT':
        case 'REVERSE_OUT':
        case 'CONSUMED':
          newBalance = (currentInventory?.onHandQuantity || 0) - quantity;
          if (newBalance < 0) {
            return res.status(400).json({ 
              error: 'Insufficient inventory. Available: ' + (currentInventory?.onHandQuantity || 0) 
            });
          }
          break;
        default:
          return res.status(400).json({ 
            error: 'Invalid action type. Must be one of: ADD, TRANSFER_OUT, TRANSFER_IN, REVERSE_IN, REVERSE_OUT, CONSUMED' 
          });
      }

      // Create ledger entry and update inventory in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create ledger entry
        const ledgerEntry = await tx.inventoryLedger.create({
          data: {
            brandId: user.id,
            partId,
            partNumber: req.body.partNumber,
            actionType,
            quantity,
            source,
            destination,
            shipmentId,
            referenceNote,
            createdBy: user.id,
            unitCost,
            totalValue: unitCost ? unitCost * quantity : null,
            balanceAfter: newBalance
          }
        });

        // Update or create brand inventory
        const updatedInventory = await tx.brandInventory.upsert({
          where: {
            brandId_partId: {
              brandId: user.id,
              partId
            }
          },
          update: {
            onHandQuantity: newBalance,
            availableQuantity: newBalance, // Will be adjusted for reservations separately
            lastUpdated: new Date(),
            ...(actionType === 'ADD' && { lastRestocked: new Date() }),
            ...(actionType.includes('OUT') && { lastIssued: new Date() }),
            ...(unitCost && { lastCost: unitCost })
          },
          create: {
            brandId: user.id,
            partId,
            onHandQuantity: newBalance,
            availableQuantity: newBalance,
            lastRestocked: actionType === 'ADD' ? new Date() : null,
            lastIssued: actionType.includes('OUT') ? new Date() : null,
            lastCost: unitCost
          }
        });

        return { ledgerEntry, updatedInventory };
      });

      return res.status(201).json({
        success: true,
        message: 'Inventory updated successfully',
        data: result
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Brand inventory ledger error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}