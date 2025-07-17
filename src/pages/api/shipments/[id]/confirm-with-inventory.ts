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

    const { method } = req;
    const { id: shipmentId } = req.query;

    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
    }

    if (!shipmentId || typeof shipmentId !== 'string') {
      return res.status(400).json({ error: 'Shipment ID is required' });
    }

    return await handleConfirmShipmentWithInventory(req, res, shipmentId);

  } catch (error) {
    console.error('Confirm shipment with inventory API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleConfirmShipmentWithInventory(req: NextApiRequest, res: NextApiResponse, shipmentId: string) {
  const { awbNumber, courierPartner, estimatedCost, actualCost, expectedDelivery } = req.body;

  try {
    // Start transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get shipment details with parts
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          boxes: {
            include: {
              boxParts: {
                include: {
                  part: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      partNumber: true,
                      costPrice: true,
                      price: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      if (shipment.status !== 'INITIATED' && shipment.status !== 'PENDING') {
        throw new Error(`Cannot confirm shipment with status: ${shipment.status}`);
      }

      // 2. Collect all parts from boxes
      const allParts: Array<{
        partId: string;
        quantity: number;
        unitCost?: number;
      }> = [];

      for (const box of shipment.boxes) {
        for (const boxPart of box.boxParts) {
          const existingPart = allParts.find(p => p.partId === boxPart.partId);
          if (existingPart) {
            existingPart.quantity += boxPart.quantity;
          } else {
            allParts.push({
              partId: boxPart.partId,
              quantity: boxPart.quantity,
              unitCost: boxPart.part.costPrice || boxPart.part.price
            });
          }
        }
      }

      // 3. Process inventory deduction for each part
      for (const partData of allParts) {
        const brandInventory = await tx.brandInventory.findUnique({
          where: {
            brandId_partId: {
              brandId: shipment.brandId,
              partId: partData.partId
            }
          }
        });

        if (!brandInventory) {
          throw new Error(`No inventory record found for part ${partData.partId}`);
        }

        // Check if we have enough reserved + on-hand quantity
        if (brandInventory.onHandQuantity < partData.quantity) {
          throw new Error(`Insufficient inventory for part ${partData.partId}. Available: ${brandInventory.onHandQuantity}, Required: ${partData.quantity}`);
        }

        const newOnHandQuantity = brandInventory.onHandQuantity - partData.quantity;
        const newReservedQuantity = Math.max(0, brandInventory.reservedQuantity - partData.quantity);
        const newAvailableQuantity = newOnHandQuantity - newReservedQuantity;

        // Update brand inventory
        await tx.brandInventory.update({
          where: {
            brandId_partId: {
              brandId: shipment.brandId,
              partId: partData.partId
            }
          },
          data: {
            onHandQuantity: newOnHandQuantity,
            reservedQuantity: newReservedQuantity,
            availableQuantity: newAvailableQuantity,
            lastIssued: new Date(),
            lastUpdated: new Date()
          }
        });

        // Update main parts table for consistency
        await tx.part.update({
          where: { id: partData.partId },
          data: { stockQuantity: newOnHandQuantity }
        });

        // Update inventory ledger entry (change from reservation to actual transfer)
        const part = await tx.part.findUnique({
          where: { id: partData.partId },
          select: { code: true, name: true, partNumber: true }
        });

        await tx.inventoryLedger.create({
          data: {
            brandId: shipment.brandId,
            partId: partData.partId,
            partNumber: part?.partNumber || part?.code,
            actionType: 'TRANSFER_OUT',
            quantity: partData.quantity,
            source: 'BRAND',
            destination: shipment.recipientType || 'SERVICE_CENTER',
            shipmentId: shipment.id,
            referenceNote: `Confirmed shipment ${awbNumber || shipmentId} to ${shipment.recipientType}`,
            createdBy: 'SYSTEM',
            unitCost: partData.unitCost || 0,
            totalValue: (partData.unitCost || 0) * partData.quantity,
            balanceAfter: newOnHandQuantity
          }
        });
      }

      // 4. Update shipment status and details
      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'CONFIRMED',
          awbNumber,
          courierPartner,
          estimatedCost,
          actualCost,
          expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
          updatedAt: new Date()
        },
        include: {
          boxes: {
            include: {
              boxParts: {
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
              }
            }
          }
        }
      });

      // 5. Update box AWB numbers if provided
      if (awbNumber) {
        await tx.box.updateMany({
          where: { shipmentId },
          data: { awbNumber }
        });
      }

      return {
        shipment: updatedShipment,
        inventoryUpdates: allParts.map(part => ({
          partId: part.partId,
          quantityDeducted: part.quantity
        }))
      };
    });

    // Create notification for successful confirmation
    await prisma.notification.create({
      data: {
        type: 'SHIPMENT',
        title: 'Shipment Confirmed',
        message: `Shipment ${awbNumber || shipmentId} has been confirmed and inventory has been updated`,
        recipients: [result.shipment.brandId],
        data: JSON.stringify({
          shipmentId,
          awbNumber,
          inventoryUpdates: result.inventoryUpdates
        }),
        priority: 'MEDIUM'
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        shipment: result.shipment,
        inventoryUpdates: result.inventoryUpdates,
        message: 'Shipment confirmed successfully and inventory updated'
      }
    });

  } catch (error) {
    console.error('Error confirming shipment with inventory:', error);
    return res.status(500).json({ 
      error: 'Failed to confirm shipment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}