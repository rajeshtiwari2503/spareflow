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

    const { action, shipmentIds } = req.body;

    console.log('🔧 Starting bulk shipment fixes...');

    // Get all shipments with issues if no specific IDs provided
    let shipmentsToFix;
    
    if (shipmentIds && shipmentIds.length > 0) {
      shipmentsToFix = await prisma.shipment.findMany({
        where: { id: { in: shipmentIds } },
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
    } else {
      // Find shipments with potential issues
      shipmentsToFix = await prisma.shipment.findMany({
        where: {
          OR: [
            { totalWeight: null },
            { totalWeight: 0 },
            { totalValue: null },
            { totalValue: 0 },
            { awbNumber: null },
            { awbNumber: { startsWith: 'FWD' } },
            { awbNumber: { startsWith: 'REV' } },
            { awbNumber: { startsWith: 'MOCK' } }
          ]
        },
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
        },
        take: 50 // Limit to 50 shipments at a time
      });
    }

    console.log(`📦 Found ${shipmentsToFix.length} shipments to potentially fix`);

    const results = [];

    for (const shipment of shipmentsToFix) {
      console.log(`🔍 Processing shipment: ${shipment.id}`);
      
      const shipmentResult = {
        shipmentId: shipment.id,
        fixes: [],
        errors: []
      };

      try {
        // Calculate actual weight and value from parts
        let calculatedWeight = 0;
        let calculatedValue = 0;

        for (const box of shipment.boxes) {
          for (const boxPart of box.boxParts) {
            const part = boxPart.part;
            const partWeight = part.weight || 0.5; // Default 500g if not specified
            const partValue = part.price * boxPart.quantity;
            
            calculatedWeight += partWeight * boxPart.quantity;
            calculatedValue += partValue;
          }
        }

        // Ensure minimum weight
        calculatedWeight = Math.max(calculatedWeight, 0.1);

        // Check if weight/value needs fixing
        const needsWeightFix = !shipment.totalWeight || Math.abs(calculatedWeight - (shipment.totalWeight || 0)) > 0.01;
        const needsValueFix = !shipment.totalValue || Math.abs(calculatedValue - (shipment.totalValue || 0)) > 0.01;

        if (action === 'fix' && (needsWeightFix || needsValueFix)) {
          await prisma.shipment.update({
            where: { id: shipment.id },
            data: {
              totalWeight: calculatedWeight,
              totalValue: calculatedValue
            }
          });

          shipmentResult.fixes.push({
            type: 'WEIGHT_VALUE_UPDATE',
            description: `Updated weight to ${calculatedWeight}kg and value to ₹${calculatedValue}`,
            oldWeight: shipment.totalWeight,
            newWeight: calculatedWeight,
            oldValue: shipment.totalValue,
            newValue: calculatedValue
          });
        }

        // Fix box weights
        if (action === 'fix') {
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
              
              shipmentResult.fixes.push({
                type: 'BOX_WEIGHT_UPDATE',
                description: `Updated box ${box.boxNumber} weight to ${boxWeight}kg`,
                boxId: box.id,
                oldWeight: box.weight,
                newWeight: boxWeight
              });
            }
          }
        }

        // Check AWB issues
        const hasAWB = !!shipment.awbNumber;
        const isMockAWB = shipment.awbNumber?.startsWith('FWD') || 
                         shipment.awbNumber?.startsWith('REV') || 
                         shipment.awbNumber?.startsWith('MOCK') || false;

        if (action === 'fix' && (!hasAWB || isMockAWB)) {
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

          if (recipient && finalRecipientAddress) {
            try {
              console.log(`🚀 Generating real AWB for shipment ${shipment.id}...`);
              
              const awbResult = await generateRobustAWB({
                shipmentId: shipment.id,
                recipientName: recipient.name,
                recipientPhone: recipient.phone || '9999999999',
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
                  where: { id: shipment.id },
                  data: {
                    awbNumber: awbResult.awb_number,
                    status: 'AWB_GENERATED',
                    dtdcData: JSON.stringify(awbResult.dtdcResponse || {})
                  }
                });

                shipmentResult.fixes.push({
                  type: 'REAL_AWB_GENERATED',
                  description: `Generated real AWB: ${awbResult.awb_number}`,
                  oldAWB: shipment.awbNumber,
                  newAWB: awbResult.awb_number,
                  trackingUrl: awbResult.tracking_url
                });
              } else {
                shipmentResult.errors.push({
                  type: 'AWB_GENERATION_FAILED',
                  description: `AWB generation failed: ${awbResult.error || 'Unknown error'}`,
                  fallbackMode: awbResult.fallbackMode
                });
              }
            } catch (error) {
              shipmentResult.errors.push({
                type: 'AWB_GENERATION_ERROR',
                description: `AWB generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          } else {
            shipmentResult.errors.push({
              type: 'MISSING_RECIPIENT_DATA',
              description: 'Cannot generate AWB - missing recipient or address data'
            });
          }
        }

        // Analysis only
        if (action !== 'fix') {
          shipmentResult.analysis = {
            currentWeight: shipment.totalWeight,
            calculatedWeight,
            needsWeightFix,
            currentValue: shipment.totalValue,
            calculatedValue,
            needsValueFix,
            hasAWB,
            awbNumber: shipment.awbNumber,
            isMockAWB,
            needsAWBFix: !hasAWB || isMockAWB
          };
        }

      } catch (error) {
        shipmentResult.errors.push({
          type: 'PROCESSING_ERROR',
          description: error instanceof Error ? error.message : 'Unknown processing error'
        });
      }

      results.push(shipmentResult);
    }

    const summary = {
      totalProcessed: results.length,
      totalFixes: results.reduce((sum, r) => sum + r.fixes.length, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      fixTypes: {
        weightValueUpdates: results.reduce((sum, r) => sum + r.fixes.filter(f => f.type === 'WEIGHT_VALUE_UPDATE').length, 0),
        boxWeightUpdates: results.reduce((sum, r) => sum + r.fixes.filter(f => f.type === 'BOX_WEIGHT_UPDATE').length, 0),
        realAWBGenerated: results.reduce((sum, r) => sum + r.fixes.filter(f => f.type === 'REAL_AWB_GENERATED').length, 0)
      }
    };

    return res.status(200).json({
      success: true,
      message: action === 'fix' ? 'Bulk shipment fixes completed' : 'Bulk shipment analysis completed',
      summary,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Bulk shipment fix failed:', error);
    
    return res.status(500).json({
      error: 'Bulk shipment fix failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}