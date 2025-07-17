import { prisma } from '@/lib/prisma';

export interface ERPInventoryUpdateParams {
  brandId: string;
  partId: string;
  quantity: number;
  actionType: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'SCRAP' | 'CYCLE_COUNT';
  subType?: string;
  fromLocationId?: string;
  toLocationId?: string;
  unitCost?: number;
  totalValue?: number;
  reason: string;
  reference?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  expiryDate?: Date;
  qualityStatus?: 'GOOD' | 'DEFECTIVE' | 'QUARANTINE' | 'EXPIRED' | 'DAMAGED';
  performedBy: string;
  approvedBy?: string;
  notes?: string;
  attachments?: string[];
}

export interface LocationParams {
  code: string;
  name: string;
  type: 'WAREHOUSE' | 'STORE' | 'PRODUCTION' | 'QUARANTINE' | 'TRANSIT' | 'CUSTOMER' | 'SUPPLIER';
  parentId?: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  temperature?: number;
  humidity?: number;
  securityLevel?: string;
  accessRestricted?: boolean;
  address?: string;
  coordinates?: string;
  manager?: string;
  contact?: string;
  notes?: string;
}

export interface SupplierParams {
  code: string;
  name: string;
  type: 'MANUFACTURER' | 'DISTRIBUTOR' | 'WHOLESALER' | 'RETAILER' | 'SERVICE_PROVIDER';
  rating?: number;
  reliability?: number;
  leadTime?: number;
  paymentTerms?: string;
  currency?: string;
  taxId?: string;
  contact: {
    person: string;
    email: string;
    phone: string;
    address: string;
  };
  performance?: {
    onTimeDelivery: number;
    qualityRating: number;
    priceCompetitiveness: number;
    responsiveness: number;
  };
  certifications?: string[];
}

export interface BatchParams {
  batchNumber: string;
  partId: string;
  locationId: string;
  quantity: number;
  manufactureDate?: Date;
  expiryDate?: Date;
  supplierId?: string;
  purchaseOrderId?: string;
  qualityStatus?: 'GOOD' | 'DEFECTIVE' | 'QUARANTINE' | 'EXPIRED' | 'DAMAGED';
  certifications?: string[];
  testResults?: string;
  notes?: string;
}

export interface SerialParams {
  serialNumber: string;
  partId: string;
  locationId: string;
  batchId?: string;
  manufactureDate?: Date;
  warrantyExpiry?: Date;
  notes?: string;
}

export class ERPInventoryManager {
  /**
   * Record comprehensive inventory movement with full traceability
   */
  static async recordMovement(params: ERPInventoryUpdateParams) {
    const {
      brandId,
      partId,
      quantity,
      actionType,
      subType,
      fromLocationId,
      toLocationId,
      unitCost,
      totalValue,
      reason,
      reference,
      batchNumber,
      serialNumbers,
      expiryDate,
      qualityStatus,
      performedBy,
      approvedBy,
      notes,
      attachments
    } = params;

    // Validate part exists and belongs to brand
    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: { id: true, brandId: true, code: true, partNumber: true }
    });

    if (!part || part.brandId !== brandId) {
      throw new Error('Part not found or access denied');
    }

    // Convert movement type to ledger action type
    const ledgerActionType = this.convertToLedgerActionType(actionType, fromLocationId, toLocationId);
    const source = this.determineSource(actionType, fromLocationId);
    const destination = this.determineDestination(actionType, toLocationId);

    // Get current inventory to calculate new balance
    const currentInventory = await prisma.brandInventory.findUnique({
      where: {
        brandId_partId: {
          brandId,
          partId
        }
      }
    });

    const currentBalance = currentInventory?.onHandQuantity || 0;
    let newBalance = currentBalance;

    // Calculate new balance based on movement type
    switch (ledgerActionType) {
      case 'ADD':
      case 'TRANSFER_IN':
      case 'REVERSE_IN':
        newBalance = currentBalance + quantity;
        break;
      case 'TRANSFER_OUT':
      case 'REVERSE_OUT':
      case 'CONSUMED':
        newBalance = currentBalance - quantity;
        if (newBalance < 0) {
          throw new Error(`Insufficient inventory. Available: ${currentBalance}, Requested: ${quantity}`);
        }
        break;
      default:
        // For adjustments, the quantity could be positive or negative
        newBalance = currentBalance + quantity;
        if (newBalance < 0) {
          throw new Error(`Invalid adjustment. Would result in negative inventory: ${newBalance}`);
        }
    }

    // Execute transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create inventory ledger entry
      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          brandId,
          partId,
          partNumber: part.partNumber || part.code,
          actionType: ledgerActionType,
          quantity,
          source,
          destination,
          referenceNote: notes || reason,
          createdBy: performedBy,
          unitCost,
          totalValue: totalValue || (unitCost ? unitCost * quantity : null),
          balanceAfter: newBalance
        }
      });

      // Update brand inventory
      const updatedInventory = await tx.brandInventory.upsert({
        where: {
          brandId_partId: {
            brandId,
            partId
          }
        },
        update: {
          onHandQuantity: newBalance,
          availableQuantity: newBalance, // Would be adjusted for reservations
          lastUpdated: new Date(),
          ...(ledgerActionType === 'ADD' && { lastRestocked: new Date() }),
          ...(ledgerActionType.includes('OUT') || ledgerActionType === 'CONSUMED' && { lastIssued: new Date() }),
          ...(unitCost && { lastCost: unitCost })
        },
        create: {
          brandId,
          partId,
          onHandQuantity: newBalance,
          availableQuantity: newBalance,
          lastRestocked: ledgerActionType === 'ADD' ? new Date() : null,
          lastIssued: (ledgerActionType.includes('OUT') || ledgerActionType === 'CONSUMED') ? new Date() : null,
          lastCost: unitCost
        }
      });

      // Create activity log entry for audit trail
      await tx.activityLog.create({
        data: {
          userId: performedBy,
          action: `INVENTORY_${actionType}`,
          details: JSON.stringify({
            partId,
            partCode: part.code,
            quantity,
            actionType,
            reason,
            reference,
            fromLocationId,
            toLocationId,
            batchNumber,
            serialNumbers,
            qualityStatus,
            previousBalance: currentBalance,
            newBalance
          })
        }
      });

      return { ledgerEntry, updatedInventory };
    });

    return result;
  }

  /**
   * Perform ABC analysis on inventory
   */
  static async performABCAnalysis(brandId: string) {
    const inventory = await prisma.brandInventory.findMany({
      where: { brandId },
      include: {
        part: {
          select: {
            code: true,
            name: true,
            price: true
          }
        }
      }
    });

    // Calculate annual value for each part
    const partsWithValue = inventory.map(item => ({
      partId: item.partId,
      partCode: item.part.code,
      partName: item.part.name,
      annualValue: item.onHandQuantity * item.part.price,
      onHandQuantity: item.onHandQuantity
    }));

    // Sort by annual value descending
    partsWithValue.sort((a, b) => b.annualValue - a.annualValue);

    const totalValue = partsWithValue.reduce((sum, item) => sum + item.annualValue, 0);
    let cumulativeValue = 0;

    // Classify parts into A, B, C categories
    const abcAnalysis = partsWithValue.map(item => {
      cumulativeValue += item.annualValue;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;
      
      let classification: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        ...item,
        percentage: (item.annualValue / totalValue) * 100,
        cumulativePercentage,
        classification
      };
    });

    return abcAnalysis;
  }

  /**
   * Perform XYZ analysis based on demand variability
   */
  static async performXYZAnalysis(brandId: string) {
    // Get movement data for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const movements = await prisma.inventoryLedger.findMany({
      where: {
        brandId,
        createdAt: { gte: twelveMonthsAgo },
        actionType: { in: ['TRANSFER_OUT', 'CONSUMED'] }
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

    // Group movements by part and calculate demand variability
    const partMovements = movements.reduce((acc, movement) => {
      if (!acc[movement.partId]) {
        acc[movement.partId] = {
          partId: movement.partId,
          partCode: movement.part.code,
          partName: movement.part.name,
          movements: []
        };
      }
      acc[movement.partId].movements.push({
        quantity: movement.quantity,
        date: movement.createdAt
      });
      return acc;
    }, {} as any);

    // Calculate XYZ classification
    const xyzAnalysis = Object.values(partMovements).map((partData: any) => {
      const quantities = partData.movements.map((m: any) => m.quantity);
      const mean = quantities.reduce((sum: number, q: number) => sum + q, 0) / quantities.length;
      const variance = quantities.reduce((sum: number, q: number) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? (standardDeviation / mean) * 100 : 0;

      let classification: 'X' | 'Y' | 'Z';
      if (coefficientOfVariation <= 20) {
        classification = 'X'; // Low variability
      } else if (coefficientOfVariation <= 50) {
        classification = 'Y'; // Medium variability
      } else {
        classification = 'Z'; // High variability
      }

      return {
        partId: partData.partId,
        partCode: partData.partCode,
        partName: partData.partName,
        demandVariability: coefficientOfVariation,
        classification,
        forecastAccuracy: 100 - Math.min(coefficientOfVariation, 100) // Simplified forecast accuracy
      };
    });

    return xyzAnalysis;
  }

  /**
   * Generate reorder recommendations
   */
  static async generateReorderRecommendations(brandId: string) {
    const inventory = await prisma.brandInventory.findMany({
      where: { brandId },
      include: {
        part: {
          select: {
            code: true,
            name: true,
            minStockLevel: true,
            reorderPoint: true,
            reorderQty: true
          }
        }
      }
    });

    const recommendations = inventory
      .filter(item => {
        const reorderPoint = item.part.reorderPoint || item.part.minStockLevel;
        return item.onHandQuantity <= reorderPoint;
      })
      .map(item => {
        const reorderPoint = item.part.reorderPoint || item.part.minStockLevel;
        const recommendedQty = item.part.reorderQty || Math.max(50, reorderPoint * 2);
        
        let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (item.onHandQuantity === 0) {
          urgency = 'CRITICAL';
        } else if (item.onHandQuantity <= reorderPoint * 0.5) {
          urgency = 'HIGH';
        } else if (item.onHandQuantity <= reorderPoint * 0.75) {
          urgency = 'MEDIUM';
        } else {
          urgency = 'LOW';
        }

        // Estimate stockout date based on average consumption
        const estimatedDaysToStockout = this.estimateStockoutDays(item.onHandQuantity, item.partId);
        const estimatedStockout = new Date();
        estimatedStockout.setDate(estimatedStockout.getDate() + estimatedDaysToStockout);

        return {
          partId: item.partId,
          partCode: item.part.code,
          partName: item.part.name,
          currentStock: item.onHandQuantity,
          reorderPoint,
          recommendedQty,
          urgency,
          estimatedStockout: estimatedStockout.toISOString(),
          preferredSupplier: 'Premium Parts Supplier' // Would be determined from supplier data
        };
      });

    return recommendations;
  }

  /**
   * Calculate inventory turnover rate
   */
  static async calculateTurnoverRate(brandId: string, partId?: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = {
      brandId,
      createdAt: { gte: thirtyDaysAgo },
      actionType: { in: ['TRANSFER_OUT', 'CONSUMED'] }
    };

    if (partId) {
      where.partId = partId;
    }

    const movements = await prisma.inventoryLedger.findMany({
      where,
      include: {
        part: {
          select: {
            code: true,
            name: true
          }
        }
      }
    });

    // Group by part and calculate turnover
    const turnoverData = movements.reduce((acc, movement) => {
      if (!acc[movement.partId]) {
        acc[movement.partId] = {
          partId: movement.partId,
          partCode: movement.part.code,
          partName: movement.part.name,
          totalIssued: 0,
          lastMovement: movement.createdAt
        };
      }
      acc[movement.partId].totalIssued += movement.quantity;
      if (movement.createdAt > acc[movement.partId].lastMovement) {
        acc[movement.partId].lastMovement = movement.createdAt;
      }
      return acc;
    }, {} as any);

    // Get current inventory for turnover calculation
    const currentInventory = await prisma.brandInventory.findMany({
      where: {
        brandId,
        ...(partId && { partId })
      }
    });

    const turnoverAnalysis = Object.values(turnoverData).map((data: any) => {
      const inventory = currentInventory.find(inv => inv.partId === data.partId);
      const avgInventory = inventory ? inventory.onHandQuantity : 0;
      const turnoverRate = avgInventory > 0 ? (data.totalIssued * 12) / avgInventory : 0; // Annualized
      const daysOnHand = turnoverRate > 0 ? 365 / turnoverRate : 365;

      let classification: 'FAST' | 'MEDIUM' | 'SLOW' | 'DEAD';
      if (turnoverRate >= 6) {
        classification = 'FAST';
      } else if (turnoverRate >= 3) {
        classification = 'MEDIUM';
      } else if (turnoverRate >= 1) {
        classification = 'SLOW';
      } else {
        classification = 'DEAD';
      }

      return {
        partId: data.partId,
        partCode: data.partCode,
        partName: data.partName,
        turnoverRate,
        classification,
        daysOnHand: Math.round(daysOnHand),
        lastMovement: data.lastMovement.toISOString()
      };
    });

    return turnoverAnalysis;
  }

  /**
   * Generate quality control metrics
   */
  static async generateQualityMetrics(brandId: string) {
    // This would integrate with actual quality control data
    // For now, return mock data based on inventory movements
    const movements = await prisma.inventoryLedger.findMany({
      where: {
        brandId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const totalMovements = movements.length;
    const mockDefectRate = 2.1; // 2.1% defect rate
    const mockQuarantineRate = 1.4; // 1.4% quarantine rate

    return {
      qualityMetrics: {
        totalInspections: totalMovements,
        passRate: 100 - mockDefectRate - mockQuarantineRate,
        defectRate: mockDefectRate,
        quarantineRate: mockQuarantineRate,
        reworkRate: 0.8,
        scrapRate: 0.3
      }
    };
  }

  // Helper methods
  private static convertToLedgerActionType(
    movementType: string, 
    fromLocationId?: string, 
    toLocationId?: string
  ): string {
    switch (movementType) {
      case 'RECEIPT':
        return 'ADD';
      case 'ISSUE':
        return 'TRANSFER_OUT';
      case 'TRANSFER':
        return fromLocationId && toLocationId ? 'TRANSFER_OUT' : 'TRANSFER_IN';
      case 'ADJUSTMENT':
        return 'ADD'; // Could be ADD or CONSUMED based on quantity
      case 'RETURN':
        return 'REVERSE_IN';
      case 'SCRAP':
        return 'CONSUMED';
      case 'CYCLE_COUNT':
        return 'ADD'; // Adjustment based on count
      default:
        return 'ADD';
    }
  }

  private static determineSource(movementType: string, fromLocationId?: string): string {
    switch (movementType) {
      case 'RECEIPT':
        return 'SUPPLIER';
      case 'ISSUE':
      case 'TRANSFER':
      case 'SCRAP':
        return 'BRAND';
      case 'RETURN':
        return 'SERVICE_CENTER';
      case 'ADJUSTMENT':
      case 'CYCLE_COUNT':
        return 'SYSTEM';
      default:
        return 'SYSTEM';
    }
  }

  private static determineDestination(movementType: string, toLocationId?: string): string {
    switch (movementType) {
      case 'RECEIPT':
      case 'RETURN':
      case 'ADJUSTMENT':
      case 'CYCLE_COUNT':
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

  private static estimateStockoutDays(currentStock: number, partId: string): number {
    // Simplified calculation - would use historical consumption data
    const avgDailyConsumption = 2; // Mock average daily consumption
    return currentStock > 0 ? Math.floor(currentStock / avgDailyConsumption) : 0;
  }
}