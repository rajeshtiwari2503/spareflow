import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

interface SyncRequest {
  brand_id: string;
  sku: string;
  quantity: number;
  action: 'ADD' | 'CONSUMED' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'REVERSE_IN' | 'REVERSE_OUT';
  note?: string;
  unit_cost?: number;
  reference_id?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
    }

    // API Key authentication (simplified - in production, use proper API key management)
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Validate API key (in production, check against database)
    // For now, we'll accept any non-empty API key
    if (!apiKey.startsWith('spareflow_')) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }

    return await handleInventorySync(req, res);

  } catch (error) {
    console.error('Inventory sync API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleInventorySync(req: NextApiRequest, res: NextApiResponse) {
  const syncData: SyncRequest = req.body;

  // Validate required fields
  if (!syncData.brand_id || !syncData.sku || !syncData.quantity || !syncData.action) {
    return res.status(400).json({ 
      error: 'Missing required fields: brand_id, sku, quantity, action' 
    });
  }

  // Validate action type
  const validActions = ['ADD', 'CONSUMED', 'TRANSFER_OUT', 'TRANSFER_IN', 'REVERSE_IN', 'REVERSE_OUT'];
  if (!validActions.includes(syncData.action)) {
    return res.status(400).json({ 
      error: 'Invalid action. Must be one of: ' + validActions.join(', ')
    });
  }

  // Validate quantity
  if (syncData.quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  try {
    // Find the part by SKU (partNumber) and brand
    const part = await prisma.part.findFirst({
      where: {
        brandId: syncData.brand_id,
        OR: [
          { partNumber: syncData.sku },
          { code: syncData.sku }
        ]
      }
    });

    if (!part) {
      return res.status(404).json({ 
        error: `Part with SKU '${syncData.sku}' not found for brand '${syncData.brand_id}'` 
      });
    }

    // Determine source and destination based on action
    let source: string, destination: string;
    
    switch (syncData.action) {
      case 'ADD':
        source = 'SYSTEM';
        destination = 'BRAND';
        break;
      case 'CONSUMED':
        source = 'BRAND';
        destination = 'SYSTEM';
        break;
      case 'TRANSFER_OUT':
        source = 'BRAND';
        destination = 'SERVICE_CENTER'; // Default, could be parameterized
        break;
      case 'TRANSFER_IN':
        source = 'SERVICE_CENTER'; // Default, could be parameterized
        destination = 'BRAND';
        break;
      case 'REVERSE_IN':
        source = 'SERVICE_CENTER'; // Default, could be parameterized
        destination = 'BRAND';
        break;
      case 'REVERSE_OUT':
        source = 'BRAND';
        destination = 'SERVICE_CENTER'; // Default, could be parameterized
        break;
      default:
        return res.status(400).json({ error: 'Invalid action type' });
    }

    // Start transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get current brand inventory
      let brandInventory = await tx.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId: syncData.brand_id,
            partId: part.id
          }
        }
      });

      // Calculate new balance
      let newBalance = brandInventory?.onHandQuantity || 0;
      
      switch (syncData.action) {
        case 'ADD':
        case 'TRANSFER_IN':
        case 'REVERSE_IN':
          newBalance += syncData.quantity;
          break;
        case 'CONSUMED':
        case 'TRANSFER_OUT':
        case 'REVERSE_OUT':
          newBalance -= syncData.quantity;
          break;
      }

      // Ensure balance doesn't go negative
      if (newBalance < 0) {
        throw new Error(`Insufficient inventory. Current: ${brandInventory?.onHandQuantity || 0}, Requested: ${syncData.quantity}`);
      }

      // Calculate unit cost and total value
      const unitCost = syncData.unit_cost || part.costPrice || part.price || 0;
      const totalValue = unitCost * syncData.quantity;

      // Create ledger entry
      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          brandId: syncData.brand_id,
          partId: part.id,
          partNumber: part.partNumber || part.code,
          actionType: syncData.action,
          quantity: syncData.quantity,
          source,
          destination,
          referenceNote: syncData.note || `API sync - ${syncData.reference_id || 'external'}`,
          createdBy: 'API_SYNC',
          unitCost,
          totalValue,
          balanceAfter: newBalance
        }
      });

      // Update or create brand inventory record
      const now = new Date();
      const inventoryUpdate = {
        onHandQuantity: newBalance,
        availableQuantity: newBalance, // Simplified - no reservations for API sync
        lastUpdated: now,
        averageCost: unitCost,
        lastCost: unitCost
      };

      if (['ADD', 'TRANSFER_IN', 'REVERSE_IN'].includes(syncData.action)) {
        inventoryUpdate.lastRestocked = now;
      } else {
        inventoryUpdate.lastIssued = now;
      }

      await tx.brandInventory.upsert({
        where: {
          brandId_partId: {
            brandId: syncData.brand_id,
            partId: part.id
          }
        },
        update: inventoryUpdate,
        create: {
          brandId: syncData.brand_id,
          partId: part.id,
          ...inventoryUpdate
        }
      });

      // Update main parts table for consistency
      await tx.part.update({
        where: { id: part.id },
        data: { stockQuantity: newBalance }
      });

      return {
        ledgerEntry,
        newBalance,
        part: {
          id: part.id,
          code: part.code,
          name: part.name,
          partNumber: part.partNumber
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        transaction_id: result.ledgerEntry.id,
        part: result.part,
        action: syncData.action,
        quantity: syncData.quantity,
        previous_balance: result.newBalance - (
          ['ADD', 'TRANSFER_IN', 'REVERSE_IN'].includes(syncData.action) 
            ? syncData.quantity 
            : -syncData.quantity
        ),
        new_balance: result.newBalance,
        timestamp: result.ledgerEntry.createdAt
      },
      message: 'Inventory synchronized successfully'
    });

  } catch (error) {
    console.error('Error syncing inventory:', error);
    return res.status(500).json({ 
      error: 'Failed to sync inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}