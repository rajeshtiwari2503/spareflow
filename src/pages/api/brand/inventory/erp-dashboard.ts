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
      // Get comprehensive ERP inventory data
      const [
        inventory,
        locations,
        suppliers,
        movements,
        alerts,
        analytics,
        forecasting,
        qualityControl,
        compliance
      ] = await Promise.all([
        // Enhanced inventory with all tracking fields
        prisma.brandInventory.findMany({
          where: { brandId: user.id },
          include: {
            part: {
              select: {
                id: true,
                code: true,
                name: true,
                partNumber: true,
                minStockLevel: true,
                maxStockLevel: true,
                reorderPoint: true,
                reorderQty: true,
                category: true,
                subCategory: true,
                price: true,
                weight: true,
                length: true,
                breadth: true,
                height: true,
                warranty: true,
                specifications: true,
                tags: true,
                status: true,
                featured: true,
                isActive: true,
                costPrice: true,
                sellingPrice: true,
                createdAt: true,
                updatedAt: true
              }
            }
          },
          orderBy: { lastUpdated: 'desc' }
        }),

        // Enhanced locations data with better mock structure
        Promise.resolve([
          {
            id: 'loc1',
            code: 'WH001',
            name: 'Main Warehouse',
            type: 'WAREHOUSE',
            zone: 'A',
            aisle: '01',
            rack: 'R1',
            shelf: 'S1',
            bin: 'B1',
            capacity: 1000,
            currentUtilization: 750,
            temperature: 25,
            humidity: 60,
            securityLevel: 'HIGH',
            accessRestricted: false,
            active: true,
            address: 'Main warehouse address, Industrial Area',
            coordinates: '28.7041,77.1025',
            manager: 'John Doe',
            contact: '+91-9876543210',
            notes: 'Primary storage location for all parts'
          },
          {
            id: 'loc2',
            code: 'ST001',
            name: 'Store Room',
            type: 'STORE',
            zone: 'B',
            aisle: '02',
            rack: 'R2',
            shelf: 'S2',
            bin: 'B2',
            capacity: 500,
            currentUtilization: 300,
            temperature: 22,
            humidity: 55,
            securityLevel: 'MEDIUM',
            accessRestricted: true,
            active: true,
            address: 'Store room, Ground floor',
            coordinates: '28.7041,77.1025',
            manager: 'Jane Smith',
            contact: '+91-9876543211',
            notes: 'Secondary storage for overflow items'
          },
          {
            id: 'loc3',
            code: 'QC001',
            name: 'Quality Control Area',
            type: 'QUARANTINE',
            zone: 'C',
            aisle: '03',
            rack: 'R3',
            shelf: 'S3',
            bin: 'B3',
            capacity: 100,
            currentUtilization: 25,
            temperature: 20,
            humidity: 50,
            securityLevel: 'HIGH',
            accessRestricted: true,
            active: true,
            address: 'QC Lab, First floor',
            coordinates: '28.7041,77.1025',
            manager: 'Quality Manager',
            contact: '+91-9876543212',
            notes: 'Quarantine area for quality inspection'
          }
        ]),

        // Enhanced suppliers data with comprehensive information
        Promise.resolve([
          {
            id: 'sup1',
            code: 'SUP001',
            name: 'Premium Parts Supplier',
            type: 'MANUFACTURER',
            rating: 4.5,
            reliability: 95,
            leadTime: 7,
            paymentTerms: 'NET30',
            currency: 'INR',
            taxId: 'GSTIN123456789',
            contact: {
              person: 'John Doe',
              email: 'john@premiumparts.com',
              phone: '+91-9876543210',
              address: '123 Industrial Area, Mumbai, Maharashtra 400001'
            },
            performance: {
              onTimeDelivery: 95,
              qualityRating: 4.5,
              priceCompetitiveness: 4.0,
              responsiveness: 4.2
            },
            certifications: ['ISO9001:2015', 'ISO14001:2015', 'OHSAS18001'],
            active: true
          },
          {
            id: 'sup2',
            code: 'SUP002',
            name: 'Quality Components Ltd',
            type: 'DISTRIBUTOR',
            rating: 4.2,
            reliability: 88,
            leadTime: 10,
            paymentTerms: 'NET45',
            currency: 'INR',
            taxId: 'GSTIN987654321',
            contact: {
              person: 'Jane Smith',
              email: 'jane@qualitycomp.com',
              phone: '+91-9876543211',
              address: '456 Business Park, Delhi, Delhi 110001'
            },
            performance: {
              onTimeDelivery: 88,
              qualityRating: 4.2,
              priceCompetitiveness: 4.3,
              responsiveness: 4.0
            },
            certifications: ['ISO9001:2015'],
            active: true
          },
          {
            id: 'sup3',
            code: 'SUP003',
            name: 'Fast Delivery Parts',
            type: 'WHOLESALER',
            rating: 3.8,
            reliability: 82,
            leadTime: 5,
            paymentTerms: 'NET15',
            currency: 'INR',
            taxId: 'GSTIN456789123',
            contact: {
              person: 'Mike Johnson',
              email: 'mike@fastdelivery.com',
              phone: '+91-9876543212',
              address: '789 Logistics Hub, Bangalore, Karnataka 560001'
            },
            performance: {
              onTimeDelivery: 82,
              qualityRating: 3.8,
              priceCompetitiveness: 4.5,
              responsiveness: 4.1
            },
            certifications: [],
            active: true
          }
        ]),

        // Recent movements from inventory ledger
        prisma.inventoryLedger.findMany({
          where: {
            brandId: user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            part: {
              select: {
                code: true,
                name: true,
                partNumber: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),

        // Generate alerts based on current inventory
        generateInventoryAlerts(user.id),

        // Generate analytics data
        generateAnalyticsData(user.id),

        // Generate forecasting data
        generateForecastingData(user.id),

        // Generate quality control data
        generateQualityData(user.id),

        // Generate compliance data
        generateComplianceData(user.id)
      ]);

      // Calculate summary statistics
      const summary = {
        totalParts: inventory.length,
        totalValue: inventory.reduce((sum, item) => 
          sum + (item.onHandQuantity * (item.part.price || 0)), 0
        ),
        lowStockItems: inventory.filter(item => 
          item.onHandQuantity <= (item.part.minStockLevel || 5)
        ).length,
        outOfStockItems: inventory.filter(item => 
          item.onHandQuantity === 0
        ).length,
        totalLocations: locations.length,
        totalSuppliers: suppliers.length,
        avgTurnoverRate: 3.2, // Mock calculation
        totalMovements: movements.length
      };

      // Transform inventory data to include enhanced fields with better logic
      const enhancedInventory = inventory.map((item, index) => {
        const locationIndex = index % locations.length;
        const supplierIndex = index % suppliers.length;
        const defectiveQty = Math.floor(item.onHandQuantity * (0.01 + Math.random() * 0.03)); // 1-4% defective
        const quarantineQty = Math.floor(item.onHandQuantity * (0.005 + Math.random() * 0.015)); // 0.5-2% quarantine
        const reservedQty = Math.floor(item.onHandQuantity * (Math.random() * 0.1)); // 0-10% reserved
        const inTransitQty = Math.floor(Math.random() * 20); // Random in-transit quantity
        
        return {
          id: item.id,
          partId: item.partId,
          locationId: locations[locationIndex].id,
          supplierId: suppliers[supplierIndex].id,
          onHandQuantity: item.onHandQuantity,
          availableQuantity: Math.max(0, item.onHandQuantity - defectiveQty - quarantineQty - reservedQty),
          reservedQuantity: reservedQty,
          allocatedQuantity: Math.floor(reservedQty * 0.8), // 80% of reserved is allocated
          inTransitQuantity: inTransitQty,
          defectiveQuantity: defectiveQty,
          quarantineQuantity: quarantineQty,
          lastRestocked: item.lastRestocked,
          lastIssued: item.lastIssued,
          lastCounted: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random last count within 30 days
          averageCost: item.averageCost || item.part.costPrice || item.part.price * 0.8,
          lastCost: item.lastCost || item.part.costPrice || item.part.price * 0.8,
          standardCost: item.part.costPrice || item.part.price * 0.8,
          fifoValue: item.onHandQuantity * (item.part.costPrice || item.part.price * 0.8),
          lifoValue: item.onHandQuantity * (item.part.costPrice || item.part.price * 0.85),
          weightedAvgCost: item.averageCost || item.part.costPrice || item.part.price * 0.82,
          part: {
            ...item.part,
            dimensions: item.part.length && item.part.breadth && item.part.height 
              ? `${item.part.length}x${item.part.breadth}x${item.part.height}cm`
              : null,
            serialized: item.part.price > 5000, // High-value items are serialized
            batchTracked: ['ELECTRONICS', 'AUTOMOTIVE'].includes(item.part.category?.toUpperCase() || ''),
            expiryTracked: ['CONSUMABLES', 'CHEMICALS'].includes(item.part.category?.toUpperCase() || ''),
            hazardous: item.part.name?.toLowerCase().includes('chemical') || false,
            controlled: item.part.price > 10000, // High-value items are controlled
            abc_classification: getABCClassification(item.onHandQuantity * item.part.price),
            xyz_classification: getXYZClassification(),
            leadTime: suppliers[supplierIndex].leadTime,
            shelfLife: ['CONSUMABLES'].includes(item.part.category?.toUpperCase() || '') ? 365 : null,
            storageConditions: item.part.category?.toLowerCase().includes('electronic') ? 'Dry, temperature controlled' : null
          },
          location: locations[locationIndex],
          supplier: suppliers[supplierIndex],
          batches: item.part.category?.toLowerCase().includes('electronic') ? [
            {
              id: `batch_${item.id}_1`,
              batchNumber: `B${Date.now().toString().slice(-6)}`,
              partId: item.partId,
              locationId: locations[locationIndex].id,
              quantity: Math.floor(item.onHandQuantity * 0.6),
              manufactureDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
              expiryDate: null,
              supplierId: suppliers[supplierIndex].id,
              qualityStatus: 'GOOD',
              notes: 'Primary batch'
            }
          ] : [],
          serials: item.part.price > 5000 ? Array.from({ length: Math.min(5, item.onHandQuantity) }, (_, i) => ({
            id: `serial_${item.id}_${i}`,
            serialNumber: `SN${Date.now().toString().slice(-8)}${i.toString().padStart(2, '0')}`,
            partId: item.partId,
            locationId: locations[locationIndex].id,
            status: 'AVAILABLE',
            manufactureDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
            warrantyExpiry: new Date(Date.now() + (365 + Math.random() * 365) * 24 * 60 * 60 * 1000).toISOString(),
            notes: `Serial item ${i + 1}`
          })) : []
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          summary,
          inventory: enhancedInventory,
          locations,
          suppliers,
          movements: movements.map(movement => ({
            id: movement.id,
            type: 'ISSUE', // Mock movement type
            subType: movement.actionType,
            partId: movement.partId,
            fromLocationId: 'loc1',
            toLocationId: 'loc2',
            quantity: movement.quantity,
            unitCost: movement.unitCost,
            totalValue: movement.totalValue,
            reason: movement.referenceNote || 'Stock movement',
            reference: movement.shipmentId,
            batchNumber: null,
            serialNumbers: [],
            expiryDate: null,
            qualityStatus: 'GOOD',
            approvedBy: movement.createdBy,
            performedBy: movement.createdBy || 'SYSTEM',
            timestamp: movement.createdAt,
            notes: movement.referenceNote,
            attachments: []
          })),
          alerts,
          analytics,
          forecasting,
          qualityControl,
          compliance
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('ERP dashboard error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions
function getABCClassification(value: number): 'A' | 'B' | 'C' {
  if (value > 10000) return 'A';
  if (value > 5000) return 'B';
  return 'C';
}

function getXYZClassification(): 'X' | 'Y' | 'Z' {
  const random = Math.random();
  if (random < 0.3) return 'X';
  if (random < 0.6) return 'Y';
  return 'Z';
}

async function generateInventoryAlerts(brandId: string) {
  const inventory = await prisma.brandInventory.findMany({
    where: { brandId },
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

  const alerts = [];

  for (const item of inventory) {
    if (item.onHandQuantity === 0) {
      alerts.push({
        id: `alert_${item.id}_out_of_stock`,
        type: 'OUT_OF_STOCK',
        severity: 'CRITICAL',
        partId: item.partId,
        locationId: 'loc1',
        title: `Out of Stock: ${item.part.code}`,
        description: `${item.part.name} is completely out of stock`,
        actionRequired: true,
        status: 'OPEN',
        createdAt: new Date().toISOString()
      });
    } else if (item.onHandQuantity <= item.part.minStockLevel) {
      alerts.push({
        id: `alert_${item.id}_low_stock`,
        type: 'LOW_STOCK',
        severity: 'HIGH',
        partId: item.partId,
        locationId: 'loc1',
        title: `Low Stock: ${item.part.code}`,
        description: `${item.part.name} is below minimum stock level (${item.onHandQuantity}/${item.part.minStockLevel})`,
        actionRequired: true,
        status: 'OPEN',
        createdAt: new Date().toISOString()
      });
    } else if (item.part.maxStockLevel && item.onHandQuantity > item.part.maxStockLevel) {
      alerts.push({
        id: `alert_${item.id}_overstock`,
        type: 'OVERSTOCK',
        severity: 'MEDIUM',
        partId: item.partId,
        locationId: 'loc1',
        title: `Overstock: ${item.part.code}`,
        description: `${item.part.name} exceeds maximum stock level (${item.onHandQuantity}/${item.part.maxStockLevel})`,
        actionRequired: false,
        status: 'OPEN',
        createdAt: new Date().toISOString()
      });
    }
  }

  return alerts;
}

async function generateAnalyticsData(brandId: string) {
  const inventory = await prisma.brandInventory.findMany({
    where: { brandId },
    include: {
      part: {
        select: {
          code: true,
          name: true,
          price: true,
          category: true,
          costPrice: true
        }
      }
    }
  });

  // ABC Analysis with proper calculation
  const abcAnalysis = inventory
    .map(item => ({
      partId: item.partId,
      partCode: item.part.code,
      partName: item.part.name,
      annualValue: item.onHandQuantity * item.part.price,
      classification: 'C' as 'A' | 'B' | 'C',
      percentage: 0,
      cumulativePercentage: 0
    }))
    .sort((a, b) => b.annualValue - a.annualValue);

  const totalValue = abcAnalysis.reduce((sum, item) => sum + item.annualValue, 0);
  let cumulativeValue = 0;

  abcAnalysis.forEach(item => {
    item.percentage = totalValue > 0 ? (item.annualValue / totalValue) * 100 : 0;
    cumulativeValue += item.annualValue;
    item.cumulativePercentage = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0;
    
    // Assign ABC classification based on cumulative percentage
    if (item.cumulativePercentage <= 80) {
      item.classification = 'A';
    } else if (item.cumulativePercentage <= 95) {
      item.classification = 'B';
    } else {
      item.classification = 'C';
    }
  });

  // Enhanced Turnover Analysis with realistic data
  const turnoverAnalysis = inventory.map(item => {
    const baseRate = item.part.category?.toLowerCase().includes('fast') ? 8 : 
                    item.part.category?.toLowerCase().includes('medium') ? 4 : 2;
    const turnoverRate = baseRate + (Math.random() - 0.5) * 2; // Add some variance
    
    let classification: 'FAST' | 'MEDIUM' | 'SLOW' | 'DEAD';
    if (turnoverRate >= 6) classification = 'FAST';
    else if (turnoverRate >= 3) classification = 'MEDIUM';
    else if (turnoverRate >= 1) classification = 'SLOW';
    else classification = 'DEAD';

    return {
      partId: item.partId,
      partCode: item.part.code,
      partName: item.part.name,
      turnoverRate: Math.max(0, turnoverRate),
      classification,
      daysOnHand: turnoverRate > 0 ? Math.floor(365 / turnoverRate) : 365,
      lastMovement: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
    };
  });

  // Enhanced XYZ Analysis
  const xyzAnalysis = inventory.map(item => {
    const baseVariability = item.part.category?.toLowerCase().includes('seasonal') ? 60 : 30;
    const demandVariability = baseVariability + (Math.random() - 0.5) * 40;
    
    let classification: 'X' | 'Y' | 'Z';
    if (demandVariability <= 20) classification = 'X';
    else if (demandVariability <= 50) classification = 'Y';
    else classification = 'Z';

    return {
      partId: item.partId,
      partCode: item.part.code,
      partName: item.part.name,
      demandVariability: Math.max(0, Math.min(100, demandVariability)),
      classification,
      forecastAccuracy: Math.max(50, 100 - demandVariability)
    };
  });

  // Enhanced Location Utilization
  const locationUtilization = [
    {
      locationId: 'loc1',
      locationCode: 'WH001',
      locationName: 'Main Warehouse',
      capacity: 1000,
      utilized: 750,
      utilizationPercentage: 75,
      efficiency: 85 + Math.random() * 10
    },
    {
      locationId: 'loc2',
      locationCode: 'ST001',
      locationName: 'Store Room',
      capacity: 500,
      utilized: 300,
      utilizationPercentage: 60,
      efficiency: 90 + Math.random() * 8
    },
    {
      locationId: 'loc3',
      locationCode: 'QC001',
      locationName: 'Quality Control Area',
      capacity: 100,
      utilized: 25,
      utilizationPercentage: 25,
      efficiency: 95 + Math.random() * 5
    }
  ];

  // Enhanced Supplier Performance
  const supplierPerformance = [
    {
      supplierId: 'sup1',
      supplierCode: 'SUP001',
      supplierName: 'Premium Parts Supplier',
      onTimeDelivery: 95 + Math.random() * 4,
      qualityRating: 4.5 + Math.random() * 0.4,
      priceVariance: 2.5 + Math.random() * 2,
      totalOrders: 25 + Math.floor(Math.random() * 20),
      totalValue: 150000 + Math.floor(Math.random() * 100000)
    },
    {
      supplierId: 'sup2',
      supplierCode: 'SUP002',
      supplierName: 'Quality Components Ltd',
      onTimeDelivery: 88 + Math.random() * 6,
      qualityRating: 4.2 + Math.random() * 0.5,
      priceVariance: 3.0 + Math.random() * 2,
      totalOrders: 18 + Math.floor(Math.random() * 15),
      totalValue: 120000 + Math.floor(Math.random() * 80000)
    },
    {
      supplierId: 'sup3',
      supplierCode: 'SUP003',
      supplierName: 'Fast Delivery Parts',
      onTimeDelivery: 82 + Math.random() * 8,
      qualityRating: 3.8 + Math.random() * 0.6,
      priceVariance: 4.5 + Math.random() * 2,
      totalOrders: 30 + Math.floor(Math.random() * 25),
      totalValue: 90000 + Math.floor(Math.random() * 60000)
    }
  ];

  return {
    turnoverAnalysis,
    abcAnalysis,
    xyzAnalysis,
    locationUtilization,
    supplierPerformance
  };
}

async function generateForecastingData(brandId: string) {
  const inventory = await prisma.brandInventory.findMany({
    where: { brandId },
    include: {
      part: {
        select: {
          code: true,
          name: true,
          minStockLevel: true,
          reorderPoint: true,
          reorderQty: true,
          category: true,
          price: true
        }
      }
    }
  });

  // Enhanced demand forecast with realistic patterns
  const demandForecast = inventory.map(item => {
    const baseDemand = item.part.minStockLevel || 10;
    const seasonalMultiplier = item.part.category?.toLowerCase().includes('seasonal') ? 1.5 : 1.0;
    const forecastedDemand = Math.floor(baseDemand * seasonalMultiplier * (0.8 + Math.random() * 0.4));
    const confidence = item.onHandQuantity > 0 ? 75 + Math.random() * 20 : 60 + Math.random() * 15;
    
    const methods = ['EXPONENTIAL_SMOOTHING', 'MOVING_AVERAGE', 'LINEAR_REGRESSION', 'SEASONAL_DECOMPOSITION'];
    const trends = ['INCREASING', 'DECREASING', 'STABLE'] as const;
    
    return {
      partId: item.partId,
      partCode: item.part.code,
      partName: item.part.name,
      currentStock: item.onHandQuantity,
      forecastedDemand,
      recommendedOrder: Math.max(0, forecastedDemand - item.onHandQuantity + (item.part.minStockLevel || 10)),
      confidence,
      method: methods[Math.floor(Math.random() * methods.length)],
      seasonality: item.part.category?.toLowerCase().includes('seasonal') || Math.random() > 0.7,
      trend: trends[Math.floor(Math.random() * trends.length)]
    };
  });

  // Enhanced reorder recommendations with better logic
  const reorderRecommendations = inventory
    .filter(item => {
      const reorderPoint = item.part.reorderPoint || item.part.minStockLevel || 5;
      return item.onHandQuantity <= reorderPoint;
    })
    .map(item => {
      const reorderPoint = item.part.reorderPoint || item.part.minStockLevel || 5;
      const recommendedQty = item.part.reorderQty || Math.max(50, reorderPoint * 3);
      
      let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (item.onHandQuantity === 0) {
        urgency = 'CRITICAL';
      } else if (item.onHandQuantity <= reorderPoint * 0.3) {
        urgency = 'HIGH';
      } else if (item.onHandQuantity <= reorderPoint * 0.6) {
        urgency = 'MEDIUM';
      } else {
        urgency = 'LOW';
      }

      // Calculate estimated stockout based on average consumption
      const avgDailyConsumption = Math.max(1, (item.part.minStockLevel || 5) / 30);
      const daysToStockout = item.onHandQuantity > 0 ? Math.floor(item.onHandQuantity / avgDailyConsumption) : 0;
      const estimatedStockout = new Date(Date.now() + daysToStockout * 24 * 60 * 60 * 1000);

      return {
        partId: item.partId,
        partCode: item.part.code,
        partName: item.part.name,
        currentStock: item.onHandQuantity,
        reorderPoint,
        recommendedQty,
        urgency,
        estimatedStockout: estimatedStockout.toISOString(),
        preferredSupplier: item.part.price > 1000 ? 'Premium Parts Supplier' : 'Fast Delivery Parts'
      };
    })
    .sort((a, b) => {
      const urgencyOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });

  // Enhanced seasonal patterns with realistic data
  const seasonalPatterns = inventory.slice(0, 8).map(item => {
    const isSeasonalPart = item.part.category?.toLowerCase().includes('seasonal') || 
                          item.part.name?.toLowerCase().includes('summer') ||
                          item.part.name?.toLowerCase().includes('winter');
    
    let seasonalIndex: number[];
    let peakMonth: number;
    let lowMonth: number;
    
    if (isSeasonalPart) {
      // Create realistic seasonal pattern
      seasonalIndex = Array.from({ length: 12 }, (_, month) => {
        if (item.part.name?.toLowerCase().includes('summer')) {
          // Summer peak (May-August)
          return month >= 4 && month <= 7 ? 1.2 + Math.random() * 0.3 : 0.7 + Math.random() * 0.2;
        } else if (item.part.name?.toLowerCase().includes('winter')) {
          // Winter peak (November-February)
          return (month >= 10 || month <= 1) ? 1.2 + Math.random() * 0.3 : 0.7 + Math.random() * 0.2;
        } else {
          // General seasonal pattern
          return 0.8 + Math.sin((month * Math.PI) / 6) * 0.3 + Math.random() * 0.1;
        }
      });
      peakMonth = seasonalIndex.indexOf(Math.max(...seasonalIndex)) + 1;
      lowMonth = seasonalIndex.indexOf(Math.min(...seasonalIndex)) + 1;
    } else {
      // Non-seasonal parts have relatively stable demand
      seasonalIndex = Array.from({ length: 12 }, () => 0.9 + Math.random() * 0.2);
      peakMonth = Math.floor(Math.random() * 12) + 1;
      lowMonth = Math.floor(Math.random() * 12) + 1;
    }

    return {
      partId: item.partId,
      partCode: item.part.code,
      partName: item.part.name,
      seasonalIndex,
      peakMonth,
      lowMonth,
      volatility: isSeasonalPart ? 30 + Math.random() * 40 : 10 + Math.random() * 20
    };
  });

  return {
    demandForecast,
    reorderRecommendations,
    seasonalPatterns
  };
}

async function generateQualityData(brandId: string) {
  return {
    qualityMetrics: {
      totalInspections: 1250,
      passRate: 96.5,
      defectRate: 2.1,
      quarantineRate: 1.4,
      reworkRate: 0.8,
      scrapRate: 0.3
    },
    defectAnalysis: [
      {
        partId: 'part1',
        partCode: 'P001',
        partName: 'Sample Part',
        defectCount: 5,
        defectRate: 2.1,
        defectTypes: ['Dimensional', 'Surface'],
        rootCauses: ['Material variance', 'Process deviation'],
        corrective_actions: ['Supplier audit', 'Process improvement']
      }
    ],
    supplierQuality: [
      {
        supplierId: 'sup1',
        supplierCode: 'SUP001',
        supplierName: 'Premium Parts Supplier',
        qualityScore: 4.5,
        defectRate: 1.8,
        rejectionRate: 0.5,
        certificationStatus: 'ISO9001:2015',
        lastAudit: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };
}

async function generateComplianceData(brandId: string) {
  return {
    regulations: [
      {
        id: 'reg1',
        name: 'ISO 9001:2015',
        type: 'Quality Management',
        status: 'COMPLIANT',
        lastReview: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        nextReview: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000).toISOString(),
        responsible: 'Quality Manager'
      }
    ],
    certifications: [
      {
        id: 'cert1',
        name: 'ISO 9001:2015',
        issuer: 'Bureau Veritas',
        issueDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'VALID',
        scope: 'Quality Management System',
        attachments: []
      }
    ],
    auditTrail: [
      {
        id: 'audit1',
        action: 'INVENTORY_UPDATE',
        entity: 'PART',
        entityId: 'part1',
        performedBy: 'System',
        timestamp: new Date().toISOString(),
        changes: 'Stock quantity updated',
        reason: 'Shipment creation'
      }
    ]
  };
}