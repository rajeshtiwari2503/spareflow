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
      const { 
        partId, 
        type, 
        fromDate, 
        toDate, 
        locationId, 
        page = 1, 
        limit = 50 
      } = req.query;

      // Build where clause
      const where: any = {
        brandId: user.id
      };

      if (partId) where.partId = partId;
      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = new Date(fromDate as string);
        if (toDate) where.createdAt.lte = new Date(toDate as string);
      }

      // Get movements from inventory ledger
      const [movements, totalCount] = await Promise.all([
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
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit)
        }),
        prisma.inventoryLedger.count({ where })
      ]);

      // Transform to movement format
      const transformedMovements = movements.map(movement => ({
        id: movement.id,
        type: getMovementType(movement.actionType),
        subType: movement.actionType,
        partId: movement.partId,
        fromLocationId: movement.source === 'BRAND' ? 'loc1' : null,
        toLocationId: movement.destination === 'BRAND' ? 'loc1' : null,
        quantity: movement.quantity,
        unitCost: movement.unitCost,
        totalValue: movement.totalValue,
        reason: movement.referenceNote || 'Inventory movement',
        reference: movement.shipmentId,
        batchNumber: null, // Would come from batch tracking
        serialNumbers: [], // Would come from serial tracking
        expiryDate: null, // Would come from expiry tracking
        qualityStatus: 'GOOD', // Default quality status
        approvedBy: movement.createdBy,
        performedBy: movement.createdBy || 'SYSTEM',
        timestamp: movement.createdAt,
        notes: movement.referenceNote,
        attachments: [],
        part: movement.part
      }));

      return res.status(200).json({
        success: true,
        data: {
          movements: transformedMovements,
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
        type,
        subType,
        partId,
        fromLocationId,
        toLocationId,
        quantity,
        unitCost,
        reason,
        reference,
        batchNumber,
        serialNumbers,
        expiryDate,
        qualityStatus,
        notes,
        attachments
      } = req.body;

      // Validate required fields
      if (!type || !partId || !quantity || !reason) {
        return res.status(400).json({
          error: 'Missing required fields: type, partId, quantity, reason'
        });
      }

      // Validate part exists
      const part = await prisma.part.findUnique({
        where: { id: partId },
        select: { id: true, brandId: true }
      });

      if (!part || part.brandId !== user.id) {
        return res.status(404).json({
          error: 'Part not found or access denied'
        });
      }

      // Determine action type for inventory ledger
      const actionType = getActionType(type, fromLocationId, toLocationId);
      const source = getSource(type, fromLocationId);
      const destination = getDestination(type, toLocationId);

      try {
        // Create inventory ledger entry
        const ledgerEntry = await prisma.inventoryLedger.create({
          data: {
            brandId: user.id,
            partId,
            partNumber: part.id, // Would be actual part number
            actionType,
            quantity,
            source,
            destination,
            referenceNote: notes || reason,
            createdBy: user.id,
            unitCost,
            totalValue: unitCost ? unitCost * quantity : null,
            balanceAfter: 0 // Would be calculated based on current inventory
          }
        });

        // Update brand inventory based on movement type
        await updateBrandInventory(user.id, partId, actionType, quantity, unitCost);

        // Create movement record (in a real system, this would be a separate table)
        const movementRecord = {
          id: ledgerEntry.id,
          type,
          subType: subType || actionType,
          partId,
          fromLocationId,
          toLocationId,
          quantity,
          unitCost,
          totalValue: unitCost ? unitCost * quantity : null,
          reason,
          reference,
          batchNumber,
          serialNumbers: serialNumbers || [],
          expiryDate,
          qualityStatus: qualityStatus || 'GOOD',
          approvedBy: user.id,
          performedBy: user.id,
          timestamp: new Date().toISOString(),
          notes,
          attachments: attachments || []
        };

        return res.status(201).json({
          success: true,
          message: 'Movement recorded successfully',
          data: movementRecord
        });
      } catch (error) {
        console.error('Error recording movement:', error);
        return res.status(400).json({
          error: 'Failed to record movement',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Movement management error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions
function getMovementType(actionType: string): string {
  switch (actionType) {
    case 'ADD':
      return 'RECEIPT';
    case 'TRANSFER_OUT':
    case 'REVERSE_OUT':
    case 'CONSUMED':
      return 'ISSUE';
    case 'TRANSFER_IN':
    case 'REVERSE_IN':
      return 'RECEIPT';
    default:
      return 'ADJUSTMENT';
  }
}

function getActionType(type: string, fromLocationId?: string, toLocationId?: string): string {
  switch (type) {
    case 'RECEIPT':
      return 'ADD';
    case 'ISSUE':
      return 'TRANSFER_OUT';
    case 'TRANSFER':
      return fromLocationId ? 'TRANSFER_OUT' : 'TRANSFER_IN';
    case 'ADJUSTMENT':
      return 'ADD'; // Could be ADD or CONSUMED based on quantity sign
    case 'RETURN':
      return 'REVERSE_IN';
    case 'SCRAP':
      return 'CONSUMED';
    default:
      return 'ADD';
  }
}

function getSource(type: string, fromLocationId?: string): string {
  switch (type) {
    case 'RECEIPT':
      return 'SUPPLIER';
    case 'ISSUE':
    case 'TRANSFER':
      return 'BRAND';
    case 'RETURN':
      return 'SERVICE_CENTER';
    case 'SCRAP':
      return 'BRAND';
    default:
      return 'SYSTEM';
  }
}

function getDestination(type: string, toLocationId?: string): string {
  switch (type) {
    case 'RECEIPT':
    case 'RETURN':
      return 'BRAND';
    case 'ISSUE':
      return 'SERVICE_CENTER';
    case 'TRANSFER':
      return toLocationId ? 'BRAND' : 'SERVICE_CENTER';
    case 'SCRAP':
      return 'SYSTEM';
    default:
      return 'BRAND';
  }
}

async function updateBrandInventory(
  brandId: string, 
  partId: string, 
  actionType: string, 
  quantity: number, 
  unitCost?: number
) {
  // Get current inventory
  const currentInventory = await prisma.brandInventory.findUnique({
    where: {
      brandId_partId: {
        brandId,
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
        throw new Error(`Insufficient inventory. Available: ${currentInventory?.onHandQuantity || 0}`);
      }
      break;
    default:
      newBalance = currentInventory?.onHandQuantity || 0;
  }

  // Update or create brand inventory
  await prisma.brandInventory.upsert({
    where: {
      brandId_partId: {
        brandId,
        partId
      }
    },
    update: {
      onHandQuantity: newBalance,
      availableQuantity: newBalance,
      lastUpdated: new Date(),
      ...(actionType === 'ADD' && { lastRestocked: new Date() }),
      ...(actionType.includes('OUT') || actionType === 'CONSUMED' && { lastIssued: new Date() }),
      ...(unitCost && { lastCost: unitCost })
    },
    create: {
      brandId,
      partId,
      onHandQuantity: newBalance,
      availableQuantity: newBalance,
      lastRestocked: actionType === 'ADD' ? new Date() : null,
      lastIssued: (actionType.includes('OUT') || actionType === 'CONSUMED') ? new Date() : null,
      lastCost: unitCost
    }
  });
}