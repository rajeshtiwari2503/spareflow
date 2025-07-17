import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { generateRobustAWB } from '@/lib/dtdc-robust-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication - only SUPER_ADMIN can access this
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can access this endpoint' });
    }

    const { shipmentId, action } = req.body;

    if (!shipmentId) {
      return res.status(400).json({ error: 'Shipment ID is required' });
    }

    console.log(`🔍 Investigating shipment weight and AWB issues for: ${shipmentId}`);

    // Get shipment details with all related data
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        brand: true,
        serviceCenter: {
          include: {
            serviceCenterProfile: {
              include: {
                addresses: true
              }
            }
          }
        },
        distributor: {
          include: {
            distributorProfile: {
              include: {
                address: true
              }
            }
          }
        },
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

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    console.log('📦 Shipment found:', {
      id: shipment.id,
      status: shipment.status,
      awbNumber: shipment.awbNumber,
      totalWeight: shipment.totalWeight,
      totalValue: shipment.totalValue,
      recipientType: shipment.recipientType,
      boxCount: shipment.boxes.length
    });

    // Calculate actual weight from parts
    let calculatedWeight = 0;
    let calculatedValue = 0;
    const partDetails: any[] = [];

    for (const box of shipment.boxes) {
      for (const boxPart of box.boxParts) {
        const part = boxPart.part;
        const partWeight = part.weight || 0.5; // Default 500g if not specified
        const partValue = part.price * boxPart.quantity;
        
        calculatedWeight += partWeight * boxPart.quantity;
        calculatedValue += partValue;
        
        partDetails.push({
          partId: part.id,
          partCode: part.code,
          partName: part.name,
          quantity: boxPart.quantity,
          unitWeight: partWeight,
          totalWeight: partWeight * boxPart.quantity,
          unitPrice: part.price,
          totalValue: partValue
        });
      }
    }

    console.log('⚖️ Weight calculation:', {
      calculatedWeight: `${calculatedWeight}kg`,
      storedWeight: `${shipment.totalWeight || 0}kg`,
      calculatedValue: `₹${calculatedValue}`,
      storedValue: `₹${shipment.totalValue || 0}`
    });

    // Get recipient details
    let recipient = null;
    let recipientAddress = null;

    if (shipment.recipientType === 'SERVICE_CENTER' && shipment.serviceCenter) {
      recipient = shipment.serviceCenter;
      recipientAddress = shipment.serviceCenter.serviceCenterProfile?.addresses?.[0];
    } else if (shipment.recipientType === 'DISTRIBUTOR' && shipment.distributor) {
      recipient = shipment.distributor;
      recipientAddress = shipment.distributor.distributorProfile?.address;
    }

    // Parse stored recipient address if available
    let parsedRecipientAddress = null;
    if (shipment.recipientAddress) {
      try {
        parsedRecipientAddress = JSON.parse(shipment.recipientAddress);
      } catch (error) {
        console.error('Failed to parse recipient address:', error);
      }
    }

    const finalRecipientAddress = recipientAddress || parsedRecipientAddress || {
      street: 'Unknown',
      area: 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      pincode: '400001',
      country: 'India'
    };

    console.log('📍 Recipient details:', {
      name: recipient?.name || 'Unknown',
      phone: recipient?.phone || 'Unknown',
      address: finalRecipientAddress
    });

    const analysis = {
      shipmentDetails: {
        id: shipment.id,
        status: shipment.status,
        awbNumber: shipment.awbNumber,
        createdAt: shipment.createdAt,
        recipientType: shipment.recipientType
      },
      weightAnalysis: {
        storedWeight: shipment.totalWeight,
        calculatedWeight,
        weightDifference: calculatedWeight - (shipment.totalWeight || 0),
        isWeightCorrect: Math.abs(calculatedWeight - (shipment.totalWeight || 0)) < 0.01
      },
      valueAnalysis: {
        storedValue: shipment.totalValue,
        calculatedValue,
        valueDifference: calculatedValue - (shipment.totalValue || 0),
        isValueCorrect: Math.abs(calculatedValue - (shipment.totalValue || 0)) < 0.01
      },
      awbAnalysis: {
        hasAWB: !!shipment.awbNumber,
        awbNumber: shipment.awbNumber,
        isMockAWB: shipment.awbNumber?.startsWith('FWD') || shipment.awbNumber?.startsWith('REV') || false,
        dtdcData: shipment.dtdcData ? JSON.parse(shipment.dtdcData) : null
      },
      partDetails,
      recipientDetails: {
        name: recipient?.name || 'Unknown',
        phone: recipient?.phone || 'Unknown',
        address: finalRecipientAddress
      }
    };

    // If action is 'fix', attempt to fix the issues
    if (action === 'fix') {
      console.log('🔧 Attempting to fix weight and AWB issues...');
      
      const fixes = [];
      
      // Fix 1: Update weight and value if incorrect
      if (!analysis.weightAnalysis.isWeightCorrect || !analysis.valueAnalysis.isValueCorrect) {
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: {
            totalWeight: calculatedWeight,
            totalValue: calculatedValue
          }
        });
        
        fixes.push({
          type: 'WEIGHT_VALUE_UPDATE',
          description: `Updated weight from ${shipment.totalWeight}kg to ${calculatedWeight}kg and value from ₹${shipment.totalValue} to ₹${calculatedValue}`
        });
        
        console.log('✅ Weight and value updated');
      }

      // Fix 2: Update box weights
      for (const box of shipment.boxes) {
        let boxWeight = 0;
        for (const boxPart of box.boxParts) {
          const partWeight = boxPart.part.weight || 0.5;
          boxWeight += partWeight * boxPart.quantity;
        }
        
        if (Math.abs(boxWeight - (box.weight || 0)) > 0.01) {
          await prisma.box.update({
            where: { id: box.id },
            data: { weight: boxWeight }
          });
          
          fixes.push({
            type: 'BOX_WEIGHT_UPDATE',
            description: `Updated box ${box.boxNumber} weight from ${box.weight}kg to ${boxWeight}kg`
          });
        }
      }

      // Fix 3: Generate real AWB if currently using mock
      if (analysis.awbAnalysis.isMockAWB || !analysis.awbAnalysis.hasAWB) {
        console.log('🚀 Attempting to generate real AWB...');
        
        try {
          const awbResult = await generateRobustAWB({
            shipmentId: shipment.id,
            recipientName: recipient?.name || 'Unknown Recipient',
            recipientPhone: recipient?.phone || '9999999999',
            recipientAddress: finalRecipientAddress,
            weight: calculatedWeight,
            declaredValue: calculatedValue,
            numBoxes: shipment.boxes.length,
            priority: shipment.priority || 'MEDIUM',
            shipmentType: 'FORWARD'
          });

          if (awbResult.success && awbResult.awb_number && !awbResult.fallbackMode) {
            // Update shipment with real AWB
            await prisma.shipment.update({
              where: { id: shipmentId },
              data: {
                awbNumber: awbResult.awb_number,
                status: 'AWB_GENERATED',
                dtdcData: JSON.stringify(awbResult.dtdcResponse || {})
              }
            });

            fixes.push({
              type: 'REAL_AWB_GENERATED',
              description: `Generated real AWB: ${awbResult.awb_number}`,
              awbNumber: awbResult.awb_number,
              trackingUrl: awbResult.tracking_url
            });
            
            console.log('✅ Real AWB generated:', awbResult.awb_number);
          } else {
            fixes.push({
              type: 'AWB_GENERATION_FAILED',
              description: `AWB generation failed: ${awbResult.error || 'Unknown error'}`,
              fallbackMode: awbResult.fallbackMode,
              error: awbResult.error
            });
            
            console.log('❌ Real AWB generation failed, still using fallback');
          }
        } catch (error) {
          fixes.push({
            type: 'AWB_GENERATION_ERROR',
            description: `AWB generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          
          console.error('❌ AWB generation error:', error);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Shipment analysis and fixes completed',
        analysis,
        fixes,
        timestamp: new Date().toISOString()
      });
    }

    // Return analysis only
    return res.status(200).json({
      success: true,
      message: 'Shipment analysis completed',
      analysis,
      recommendations: [
        !analysis.weightAnalysis.isWeightCorrect ? 'Fix weight calculation' : null,
        !analysis.valueAnalysis.isValueCorrect ? 'Fix value calculation' : null,
        analysis.awbAnalysis.isMockAWB ? 'Generate real AWB' : null,
        !analysis.awbAnalysis.hasAWB ? 'Generate AWB' : null
      ].filter(Boolean),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Shipment investigation failed:', error);
    
    return res.status(500).json({
      error: 'Shipment investigation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}