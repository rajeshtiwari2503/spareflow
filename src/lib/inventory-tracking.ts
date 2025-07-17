import { prisma } from '@/lib/prisma';

interface InventoryUpdateParams {
  brandId: string;
  partId: string;
  quantity: number;
  actionType: 'ADD' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'REVERSE_IN' | 'REVERSE_OUT' | 'CONSUMED';
  source: string;
  destination: string;
  shipmentId?: string;
  referenceNote?: string;
  createdBy?: string;
  unitCost?: number;
}

export class InventoryTracker {
  /**
   * Update brand inventory and create ledger entry
   */
  static async updateInventory(params: InventoryUpdateParams) {
    const {
      brandId,
      partId,
      quantity,
      actionType,
      source,
      destination,
      shipmentId,
      referenceNote,
      createdBy,
      unitCost
    } = params;

    // Get current brand inventory
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
        throw new Error('Invalid action type');
    }

    // Get part details for ledger
    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: { code: true, partNumber: true }
    });

    // Create ledger entry and update inventory in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create ledger entry
      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          brandId,
          partId,
          partNumber: part?.partNumber || part?.code,
          actionType,
          quantity,
          source,
          destination,
          shipmentId,
          referenceNote,
          createdBy,
          unitCost,
          totalValue: unitCost ? unitCost * quantity : null,
          balanceAfter: newBalance
        }
      });

      // Update or create brand inventory
      const updatedInventory = await tx.brandInventory.upsert({
        where: {
          brandId_partId: {
            brandId,
            partId
          }
        },
        update: {
          onHandQuantity: newBalance,
          availableQuantity: newBalance, // Will be adjusted for reservations separately
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

      return { ledgerEntry, updatedInventory };
    });

    return result;
  }

  /**
   * Handle shipment creation - deduct inventory
   */
  static async handleShipmentCreation(shipmentId: string, brandId: string, parts: Array<{ partId: string; quantity: number }>) {
    const results = [];

    for (const part of parts) {
      try {
        const result = await this.updateInventory({
          brandId,
          partId: part.partId,
          quantity: part.quantity,
          actionType: 'TRANSFER_OUT',
          source: 'BRAND',
          destination: 'SERVICE_CENTER', // or DISTRIBUTOR based on shipment type
          shipmentId,
          referenceNote: `Shipment created - AWB pending`,
          createdBy: 'SYSTEM'
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to update inventory for part ${part.partId}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Handle reverse shipment receipt - add inventory back
   */
  static async handleReverseShipmentReceipt(shipmentId: string, brandId: string, parts: Array<{ partId: string; quantity: number }>) {
    const results = [];

    for (const part of parts) {
      try {
        const result = await this.updateInventory({
          brandId,
          partId: part.partId,
          quantity: part.quantity,
          actionType: 'REVERSE_IN',
          source: 'SERVICE_CENTER', // or DISTRIBUTOR
          destination: 'BRAND',
          shipmentId,
          referenceNote: `Reverse shipment received`,
          createdBy: 'SYSTEM'
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to update inventory for reverse part ${part.partId}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Handle manual stock addition
   */
  static async addStock(brandId: string, partId: string, quantity: number, unitCost?: number, notes?: string, createdBy?: string) {
    return this.updateInventory({
      brandId,
      partId,
      quantity,
      actionType: 'ADD',
      source: 'SYSTEM',
      destination: 'BRAND',
      referenceNote: notes || 'Manual stock addition',
      createdBy,
      unitCost
    });
  }

  /**
   * Handle stock consumption/scrap
   */
  static async consumeStock(brandId: string, partId: string, quantity: number, reason?: string, createdBy?: string) {
    return this.updateInventory({
      brandId,
      partId,
      quantity,
      actionType: 'CONSUMED',
      source: 'BRAND',
      destination: 'SYSTEM',
      referenceNote: reason || 'Stock consumed/scrapped',
      createdBy
    });
  }

  /**
   * Get inventory summary for a brand
   */
  static async getInventorySummary(brandId: string) {
    const [inventory, recentMovements, lowStockAlerts] = await Promise.all([
      // Current inventory
      prisma.brandInventory.findMany({
        where: { brandId },
        include: {
          part: {
            select: {
              code: true,
              name: true,
              partNumber: true,
              minStockLevel: true,
              price: true
            }
          }
        }
      }),

      // Recent movements (last 30 days)
      prisma.inventoryLedger.findMany({
        where: {
          brandId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
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
        orderBy: { createdAt: 'desc' },
        take: 50
      }),

      // Low stock alerts
      prisma.brandInventory.findMany({
        where: {
          brandId,
          onHandQuantity: {
            lte: 10 // Configurable threshold
          }
        },
        include: {
          part: {
            select: {
              code: true,
              name: true,
              minStockLevel: true
            }
          }
        }
      })
    ]);

    const summary = {
      totalParts: inventory.length,
      totalValue: inventory.reduce((sum, item) => sum + (item.onHandQuantity * (item.part.price || 0)), 0),
      lowStockItems: lowStockAlerts.length,
      outOfStockItems: inventory.filter(item => item.onHandQuantity === 0).length
    };

    return {
      summary,
      inventory,
      recentMovements,
      lowStockAlerts
    };
  }

  /**
   * Check if sufficient inventory is available
   */
  static async checkInventoryAvailability(brandId: string, parts: Array<{ partId: string; quantity: number }>) {
    const results = [];

    for (const part of parts) {
      const inventory = await prisma.brandInventory.findUnique({
        where: {
          brandId_partId: {
            brandId,
            partId: part.partId
          }
        },
        include: {
          part: {
            select: {
              code: true,
              name: true
            }
          }
        }
      });

      const available = inventory?.availableQuantity || 0;
      const sufficient = available >= part.quantity;

      results.push({
        partId: part.partId,
        partCode: inventory?.part.code,
        partName: inventory?.part.name,
        requested: part.quantity,
        available,
        sufficient
      });
    }

    return results;
  }
}