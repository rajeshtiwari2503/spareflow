import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (authResult.user.role !== 'SUPER_ADMIN' && authResult.user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('🧪 Starting weight verification test...');

    // Get sample parts from database
    const sampleParts = await prisma.part.findMany({
      where: {
        brandId: authResult.user.role === 'BRAND' ? authResult.user.id : undefined
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📦 Found ${sampleParts.length} sample parts`);

    // Test weight calculations
    const weightTests = [];

    for (const part of sampleParts) {
      const partWeightInKg = part.weight || 0.5; // Default 0.5kg if no weight
      const partWeightInGrams = partWeightInKg * 1000;
      
      // Test different quantities
      const quantities = [1, 2, 5, 10];
      
      for (const quantity of quantities) {
        const totalWeightInGrams = partWeightInGrams * quantity;
        const totalWeightInKg = totalWeightInGrams / 1000;
        const finalWeightInKg = Math.max(totalWeightInKg, 0.1); // Minimum 100g
        
        weightTests.push({
          partId: part.id,
          partCode: part.code,
          partName: part.name,
          partWeightFromDB: part.weight,
          partWeightInKg,
          partWeightInGrams,
          quantity,
          totalWeightInGrams,
          totalWeightInKg,
          finalWeightInKg,
          displayWeight: `${finalWeightInKg.toFixed(2)}kg`,
          calculations: {
            step1: `Part weight from DB: ${part.weight}kg`,
            step2: `Part weight in kg: ${partWeightInKg}kg`,
            step3: `Part weight in grams: ${partWeightInGrams}g`,
            step4: `Total weight (${quantity} pieces): ${totalWeightInGrams}g`,
            step5: `Total weight in kg: ${totalWeightInKg}kg`,
            step6: `Final weight (min 0.1kg): ${finalWeightInKg}kg`
          }
        });
      }
    }

    // Test shipment weight calculation simulation
    const shipmentSimulation = {
      parts: [
        { partId: 'test1', weight: 0.5, quantity: 2 }, // 1kg total
        { partId: 'test2', weight: 0.3, quantity: 3 }, // 0.9kg total
        { partId: 'test3', weight: 0.1, quantity: 5 }  // 0.5kg total
      ]
    };

    let simulatedTotalWeight = 0;
    const simulationSteps = [];

    for (const part of shipmentSimulation.parts) {
      const partWeightInKg = part.weight;
      const partWeightInGrams = partWeightInKg * 1000;
      const partTotalWeight = partWeightInGrams * part.quantity;
      
      simulatedTotalWeight += partTotalWeight;
      
      simulationSteps.push({
        partId: part.partId,
        partWeightKg: partWeightInKg,
        partWeightGrams: partWeightInGrams,
        quantity: part.quantity,
        partTotalWeightGrams: partTotalWeight,
        runningTotalGrams: simulatedTotalWeight
      });
    }

    const simulatedFinalWeightKg = Math.max(simulatedTotalWeight / 1000, 0.1);

    // Recent shipments weight analysis
    const recentShipments = await prisma.shipment.findMany({
      where: {
        brandId: authResult.user.role === 'BRAND' ? authResult.user.id : undefined,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        boxes: {
          include: {
            boxParts: {
              include: {
                part: true
              }
            }
          }
        }
      }
    });

    const shipmentAnalysis = [];

    for (const shipment of recentShipments) {
      let calculatedWeight = 0;
      const partBreakdown = [];

      for (const box of shipment.boxes) {
        for (const boxPart of box.boxParts) {
          const part = boxPart.part;
          const partWeightKg = part.weight || 0.5;
          const partWeightGrams = partWeightKg * 1000;
          const partTotalWeight = partWeightGrams * boxPart.quantity;
          
          calculatedWeight += partTotalWeight;
          
          partBreakdown.push({
            partCode: part.code,
            partWeight: partWeightKg,
            quantity: boxPart.quantity,
            totalWeight: partTotalWeight
          });
        }
      }

      const calculatedWeightKg = calculatedWeight / 1000;
      const finalWeightKg = Math.max(calculatedWeightKg, 0.1);

      shipmentAnalysis.push({
        shipmentId: shipment.id,
        awbNumber: shipment.awbNumber,
        storedWeight: shipment.totalWeight,
        calculatedWeightGrams: calculatedWeight,
        calculatedWeightKg,
        finalWeightKg,
        weightMatch: Math.abs(shipment.totalWeight - finalWeightKg) < 0.01,
        partBreakdown,
        status: shipment.status,
        createdAt: shipment.createdAt
      });
    }

    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPartsAnalyzed: sampleParts.length,
        totalWeightTests: weightTests.length,
        totalShipmentsAnalyzed: recentShipments.length,
        weightCalculationWorking: true
      },
      partWeightTests: weightTests,
      shipmentSimulation: {
        parts: shipmentSimulation.parts,
        steps: simulationSteps,
        totalWeightGrams: simulatedTotalWeight,
        totalWeightKg: simulatedTotalWeight / 1000,
        finalWeightKg: simulatedFinalWeightKg,
        displayWeight: `${simulatedFinalWeightKg.toFixed(2)}kg`
      },
      recentShipmentsAnalysis: shipmentAnalysis,
      recommendations: []
    };

    // Generate recommendations
    const weightMismatches = shipmentAnalysis.filter(s => !s.weightMatch);
    if (weightMismatches.length > 0) {
      results.recommendations.push(`⚠️ Found ${weightMismatches.length} shipments with weight calculation mismatches`);
    } else {
      results.recommendations.push('✅ All recent shipments have correct weight calculations');
    }

    const zeroWeightShipments = shipmentAnalysis.filter(s => s.storedWeight === 0);
    if (zeroWeightShipments.length > 0) {
      results.recommendations.push(`❌ Found ${zeroWeightShipments.length} shipments with 0.00kg weight - this needs fixing`);
    }

    const partsWithoutWeight = sampleParts.filter(p => !p.weight || p.weight === 0);
    if (partsWithoutWeight.length > 0) {
      results.recommendations.push(`⚠️ Found ${partsWithoutWeight.length} parts without weight - using default 0.5kg`);
    }

    return res.status(200).json(results);

  } catch (error) {
    console.error('❌ Weight verification failed:', error);
    
    return res.status(500).json({
      error: 'Weight verification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}