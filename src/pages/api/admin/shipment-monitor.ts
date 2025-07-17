import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { generateAWB, trackShipmentEnhanced } from '@/lib/dtdc-enhanced';
import { formatWeight } from '@/lib/weight-formatter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;

    // Only allow SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      // Monitor shipment health and identify issues
      console.log('🔍 Starting shipment health monitoring...');

      // Get problematic shipments
      const problematicShipments = await prisma.shipment.findMany({
        where: {
          OR: [
            { status: 'AWB_PENDING' },
            { awbNumber: null },
            { totalWeight: 0 },
            { totalWeight: null },
            {
              AND: [
                { status: 'PENDING' },
                { createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } } // Older than 30 minutes
              ]
            }
          ]
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          serviceCenter: {
            select: {
              id: true,
              name: true
            }
          },
          distributor: {
            select: {
              id: true,
              name: true
            }
          },
          boxes: {
            include: {
              boxParts: {
                include: {
                  part: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      weight: true,
                      price: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Analyze each shipment
      const analysis = [];
      
      for (const shipment of problematicShipments) {
        const issues = [];
        const recommendations = [];
        
        // Calculate expected weight and value
        let calculatedWeight = 0;
        let calculatedValue = 0;
        
        for (const box of shipment.boxes) {
          for (const boxPart of box.boxParts) {
            calculatedWeight += (boxPart.part.weight || 0) * boxPart.quantity;
            calculatedValue += (boxPart.part.price || 0) * boxPart.quantity;
          }
        }

        // Weight issues
        if (!shipment.totalWeight || shipment.totalWeight === 0) {
          issues.push('Total weight is 0 or null');
          recommendations.push(`Set weight to ${formatWeight(calculatedWeight / 1000)}`);
        }

        // AWB issues
        if (!shipment.awbNumber) {
          issues.push('AWB number missing');
          recommendations.push('Generate AWB with DTDC');
        }

        // Status issues
        if (shipment.status === 'AWB_PENDING') {
          issues.push('Stuck in AWB_PENDING status');
          recommendations.push('Retry AWB generation');
        }

        // Age issues
        const ageInMinutes = (Date.now() - shipment.createdAt.getTime()) / (1000 * 60);
        if (shipment.status === 'PENDING' && ageInMinutes > 30) {
          issues.push(`Shipment pending for ${Math.round(ageInMinutes)} minutes`);
          recommendations.push('Check AWB generation status');
        }

        // Box weight issues
        const boxIssues = shipment.boxes.filter(box => !box.weight || box.weight === 0).length;
        if (boxIssues > 0) {
          issues.push(`${boxIssues} boxes have 0 weight`);
          recommendations.push('Recalculate box weights');
        }

        analysis.push({
          shipment: {
            id: shipment.id,
            status: shipment.status,
            awbNumber: shipment.awbNumber,
            totalWeight: shipment.totalWeight,
            totalValue: shipment.totalValue,
            createdAt: shipment.createdAt,
            brand: shipment.brand.name,
            recipient: shipment.recipientType === 'SERVICE_CENTER' 
              ? shipment.serviceCenter?.name 
              : shipment.distributor?.name,
            boxCount: shipment.boxes.length
          },
          calculations: {
            expectedWeight: calculatedWeight / 1000,
            expectedValue: calculatedValue
          },
          issues,
          recommendations,
          severity: issues.length > 2 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW'
        });
      }

      // Get summary statistics
      const totalShipments = await prisma.shipment.count();
      const awbPendingCount = await prisma.shipment.count({
        where: { status: 'AWB_PENDING' }
      });
      const missingAwbCount = await prisma.shipment.count({
        where: { awbNumber: null }
      });
      const zeroWeightCount = await prisma.shipment.count({
        where: { 
          OR: [
            { totalWeight: 0 },
            { totalWeight: null }
          ]
        }
      });

      // Recent failures (last 24 hours)
      const recentFailures = await prisma.shipment.count({
        where: {
          status: 'AWB_PENDING',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      return res.status(200).json({
        success: true,
        summary: {
          totalShipments,
          problematicShipments: problematicShipments.length,
          awbPendingCount,
          missingAwbCount,
          zeroWeightCount,
          recentFailures,
          healthScore: Math.max(0, 100 - (problematicShipments.length / totalShipments * 100))
        },
        analysis,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      const { action, shipmentIds, autoFix } = req.body;

      switch (action) {
        case 'auto_fix_all':
          // Auto-fix all problematic shipments
          console.log('🔧 Starting auto-fix for all problematic shipments...');
          
          const shipmentsToFix = await prisma.shipment.findMany({
            where: {
              OR: [
                { status: 'AWB_PENDING' },
                { awbNumber: null },
                { totalWeight: 0 },
                { totalWeight: null }
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
            take: 20 // Limit to prevent overwhelming the system
          });

          const fixResults = [];

          for (const shipment of shipmentsToFix) {
            try {
              console.log(`🔧 Fixing shipment ${shipment.id}...`);
              
              // Fix weight issues
              if (!shipment.totalWeight || shipment.totalWeight === 0) {
                let totalWeight = 0;
                let totalValue = 0;

                for (const box of shipment.boxes) {
                  let boxWeight = 0;
                  let boxValue = 0;

                  for (const boxPart of box.boxParts) {
                    const partWeight = boxPart.part.weight || 0;
                    const partValue = boxPart.part.price || 0;
                    boxWeight += partWeight * boxPart.quantity;
                    boxValue += partValue * boxPart.quantity;
                  }

                  totalWeight += boxWeight;
                  totalValue += boxValue;

                  // Update box weight
                  await prisma.box.update({
                    where: { id: box.id },
                    data: {
                      weight: boxWeight / 1000,
                      value: boxValue
                    }
                  });
                }

                // Update shipment weight
                await prisma.shipment.update({
                  where: { id: shipment.id },
                  data: {
                    totalWeight: totalWeight / 1000,
                    totalValue
                  }
                });

                console.log(`✅ Fixed weight for shipment ${shipment.id}: ${formatWeight(totalWeight / 1000)}`);
              }

              // Fix AWB issues
              if (!shipment.awbNumber || shipment.status === 'AWB_PENDING') {
                const recipient = shipment.recipientType === 'SERVICE_CENTER' 
                  ? shipment.serviceCenter 
                  : shipment.distributor;

                const recipientAddress = shipment.recipientType === 'SERVICE_CENTER'
                  ? shipment.serviceCenter?.serviceCenterProfile?.addresses?.[0]
                  : shipment.distributor?.distributorProfile?.address;

                if (recipient && recipientAddress) {
                  const awbResult = await generateAWB({
                    shipmentId: shipment.id,
                    recipientName: recipient.name,
                    recipientPhone: recipient.phone || '9999999999',
                    recipientAddress: {
                      street: recipientAddress.street || '',
                      area: recipientAddress.area || '',
                      city: recipientAddress.city || '',
                      state: recipientAddress.state || '',
                      pincode: recipientAddress.pincode || '400001',
                      country: recipientAddress.country || 'India'
                    },
                    weight: shipment.totalWeight || 0.5,
                    declaredValue: shipment.totalValue || 1000,
                    numBoxes: shipment.boxes.length,
                    priority: shipment.priority || 'MEDIUM',
                    // Required fields for DTDC API
                    consignee_name: recipient.name,
                    consignee_phone: recipient.phone || '9999999999',
                    consignee_address: recipientAddress.street || '',
                    consignee_city: recipientAddress.city || '',
                    consignee_state: recipientAddress.state || '',
                    consignee_pincode: recipientAddress.pincode || '400001',
                    pieces: shipment.boxes.length
                  });

                  if (awbResult.success && awbResult.awb_number) {
                    await prisma.shipment.update({
                      where: { id: shipment.id },
                      data: {
                        awbNumber: awbResult.awb_number,
                        status: 'CONFIRMED',
                        dtdcData: JSON.stringify({
                          ...awbResult.dtdcResponse,
                          autoFixedAt: new Date().toISOString()
                        })
                      }
                    });

                    console.log(`✅ Generated AWB for shipment ${shipment.id}: ${awbResult.awb_number}`);
                  }
                }
              }

              fixResults.push({
                shipmentId: shipment.id,
                success: true,
                message: 'Shipment fixed successfully'
              });

            } catch (error) {
              console.error(`❌ Failed to fix shipment ${shipment.id}:`, error);
              fixResults.push({
                shipmentId: shipment.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }

          return res.status(200).json({
            success: true,
            message: `Auto-fix completed for ${shipmentsToFix.length} shipments`,
            results: fixResults,
            summary: {
              total: shipmentsToFix.length,
              successful: fixResults.filter(r => r.success).length,
              failed: fixResults.filter(r => !r.success).length
            }
          });

        case 'retry_awb_batch':
          // Retry AWB generation for specific shipments
          if (!shipmentIds || !Array.isArray(shipmentIds)) {
            return res.status(400).json({ error: 'Shipment IDs array is required' });
          }

          const retryResults = [];

          for (const shipmentId of shipmentIds) {
            try {
              // Use the regenerate AWB endpoint logic
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/shipments/${shipmentId}/regenerate-awb`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': req.headers.authorization || ''
                }
              });

              const result = await response.json();
              retryResults.push({
                shipmentId,
                success: result.success,
                awbNumber: result.shipment?.awbNumber,
                error: result.error
              });

            } catch (error) {
              retryResults.push({
                shipmentId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }

          return res.status(200).json({
            success: true,
            message: `AWB retry completed for ${shipmentIds.length} shipments`,
            results: retryResults
          });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

  } catch (error) {
    console.error('❌ Shipment monitoring error:', error);
    return res.status(500).json({
      error: 'Monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}