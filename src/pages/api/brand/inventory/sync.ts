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

    if (req.method === 'POST') {
      const { 
        sku, 
        quantity, 
        action, 
        note,
        unitCost,
        batchData // For bulk operations
      } = req.body;

      // Handle bulk sync
      if (batchData && Array.isArray(batchData)) {
        const results = [];
        const errors = [];

        for (const item of batchData) {
          try {
            const { sku, quantity, action, note, unitCost } = item;
            
            if (!sku || !quantity || !action) {
              errors.push({ sku, error: 'Missing required fields: sku, quantity, action' });
              continue;
            }

            // Find part by SKU or part number
            const part = await prisma.part.findFirst({
              where: {
                brandId: user.id,
                OR: [
                  { code: sku },
                  { partNumber: sku }
                ]
              }
            });

            if (!part) {
              errors.push({ sku, error: 'Part not found' });
              continue;
            }

            // Get current inventory
            const currentInventory = await prisma.brandInventory.findUnique({
              where: {
                brandId_partId: {
                  brandId: user.id,
                  partId: part.id
                }
              }
            });

            let newBalance = 0;
            let actionType = '';
            let source = '';
            let destination = '';

            switch (action.toUpperCase()) {
              case 'ADD':
              case 'RESTOCK':
                actionType = 'ADD';
                source = 'SYSTEM';
                destination = 'BRAND';
                newBalance = (currentInventory?.onHandQuantity || 0) + quantity;
                break;
              case 'CONSUMED':
              case 'SCRAP':
                actionType = 'CONSUMED';
                source = 'BRAND';
                destination = 'SYSTEM';
                newBalance = (currentInventory?.onHandQuantity || 0) - quantity;
                break;
              case 'TRANSFER_OUT':
                actionType = 'TRANSFER_OUT';
                source = 'BRAND';
                destination = 'EXTERNAL';
                newBalance = (currentInventory?.onHandQuantity || 0) - quantity;
                break;
              default:
                errors.push({ sku, error: 'Invalid action. Use: ADD, CONSUMED, TRANSFER_OUT' });
                continue;
            }

            if (newBalance < 0) {
              errors.push({ 
                sku, 
                error: `Insufficient inventory. Available: ${currentInventory?.onHandQuantity || 0}` 
              });
              continue;
            }

            // Create ledger entry and update inventory
            const result = await prisma.$transaction(async (tx) => {
              const ledgerEntry = await tx.inventoryLedger.create({
                data: {
                  brandId: user.id,
                  partId: part.id,
                  partNumber: part.partNumber || part.code,
                  actionType,
                  quantity,
                  source,
                  destination,
                  referenceNote: note || `API Sync - ${action}`,
                  createdBy: user.id,
                  unitCost,
                  totalValue: unitCost ? unitCost * quantity : null,
                  balanceAfter: newBalance
                }
              });

              const updatedInventory = await tx.brandInventory.upsert({
                where: {
                  brandId_partId: {
                    brandId: user.id,
                    partId: part.id
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
                  brandId: user.id,
                  partId: part.id,
                  onHandQuantity: newBalance,
                  availableQuantity: newBalance,
                  lastRestocked: actionType === 'ADD' ? new Date() : null,
                  lastIssued: (actionType.includes('OUT') || actionType === 'CONSUMED') ? new Date() : null,
                  lastCost: unitCost
                }
              });

              return { ledgerEntry, updatedInventory };
            });

            results.push({
              sku,
              success: true,
              newBalance,
              ledgerEntryId: result.ledgerEntry.id
            });

          } catch (error) {
            errors.push({ 
              sku: item.sku, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }

        return res.status(200).json({
          success: true,
          message: `Processed ${results.length} items successfully, ${errors.length} errors`,
          data: {
            successful: results,
            errors
          }
        });
      }

      // Handle single item sync
      if (!sku || !quantity || !action) {
        return res.status(400).json({ 
          error: 'Missing required fields: sku, quantity, action' 
        });
      }

      // Find part by SKU or part number
      const part = await prisma.part.findFirst({
        where: {
          brandId: user.id,
          OR: [
            { code: sku },
            { partNumber: sku }
          ]
        }
      });

      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }

      // Get current inventory
      const currentInventory = await prisma.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId: user.id,
            partId: part.id
          }
        }
      });

      let newBalance = 0;
      let actionType = '';
      let source = '';
      let destination = '';

      switch (action.toUpperCase()) {
        case 'ADD':
        case 'RESTOCK':
          actionType = 'ADD';
          source = 'SYSTEM';
          destination = 'BRAND';
          newBalance = (currentInventory?.onHandQuantity || 0) + quantity;
          break;
        case 'CONSUMED':
        case 'SCRAP':
          actionType = 'CONSUMED';
          source = 'BRAND';
          destination = 'SYSTEM';
          newBalance = (currentInventory?.onHandQuantity || 0) - quantity;
          break;
        case 'TRANSFER_OUT':
          actionType = 'TRANSFER_OUT';
          source = 'BRAND';
          destination = 'EXTERNAL';
          newBalance = (currentInventory?.onHandQuantity || 0) - quantity;
          break;
        default:
          return res.status(400).json({ 
            error: 'Invalid action. Use: ADD, CONSUMED, TRANSFER_OUT' 
          });
      }

      if (newBalance < 0) {
        return res.status(400).json({ 
          error: `Insufficient inventory. Available: ${currentInventory?.onHandQuantity || 0}` 
        });
      }

      // Create ledger entry and update inventory
      const result = await prisma.$transaction(async (tx) => {
        const ledgerEntry = await tx.inventoryLedger.create({
          data: {
            brandId: user.id,
            partId: part.id,
            partNumber: part.partNumber || part.code,
            actionType,
            quantity,
            source,
            destination,
            referenceNote: note || `API Sync - ${action}`,
            createdBy: user.id,
            unitCost,
            totalValue: unitCost ? unitCost * quantity : null,
            balanceAfter: newBalance
          }
        });

        const updatedInventory = await tx.brandInventory.upsert({
          where: {
            brandId_partId: {
              brandId: user.id,
              partId: part.id
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
            brandId: user.id,
            partId: part.id,
            onHandQuantity: newBalance,
            availableQuantity: newBalance,
            lastRestocked: actionType === 'ADD' ? new Date() : null,
            lastIssued: (actionType.includes('OUT') || actionType === 'CONSUMED') ? new Date() : null,
            lastCost: unitCost
          }
        });

        return { ledgerEntry, updatedInventory };
      });

      return res.status(200).json({
        success: true,
        message: 'Inventory updated successfully',
        data: {
          sku,
          newBalance,
          ledgerEntryId: result.ledgerEntry.id
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Brand inventory sync error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}