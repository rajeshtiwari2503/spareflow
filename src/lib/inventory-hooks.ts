import { prisma } from '@/lib/prisma';

interface ShipmentInventoryUpdate {
  brandId: string;
  shipmentId: string;
  parts: Array<{
    partId: string;
    quantity: number;
    unitCost?: number;
  }>;
  recipientType: 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  recipientId?: string;
}

interface ReverseShipmentUpdate {
  brandId: string;
  shipmentId?: string;
  partId: string;
  quantity: number;
  returnReason: 'DEFECTIVE' | 'WRONG_PART' | 'EXCESS_STOCK';
  sourceType: 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  sourceId?: string;
}

/**
 * Handle inventory deduction when a forward shipment is confirmed
 */
export async function handleShipmentInventoryOut(data: ShipmentInventoryUpdate) {
  try {
    await prisma.$transaction(async (tx) => {
      for (const partData of data.parts) {
        // Get current brand inventory
        const brandInventory = await tx.brandInventory.findUnique({
          where: {
            brandId_partId: {
              brandId: data.brandId,
              partId: partData.partId
            }
          }
        });

        if (!brandInventory) {
          throw new Error(`No inventory record found for part ${partData.partId}`);
        }

        if (brandInventory.onHandQuantity < partData.quantity) {
          throw new Error(`Insufficient inventory for part ${partData.partId}. Available: ${brandInventory.onHandQuantity}, Required: ${partData.quantity}`);
        }

        // Get part details
        const part = await tx.part.findUnique({
          where: { id: partData.partId },
          select: { code: true, name: true, partNumber: true, costPrice: true, price: true }
        });

        if (!part) {
          throw new Error(`Part ${partData.partId} not found`);
        }

        const newBalance = brandInventory.onHandQuantity - partData.quantity;
        const unitCost = partData.unitCost || brandInventory.averageCost || part.costPrice || part.price || 0;
        const totalValue = unitCost * partData.quantity;

        // Create ledger entry
        await tx.inventoryLedger.create({
          data: {
            brandId: data.brandId,
            partId: partData.partId,
            partNumber: part.partNumber || part.code,
            actionType: 'TRANSFER_OUT',
            quantity: partData.quantity,
            source: 'BRAND',
            destination: data.recipientType,
            shipmentId: data.shipmentId,
            referenceNote: `Shipment to ${data.recipientType}${data.recipientId ? ` (${data.recipientId})` : ''}`,
            createdBy: 'SYSTEM',
            unitCost,
            totalValue,
            balanceAfter: newBalance
          }
        });

        // Update brand inventory
        await tx.brandInventory.update({
          where: {
            brandId_partId: {
              brandId: data.brandId,
              partId: partData.partId
            }
          },
          data: {
            onHandQuantity: newBalance,
            availableQuantity: newBalance - brandInventory.reservedQuantity,
            lastIssued: new Date(),
            lastUpdated: new Date()
          }
        });

        // Update main parts table for consistency
        await tx.part.update({
          where: { id: partData.partId },
          data: { stockQuantity: newBalance }
        });
      }
    });

    console.log(`Inventory updated for shipment ${data.shipmentId}`);
    return { success: true };

  } catch (error) {
    console.error('Error updating shipment inventory:', error);
    throw error;
  }
}

/**
 * Handle inventory addition when a reverse shipment is received
 */
export async function handleReverseShipmentInventoryIn(data: ReverseShipmentUpdate) {
  try {
    await prisma.$transaction(async (tx) => {
      // Get current brand inventory
      let brandInventory = await tx.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId: data.brandId,
            partId: data.partId
          }
        }
      });

      // Get part details
      const part = await tx.part.findUnique({
        where: { id: data.partId },
        select: { code: true, name: true, partNumber: true, costPrice: true, price: true }
      });

      if (!part) {
        throw new Error(`Part ${data.partId} not found`);
      }

      const newBalance = (brandInventory?.onHandQuantity || 0) + data.quantity;
      const unitCost = brandInventory?.averageCost || part.costPrice || part.price || 0;
      const totalValue = unitCost * data.quantity;

      // Create ledger entry
      await tx.inventoryLedger.create({
        data: {
          brandId: data.brandId,
          partId: data.partId,
          partNumber: part.partNumber || part.code,
          actionType: 'REVERSE_IN',
          quantity: data.quantity,
          source: data.sourceType,
          destination: 'BRAND',
          shipmentId: data.shipmentId,
          referenceNote: `Reverse shipment from ${data.sourceType} - Reason: ${data.returnReason}${data.sourceId ? ` (${data.sourceId})` : ''}`,
          createdBy: 'SYSTEM',
          unitCost,
          totalValue,
          balanceAfter: newBalance
        }
      });

      // Update or create brand inventory
      const now = new Date();
      await tx.brandInventory.upsert({
        where: {
          brandId_partId: {
            brandId: data.brandId,
            partId: data.partId
          }
        },
        update: {
          onHandQuantity: newBalance,
          availableQuantity: newBalance - (brandInventory?.reservedQuantity || 0),
          lastRestocked: now,
          lastUpdated: now
        },
        create: {
          brandId: data.brandId,
          partId: data.partId,
          onHandQuantity: newBalance,
          availableQuantity: newBalance,
          reservedQuantity: 0,
          lastRestocked: now,
          lastUpdated: now,
          averageCost: unitCost,
          lastCost: unitCost
        }
      });

      // Update main parts table for consistency
      await tx.part.update({
        where: { id: data.partId },
        data: { stockQuantity: newBalance }
      });
    });

    console.log(`Reverse inventory updated for part ${data.partId}`);
    return { success: true };

  } catch (error) {
    console.error('Error updating reverse shipment inventory:', error);
    throw error;
  }
}

/**
 * Reserve inventory for pending shipments
 */
export async function reserveInventory(brandId: string, partId: string, quantity: number, shipmentId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const brandInventory = await tx.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId,
            partId
          }
        }
      });

      if (!brandInventory) {
        throw new Error(`No inventory record found for part ${partId}`);
      }

      const availableQuantity = brandInventory.onHandQuantity - brandInventory.reservedQuantity;
      if (availableQuantity < quantity) {
        throw new Error(`Insufficient available inventory. Available: ${availableQuantity}, Required: ${quantity}`);
      }

      // Update reserved quantity
      await tx.brandInventory.update({
        where: {
          brandId_partId: {
            brandId,
            partId
          }
        },
        data: {
          reservedQuantity: brandInventory.reservedQuantity + quantity,
          availableQuantity: brandInventory.availableQuantity - quantity,
          lastUpdated: new Date()
        }
      });

      // Create ledger entry for reservation
      const part = await tx.part.findUnique({
        where: { id: partId },
        select: { code: true, name: true, partNumber: true }
      });

      await tx.inventoryLedger.create({
        data: {
          brandId,
          partId,
          partNumber: part?.partNumber || part?.code,
          actionType: 'TRANSFER_OUT',
          quantity,
          source: 'BRAND',
          destination: 'SYSTEM',
          shipmentId,
          referenceNote: `Reserved for shipment ${shipmentId}`,
          createdBy: 'SYSTEM',
          balanceAfter: brandInventory.onHandQuantity // Balance doesn't change for reservations
        }
      });
    });

    return { success: true };

  } catch (error) {
    console.error('Error reserving inventory:', error);
    throw error;
  }
}

/**
 * Release reserved inventory (e.g., when shipment is cancelled)
 */
export async function releaseReservedInventory(brandId: string, partId: string, quantity: number, shipmentId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const brandInventory = await tx.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId,
            partId
          }
        }
      });

      if (!brandInventory) {
        throw new Error(`No inventory record found for part ${partId}`);
      }

      // Update reserved quantity
      await tx.brandInventory.update({
        where: {
          brandId_partId: {
            brandId,
            partId
          }
        },
        data: {
          reservedQuantity: Math.max(0, brandInventory.reservedQuantity - quantity),
          availableQuantity: brandInventory.availableQuantity + quantity,
          lastUpdated: new Date()
        }
      });

      // Create ledger entry for release
      const part = await tx.part.findUnique({
        where: { id: partId },
        select: { code: true, name: true, partNumber: true }
      });

      await tx.inventoryLedger.create({
        data: {
          brandId,
          partId,
          partNumber: part?.partNumber || part?.code,
          actionType: 'TRANSFER_IN',
          quantity,
          source: 'SYSTEM',
          destination: 'BRAND',
          shipmentId,
          referenceNote: `Released reservation for cancelled shipment ${shipmentId}`,
          createdBy: 'SYSTEM',
          balanceAfter: brandInventory.onHandQuantity // Balance doesn't change for releases
        }
      });
    });

    return { success: true };

  } catch (error) {
    console.error('Error releasing reserved inventory:', error);
    throw error;
  }
}

/**
 * Get inventory availability for a part
 */
export async function getInventoryAvailability(brandId: string, partId: string) {
  try {
    const brandInventory = await prisma.brandInventory.findUnique({
      where: {
        brandId_partId: {
          brandId,
          partId
        }
      },
      include: {
        part: {
          select: {
            code: true,
            name: true,
            minStockLevel: true,
            maxStockLevel: true
          }
        }
      }
    });

    if (!brandInventory) {
      return {
        available: false,
        onHand: 0,
        reserved: 0,
        available_quantity: 0,
        part: null
      };
    }

    return {
      available: brandInventory.availableQuantity > 0,
      onHand: brandInventory.onHandQuantity,
      reserved: brandInventory.reservedQuantity,
      available_quantity: brandInventory.availableQuantity,
      part: brandInventory.part
    };

  } catch (error) {
    console.error('Error getting inventory availability:', error);
    throw error;
  }
}