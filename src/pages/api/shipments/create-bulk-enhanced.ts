import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { generateRobustAWB } from '@/lib/dtdc-robust-production';
import { deductFromWallet } from '@/lib/wallet';
import {
  classifyShipmentType,
  assignCourierPayer,
  getCourierPricing,
  calculateShipmentCostBreakdown,
  calculateInsuranceRequirement,
  generateShipmentLabel
} from '@/lib/shipment-flow-logic';

interface BulkShipmentRequest {
  shipments: Array<{
    id: string;
    recipientId: string;
    recipientName: string;
    recipientType: 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
    parts: Array<{
      partId: string;
      quantity: number;
    }>;
    boxes: Array<{
      parts: Array<{
        partId: string;
        quantity: number;
      }>;
      dimensions: {
        length: number;
        breadth: number;
        height: number;
      };
    }>;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    notes?: string;
    returnReason?: 'DEFECTIVE' | 'EXCESS' | 'WARRANTY_RETURN' | 'WRONG_PART';
    insuranceRequired?: boolean;
    declaredValue?: number;
  }>;
}

interface BulkShipmentResponse {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    shipmentId: string;
    success: boolean;
    awbNumber?: string;
    error?: string;
    cost?: number;
  }>;
  totalCost: number;
  walletBalance: number;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting bulk enhanced shipment creation...');
    
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    console.log('✅ User authenticated:', user.email, user.role);

    // Only brands can create bulk shipments
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Only brands can create bulk shipments' });
    }

    const { shipments }: BulkShipmentRequest = req.body;
    console.log('📦 Creating bulk shipments:', shipments.length, 'shipments');

    if (!shipments || shipments.length === 0) {
      return res.status(400).json({ error: 'No shipments provided' });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let totalCost = 0;

    // Process each shipment
    for (const shipmentData of shipments) {
      try {
        console.log(`🔍 Processing shipment ${shipmentData.id} for ${shipmentData.recipientName}`);

        // Step 1: Get recipient details and verify authorization
        let recipient: any = null;
        let recipientAddress: any = null;
        let recipientRole: string = '';

        if (shipmentData.recipientType === 'SERVICE_CENTER') {
          const authorization = await prisma.brandAuthorizedServiceCenter.findFirst({
            where: {
              brandId: user.id,
              serviceCenterUserId: shipmentData.recipientId,
              status: 'Active'
            },
            include: {
              serviceCenter: {
                include: {
                  serviceCenterProfile: {
                    include: {
                      addresses: true
                    }
                  }
                }
              }
            }
          });

          if (!authorization) {
            throw new Error('Service center not found or not authorized');
          }

          recipient = authorization.serviceCenter;
          recipientAddress = recipient.serviceCenterProfile?.addresses?.[0];
          recipientRole = 'SERVICE_CENTER';
        } else if (shipmentData.recipientType === 'DISTRIBUTOR') {
          const authorization = await prisma.brandAuthorizedDistributor.findFirst({
            where: {
              brandId: user.id,
              distributorUserId: shipmentData.recipientId,
              status: 'Active'
            },
            include: {
              distributor: {
                include: {
                  distributorProfile: {
                    include: {
                      address: true
                    }
                  }
                }
              }
            }
          });

          if (!authorization) {
            throw new Error('Distributor not found or not authorized');
          }

          recipient = authorization.distributor;
          recipientAddress = recipient.distributorProfile?.address;
          recipientRole = 'DISTRIBUTOR';
        } else if (shipmentData.recipientType === 'CUSTOMER') {
          recipient = await prisma.user.findUnique({
            where: { id: shipmentData.recipientId },
            include: {
              customerProfile: {
                include: {
                  addresses: true
                }
              }
            }
          });

          if (!recipient || recipient.role !== 'CUSTOMER') {
            throw new Error('Customer not found');
          }

          recipientAddress = recipient.customerProfile?.addresses?.[0];
          recipientRole = 'CUSTOMER';
        }

        if (!recipientAddress) {
          throw new Error('Recipient address not found');
        }

        // Step 2: Classify shipment type using new logic
        const classification = classifyShipmentType(
          user.role,
          recipientRole as any,
          shipmentData.returnReason
        );

        // Step 3: Assign courier payer responsibility
        const payerAssignment = assignCourierPayer(
          classification.shipment_type,
          classification.shipment_direction,
          classification.return_reason
        );

        // Step 4: Verify parts and calculate totals
        const partIds = shipmentData.parts.map(p => p.partId);
        const parts = await prisma.part.findMany({
          where: {
            id: { in: partIds },
            brandId: user.id
          }
        });

        if (parts.length !== partIds.length) {
          throw new Error('Some parts not found or not owned by brand');
        }

        let totalWeight = 0;
        let totalValue = 0;
        const partUpdates: Array<{ id: string; newStock: number }> = [];

        for (const selectedPart of shipmentData.parts) {
          const part = parts.find(p => p.id === selectedPart.partId);
          if (!part) {
            throw new Error(`Part ${selectedPart.partId} not found`);
          }

          if (part.stockQuantity < selectedPart.quantity) {
            throw new Error(`Insufficient stock for part ${part.code}. Available: ${part.stockQuantity}, Requested: ${selectedPart.quantity}`);
          }

          const partWeight = part.weight || 0.5; // Default 500g if weight not specified
          totalWeight += partWeight * selectedPart.quantity;
          totalValue += part.price * selectedPart.quantity;
          partUpdates.push({
            id: part.id,
            newStock: part.stockQuantity - selectedPart.quantity
          });
        }

        // Use declared value if provided, otherwise use calculated total value
        const finalDeclaredValue = shipmentData.declaredValue || totalValue;

        // Step 5: Get courier pricing configuration
        const pricing = await getCourierPricing(
          classification.shipment_type,
          payerAssignment.courier_payer,
          user.id
        );

        // Step 6: Calculate cost breakdown
        const isExpress = shipmentData.priority === 'HIGH' || shipmentData.priority === 'CRITICAL';
        const isRemoteArea = recipientAddress.pincode?.startsWith('79') || 
                            recipientAddress.pincode?.startsWith('18') || false; // Simplified remote area check

        const costBreakdown = calculateShipmentCostBreakdown(
          pricing,
          shipmentData.boxes.length,
          totalWeight,
          isExpress,
          isRemoteArea,
          finalDeclaredValue,
          shipmentData.insuranceRequired
        );

        // Step 7: Calculate insurance if required
        let insuranceCalculation;
        if (shipmentData.insuranceRequired && finalDeclaredValue >= 5000) {
          insuranceCalculation = calculateInsuranceRequirement(finalDeclaredValue);
        }

        const finalCost = costBreakdown.total_cost + (insuranceCalculation?.total_insurance_charge || 0);

        // Step 8: Check wallet balance and deduct
        const walletResult = await deductFromWallet(
          user.id,
          finalCost,
          `${classification.shipment_type} shipment to ${recipient.name} (${shipmentData.recipientType})`,
          `BULK_SHIPMENT_${Date.now()}_${shipmentData.id}`,
          undefined
        );

        if (!walletResult.success) {
          throw new Error(`Insufficient wallet balance. Required: ₹${finalCost}, Available: ₹${walletResult.currentBalance || 0}`);
        }

        // Step 9: Create shipment in database
        const shipment = await prisma.shipment.create({
          data: {
            brandId: user.id,
            recipientId: shipmentData.recipientId,
            recipientType: shipmentData.recipientType,
            status: 'PENDING',
            priority: shipmentData.priority,
            notes: shipmentData.notes || '',
            totalWeight: totalWeight,
            totalValue: totalValue,
            declaredValue: finalDeclaredValue,
            estimatedCost: finalCost,
            actualCost: finalCost,
            courierPartner: 'DTDC',
            recipientAddress: JSON.stringify({
              street: recipientAddress.street || '',
              area: recipientAddress.area || '',
              city: recipientAddress.city || '',
              state: recipientAddress.state || '',
              pincode: recipientAddress.pincode || '',
              country: recipientAddress.country || 'India'
            }),
            recipientPincode: recipientAddress.pincode || '',
            insurance: shipmentData.insuranceRequired ? JSON.stringify({
              type: 'CARRIER_RISK',
              declaredValue: finalDeclaredValue,
              cost: insuranceCalculation?.total_insurance_charge || 0
            }) : JSON.stringify({ type: 'NONE' }),
            metadata: JSON.stringify({
              classification,
              payerAssignment,
              costBreakdown,
              insuranceCalculation,
              shipmentFlowVersion: '1.0',
              bulkShipmentId: shipmentData.id
            })
          }
        });

        // Step 10: Create boxes and box parts
        const createdBoxes = [];
        
        for (let i = 0; i < shipmentData.boxes.length; i++) {
          const boxData = shipmentData.boxes[i];
          
          // Calculate box weight
          let boxWeight = 0;
          
          for (const boxPart of boxData.parts) {
            const part = parts.find(p => p.id === boxPart.partId);
            if (part) {
              boxWeight += (part.weight || 0.5) * boxPart.quantity;
            }
          }

          const box = await prisma.box.create({
            data: {
              shipmentId: shipment.id,
              boxNumber: (i + 1).toString(),
              weight: boxWeight,
              status: 'PENDING'
            }
          });

          // Create box parts
          for (const boxPart of boxData.parts) {
            await prisma.boxPart.create({
              data: {
                boxId: box.id,
                partId: boxPart.partId,
                quantity: boxPart.quantity
              }
            });
          }

          createdBoxes.push(box);
        }

        // Step 11: Update part stock
        for (const update of partUpdates) {
          await prisma.part.update({
            where: { id: update.id },
            data: { stockQuantity: update.newStock }
          });

          // Create stock movement record
          await prisma.stockMovement.create({
            data: {
              partId: update.id,
              type: 'OUT',
              quantity: -1 * (parts.find(p => p.id === update.id)?.stockQuantity || 0 - update.newStock),
              reason: 'BULK_SHIPMENT',
              reference: shipment.id,
              previousQty: parts.find(p => p.id === update.id)?.stockQuantity || 0,
              newQty: update.newStock,
              notes: `Bulk shipment ${shipment.id} - ${classification.shipment_type}`,
              createdBy: user.id
            }
          });
        }

        // Step 12: Generate AWB with enhanced DTDC integration
        let awbNumber: string | null = null;

        try {
          // Prepare sender details based on shipment type
          let senderDetails = undefined;
          if (classification.shipment_type === 'REVERSE') {
            // For reverse shipments, sender is the recipient (pickup location)
            senderDetails = {
              name: recipient.name,
              phone: recipient.phone || '9999999999',
              address: {
                street: recipientAddress.street || '',
                area: recipientAddress.area || '',
                city: recipientAddress.city || '',
                state: recipientAddress.state || '',
                pincode: recipientAddress.pincode || '',
                country: recipientAddress.country || 'India'
              }
            };
          }

          const awbResult = await generateRobustAWB({
            shipmentId: shipment.id,
            recipientName: classification.shipment_type === 'REVERSE' ? 'SpareFlow Warehouse' : recipient.name,
            recipientPhone: classification.shipment_type === 'REVERSE' ? '9876543200' : (recipient.phone || '9999999999'),
            recipientAddress: classification.shipment_type === 'REVERSE' ? {
              street: 'Tech Park, Andheri East',
              area: 'Near Metro Station',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400069',
              country: 'India'
            } : {
              street: recipientAddress.street || '',
              area: recipientAddress.area || '',
              city: recipientAddress.city || '',
              state: recipientAddress.state || '',
              pincode: recipientAddress.pincode || '',
              country: recipientAddress.country || 'India'
            },
            weight: totalWeight,
            declaredValue: finalDeclaredValue,
            numBoxes: shipmentData.boxes.length,
            priority: shipmentData.priority,
            shipmentType: classification.shipment_type,
            senderDetails
          });

          if (awbResult.success && awbResult.awb_number) {
            awbNumber = awbResult.awb_number;
            
            // Update shipment with AWB
            await prisma.shipment.update({
              where: { id: shipment.id },
              data: {
                awbNumber,
                status: 'AWB_GENERATED',
                dtdcData: JSON.stringify(awbResult.dtdcResponse || {})
              }
            });
          } else {
            await prisma.shipment.update({
              where: { id: shipment.id },
              data: {
                status: 'AWB_PENDING',
                dtdcData: JSON.stringify({ error: awbResult.error || 'AWB generation failed' })
              }
            });
          }
        } catch (awbError) {
          console.error(`❌ AWB generation failed for shipment ${shipment.id}:`, awbError);
          
          await prisma.shipment.update({
            where: { id: shipment.id },
            data: {
              status: 'AWB_PENDING',
              dtdcData: JSON.stringify({ error: awbError instanceof Error ? awbError.message : 'AWB generation error' })
            }
          });
        }

        // Step 13: Generate labels for boxes
        for (const box of createdBoxes) {
          if (awbNumber) {
            try {
              await generateShipmentLabel({
                courier_name: 'DTDC',
                awb_number: awbNumber,
                shipment_id: shipment.id,
                box_id: box.id,
                format: 'PDF_4X6'
              });
            } catch (labelError) {
              console.error(`❌ Label generation failed for box ${box.id}:`, labelError);
            }
          }
        }

        // Step 14: Send notification
        try {
          await prisma.notification.create({
            data: {
              title: `New ${classification.shipment_type} Shipment`,
              message: `A new ${classification.shipment_type.toLowerCase()} shipment from ${user.name} is on its way. AWB: ${awbNumber || 'Pending'}`,
              type: 'SHIPMENT',
              recipients: [shipmentData.recipientId],
              data: JSON.stringify({
                shipmentId: shipment.id,
                awbNumber,
                totalValue,
                totalWeight,
                classification,
                payerAssignment
              }),
              priority: shipmentData.priority === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM'
            }
          });
        } catch (notificationError) {
          console.error('⚠️ Notification sending failed:', notificationError);
        }

        // Success result
        results.push({
          shipmentId: shipmentData.id,
          success: true,
          awbNumber,
          cost: finalCost
        });

        successCount++;
        totalCost += finalCost;

        console.log(`✅ Successfully created shipment ${shipment.id} with AWB: ${awbNumber || 'Pending'}`);

      } catch (error) {
        console.error(`❌ Failed to create shipment ${shipmentData.id}:`, error);
        
        results.push({
          shipmentId: shipmentData.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        failureCount++;
      }
    }

    // Get final wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    console.log('🎉 Bulk shipment creation completed:', {
      successCount,
      failureCount,
      totalCost,
      remainingBalance: wallet?.balance || 0
    });

    const response: BulkShipmentResponse = {
      success: successCount > 0,
      successCount,
      failureCount,
      results,
      totalCost,
      walletBalance: wallet?.balance || 0
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('❌ Bulk enhanced shipment creation failed:', error);
    
    return res.status(500).json({
      success: false,
      successCount: 0,
      failureCount: 0,
      results: [],
      totalCost: 0,
      walletBalance: 0,
      error: 'Bulk shipment creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}