import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { generateAWB, trackShipment } from '@/lib/dtdc';

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

    // Only allow SUPER_ADMIN or BRAND users
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      const { shipmentId } = req.query;

      if (!shipmentId || typeof shipmentId !== 'string') {
        return res.status(400).json({ error: 'Shipment ID is required' });
      }

      // Investigate specific shipment
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true,
              brandWallet: true,
              wallet: true
            }
          },
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
        }
      });

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      // Calculate expected weight from parts
      let calculatedWeight = 0;
      let calculatedValue = 0;
      const partDetails: any[] = [];

      for (const box of shipment.boxes) {
        for (const boxPart of box.boxParts) {
          const partWeight = boxPart.part.weight || 0;
          const partValue = boxPart.part.price || 0;
          const totalPartWeight = partWeight * boxPart.quantity;
          const totalPartValue = partValue * boxPart.quantity;

          calculatedWeight += totalPartWeight;
          calculatedValue += totalPartValue;

          partDetails.push({
            partId: boxPart.part.id,
            partCode: boxPart.part.code,
            partName: boxPart.part.name,
            unitWeight: partWeight,
            unitPrice: partValue,
            quantity: boxPart.quantity,
            totalWeight: totalPartWeight,
            totalValue: totalPartValue
          });
        }
      }

      // Get wallet transactions related to this shipment
      const walletTransactions = await prisma.walletTransaction.findMany({
        where: {
          OR: [
            { reference: `SHIPMENT_${shipmentId}` },
            { reference: shipmentId },
            { description: { contains: shipmentId } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      // Check DTDC tracking if AWB exists
      let trackingInfo = null;
      if (shipment.awbNumber) {
        try {
          trackingInfo = await trackShipment(shipment.awbNumber);
        } catch (error) {
          console.error('Tracking check failed:', error);
          trackingInfo = { error: error instanceof Error ? error.message : 'Tracking failed' };
        }
      }

      // Analyze issues
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Weight analysis
      if (shipment.totalWeight === 0 || !shipment.totalWeight) {
        issues.push('Total weight is 0 or null');
        recommendations.push(`Set total weight to ${(calculatedWeight / 1000).toFixed(2)} kg based on parts`);
      } else if (Math.abs((shipment.totalWeight * 1000) - calculatedWeight) > 10) {
        issues.push(`Weight mismatch: Stored ${shipment.totalWeight} kg, Calculated ${(calculatedWeight / 1000).toFixed(2)} kg`);
        recommendations.push('Recalculate and update weight based on actual parts');
      }

      // AWB analysis
      if (!shipment.awbNumber) {
        issues.push('AWB number is missing');
        recommendations.push('Retry AWB generation with DTDC');
      } else if (shipment.status === 'AWB_PENDING') {
        issues.push('Shipment stuck in AWB_PENDING status');
        recommendations.push('Check DTDC integration and update status');
      }

      // Value analysis
      if (shipment.totalValue === 0 || !shipment.totalValue) {
        issues.push('Total value is 0 or null');
        recommendations.push(`Set total value to ₹${calculatedValue.toFixed(2)} based on parts`);
      }

      // Box weight analysis
      const boxIssues: any[] = [];
      for (const box of shipment.boxes) {
        const expectedBoxWeight = box.boxParts.reduce((sum, bp) => {
          return sum + ((bp.part.weight || 0) * bp.quantity);
        }, 0) / 1000; // Convert to kg

        if (box.weight === 0 || !box.weight) {
          boxIssues.push({
            boxId: box.id,
            boxNumber: box.boxNumber,
            issue: 'Weight is 0 or null',
            expectedWeight: expectedBoxWeight,
            currentWeight: box.weight
          });
        }
      }

      return res.status(200).json({
        success: true,
        shipment: {
          id: shipment.id,
          status: shipment.status,
          awbNumber: shipment.awbNumber,
          totalWeight: shipment.totalWeight,
          totalValue: shipment.totalValue,
          estimatedCost: shipment.estimatedCost,
          actualCost: shipment.actualCost,
          recipientType: shipment.recipientType,
          createdAt: shipment.createdAt,
          dtdcData: shipment.dtdcData ? JSON.parse(shipment.dtdcData) : null
        },
        calculations: {
          expectedWeight: calculatedWeight / 1000, // in kg
          expectedValue: calculatedValue,
          weightDifference: shipment.totalWeight ? (shipment.totalWeight - (calculatedWeight / 1000)) : null
        },
        partDetails,
        boxAnalysis: {
          totalBoxes: shipment.boxes.length,
          boxIssues
        },
        walletTransactions,
        trackingInfo,
        issues,
        recommendations,
        recipient: shipment.recipientType === 'SERVICE_CENTER' ? {
          type: 'SERVICE_CENTER',
          name: shipment.serviceCenter?.name,
          address: shipment.serviceCenter?.serviceCenterProfile?.addresses?.[0]
        } : {
          type: 'DISTRIBUTOR',
          name: shipment.distributor?.name,
          address: shipment.distributor?.distributorProfile?.address
        }
      });
    }

    if (req.method === 'POST') {
      const { action, shipmentId, data } = req.body;

      if (!shipmentId) {
        return res.status(400).json({ error: 'Shipment ID is required' });
      }

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

      switch (action) {
        case 'fix_weight':
          // Recalculate and fix weight
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
                weight: boxWeight / 1000, // Convert to kg
                value: boxValue
              }
            });
          }

          // Update shipment weight and value
          await prisma.shipment.update({
            where: { id: shipmentId },
            data: {
              totalWeight: totalWeight / 1000, // Convert to kg
              totalValue
            }
          });

          return res.status(200).json({
            success: true,
            message: 'Weight and value fixed successfully',
            updatedWeight: totalWeight / 1000,
            updatedValue: totalValue
          });

        case 'retry_awb':
          // Retry AWB generation
          try {
            const recipient = shipment.recipientType === 'SERVICE_CENTER' 
              ? shipment.serviceCenter 
              : shipment.distributor;

            const recipientAddress = shipment.recipientType === 'SERVICE_CENTER'
              ? shipment.serviceCenter?.serviceCenterProfile?.addresses?.[0]
              : shipment.distributor?.distributorProfile?.address;

            if (!recipient || !recipientAddress) {
              return res.status(400).json({ error: 'Recipient or address not found' });
            }

            const awbResult = await generateAWB({
              consignee_name: recipient.name,
              consignee_phone: recipient.phone || '9999999999',
              consignee_address: recipientAddress.street || '',
              consignee_city: recipientAddress.city || '',
              consignee_state: recipientAddress.state || '',
              consignee_pincode: recipientAddress.pincode || '400001',
              weight: shipment.totalWeight || 0.5,
              pieces: shipment.boxes.length,
              declared_value: shipment.totalValue || 1000,
              reference_number: `SF-${shipmentId}`,
              pickup_pincode: '400069'
            });

            if (awbResult.success && awbResult.awb_number) {
              // Update shipment with AWB
              await prisma.shipment.update({
                where: { id: shipmentId },
                data: {
                  awbNumber: awbResult.awb_number,
                  status: 'CONFIRMED',
                  dtdcData: JSON.stringify(awbResult)
                }
              });

              return res.status(200).json({
                success: true,
                message: 'AWB generated successfully',
                awbNumber: awbResult.awb_number,
                trackingUrl: awbResult.tracking_url
              });
            } else {
              return res.status(400).json({
                success: false,
                error: 'AWB generation failed',
                details: awbResult.error
              });
            }
          } catch (error) {
            console.error('AWB retry failed:', error);
            return res.status(500).json({
              success: false,
              error: 'AWB generation failed',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
          }

        case 'update_status':
          // Update shipment status
          const { newStatus } = data;
          
          await prisma.shipment.update({
            where: { id: shipmentId },
            data: { status: newStatus }
          });

          return res.status(200).json({
            success: true,
            message: `Status updated to ${newStatus}`
          });

        case 'sync_tracking':
          // Sync tracking information
          if (!shipment.awbNumber) {
            return res.status(400).json({ error: 'No AWB number to track' });
          }

          try {
            const trackingResult = await trackShipment(shipment.awbNumber);
            
            if (trackingResult.success) {
              // Update shipment with latest tracking info
              await prisma.shipment.update({
                where: { id: shipmentId },
                data: {
                  trackingHistory: JSON.stringify(trackingResult.tracking_history),
                  status: mapTrackingStatusToShipmentStatus(trackingResult.current_status)
                }
              });

              return res.status(200).json({
                success: true,
                message: 'Tracking synced successfully',
                trackingInfo: trackingResult
              });
            } else {
              return res.status(400).json({
                success: false,
                error: 'Tracking sync failed',
                details: trackingResult.error
              });
            }
          } catch (error) {
            console.error('Tracking sync failed:', error);
            return res.status(500).json({
              success: false,
              error: 'Tracking sync failed',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
          }

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

  } catch (error) {
    console.error('Shipment investigation error:', error);
    return res.status(500).json({
      error: 'Investigation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function mapTrackingStatusToShipmentStatus(trackingStatus: string): string {
  const statusMap: Record<string, string> = {
    'BOOKED': 'CONFIRMED',
    'PICKED_UP': 'PICKUP_COMPLETED',
    'IN_TRANSIT': 'IN_TRANSIT',
    'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
    'DELIVERED': 'DELIVERED',
    'RETURN_TO_ORIGIN': 'RTO',
    'CANCELLED': 'CANCELLED'
  };

  return statusMap[trackingStatus] || 'PENDING';
}