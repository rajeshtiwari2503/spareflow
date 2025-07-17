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
  generateShipmentLabel,
  ShipmentClassification,
  CourierPayerAssignment,
  ShipmentCostBreakdown,
  InsuranceCalculation
} from '@/lib/shipment-flow-logic';

interface EnhancedShipmentRequest {
  recipientId: string;
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
  estimatedWeight?: number;
  serviceCenterPincode?: string;
}

interface EnhancedShipmentResponse {
  success: boolean;
  shipment: {
    id: string;
    awbNumber?: string;
    status: string;
    recipientName: string;
    recipientType: string;
    totalValue: number;
    totalWeight: number;
    boxCount: number;
    priority: string;
  };
  classification: ShipmentClassification;
  payerAssignment: CourierPayerAssignment;
  costBreakdown: ShipmentCostBreakdown;
  insuranceCalculation?: InsuranceCalculation;
  dtdc: {
    success: boolean;
    awbNumber?: string;
    error?: string;
    trackingUrl?: string;
    fallbackMode?: boolean;
  };
  boxes: Array<{
    id: string;
    boxNumber: number;
    weight: number;
    value: number;
    dimensions: any;
    labelUrl?: string;
  }>;
  wallet: {
    deducted: number;
    transactionId?: string;
    remainingBalance: number;
    payerId: string;
    payerRole: string;
  };
  createdAt: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting enhanced shipment flow creation...');
    
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    console.log('✅ User authenticated:', user.email, user.role);

    const shipmentData: EnhancedShipmentRequest = req.body;
    console.log('📦 Enhanced shipment data received:', {
      recipientId: shipmentData.recipientId,
      recipientType: shipmentData.recipientType,
      partsCount: shipmentData.parts?.length || 0,
      boxesCount: shipmentData.boxes?.length || 0,
      returnReason: shipmentData.returnReason,
      insuranceRequired: shipmentData.insuranceRequired,
      declaredValue: shipmentData.declaredValue
    });

    // Validate required fields
    if (!shipmentData.recipientId || !shipmentData.recipientType) {
      return res.status(400).json({ error: 'Recipient ID and type are required' });
    }

    if (!shipmentData.parts || shipmentData.parts.length === 0) {
      return res.status(400).json({ error: 'At least one part is required' });
    }

    if (!shipmentData.boxes || shipmentData.boxes.length === 0) {
      return res.status(400).json({ error: 'Box allocation is required' });
    }

    // Step 1: Get recipient details and verify authorization
    console.log('🔍 Step 1: Verifying recipient and getting details...');
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
        return res.status(404).json({ error: 'Service center not found or not authorized' });
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
        return res.status(404).json({ error: 'Distributor not found or not authorized' });
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
        return res.status(404).json({ error: 'Customer not found' });
      }

      recipientAddress = recipient.customerProfile?.addresses?.[0];
      recipientRole = 'CUSTOMER';
    }

    if (!recipientAddress) {
      return res.status(400).json({ error: 'Recipient address not found' });
    }

    console.log('✅ Recipient verified:', recipient.name, 'Role:', recipientRole);

    // Step 2: Classify shipment type using new logic
    console.log('🧭 Step 2: Classifying shipment type...');
    const classification = classifyShipmentType(
      user.role,
      recipientRole as any,
      shipmentData.returnReason
    );

    console.log('✅ Shipment classified:', classification);

    // Step 3: Assign courier payer responsibility
    console.log('🧾 Step 3: Assigning courier payer...');
    const payerAssignment = assignCourierPayer(
      classification.shipment_type,
      classification.shipment_direction,
      classification.return_reason
    );

    console.log('✅ Payer assigned:', payerAssignment);

    // Step 4: Verify parts and calculate totals
    console.log('🔍 Step 4: Verifying parts and calculating totals...');
    const partIds = shipmentData.parts.map(p => p.partId);
    const parts = await prisma.part.findMany({
      where: {
        id: { in: partIds },
        brandId: user.id
      }
    });

    if (parts.length !== partIds.length) {
      return res.status(400).json({ error: 'Some parts not found or not owned by brand' });
    }

    let totalWeight = 0;
    let totalValue = 0;
    const partUpdates: Array<{ id: string; newStock: number }> = [];

    for (const selectedPart of shipmentData.parts) {
      const part = parts.find(p => p.id === selectedPart.partId);
      if (!part) {
        return res.status(400).json({ error: `Part ${selectedPart.partId} not found` });
      }

      if (part.stockQuantity < selectedPart.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for part ${part.code}. Available: ${part.stockQuantity}, Requested: ${selectedPart.quantity}` 
        });
      }

      const partWeight = part.weight || 0.5; // Default 500g if weight not specified
      totalWeight += partWeight * selectedPart.quantity;
      totalValue += part.price * selectedPart.quantity;
      partUpdates.push({
        id: part.id,
        newStock: part.stockQuantity - selectedPart.quantity
      });
    }

    // Ensure minimum weight for DTDC (100g minimum)
    totalWeight = Math.max(totalWeight, 0.1);

    // Use declared value if provided, otherwise use calculated total value
    const finalDeclaredValue = shipmentData.declaredValue || totalValue;

    console.log('✅ Parts verified. Total weight:', totalWeight, 'kg, Total value: ₹', totalValue);

    // Step 5: Get courier pricing configuration
    console.log('🧮 Step 5: Getting courier pricing configuration...');
    const pricing = await getCourierPricing(
      classification.shipment_type,
      payerAssignment.courier_payer,
      user.id
    );

    console.log('✅ Pricing configuration retrieved:', pricing);

    // Step 6: Calculate cost breakdown
    console.log('💰 Step 6: Calculating cost breakdown...');
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

    console.log('✅ Cost breakdown calculated:', costBreakdown);

    // Step 7: Calculate insurance if required
    let insuranceCalculation: InsuranceCalculation | undefined;
    if (shipmentData.insuranceRequired && finalDeclaredValue >= 5000) {
      insuranceCalculation = calculateInsuranceRequirement(finalDeclaredValue);
      console.log('🛡 Insurance calculated:', insuranceCalculation);
    }

    // Step 8: Determine who pays and check wallet balance
    console.log('💳 Step 8: Determining payer and checking wallet...');
    let payerId = user.id; // Default to current user
    let payerRole = user.role;

    // For now, only BRAND users can create shipments and they pay
    // In future, this logic can be extended based on payer assignment
    if (payerAssignment.courier_payer !== 'BRAND') {
      console.log(`⚠️ Payer should be ${payerAssignment.courier_payer}, but only BRAND can create shipments currently`);
    }

    const finalCost = costBreakdown.total_cost + (insuranceCalculation?.total_insurance_charge || 0);

    // Check wallet balance and deduct
    const walletResult = await deductFromWallet(
      payerId,
      finalCost,
      `${classification.shipment_type} shipment to ${recipient.name} (${shipmentData.recipientType})`,
      `SHIPMENT_${Date.now()}`,
      undefined
    );

    if (!walletResult.success) {
      return res.status(400).json({ 
        error: 'Insufficient wallet balance', 
        details: walletResult.error,
        required: finalCost,
        available: walletResult.currentBalance || 0,
        costBreakdown,
        payerAssignment
      });
    }

    console.log('✅ Wallet deducted successfully');

    // Step 9: Create shipment in database
    console.log('🔍 Step 9: Creating shipment in database...');
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
          shipmentFlowVersion: '1.0'
        })
      }
    });

    console.log('✅ Shipment created with ID:', shipment.id);

    // Step 10: Create boxes and box parts
    console.log('🔍 Step 10: Creating boxes...');
    const createdBoxes = [];
    
    for (let i = 0; i < shipmentData.boxes.length; i++) {
      const boxData = shipmentData.boxes[i];
      
      // Calculate box weight and value
      let boxWeight = 0;
      let boxValue = 0;
      
      for (const boxPart of boxData.parts) {
        const part = parts.find(p => p.id === boxPart.partId);
        if (part) {
          boxWeight += (part.weight || 0.5) * boxPart.quantity;
          boxValue += part.price * boxPart.quantity;
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

      createdBoxes.push({
        ...box,
        value: boxValue,
        dimensions: boxData.dimensions
      });
    }

    console.log('✅ Boxes created:', createdBoxes.length);

    // Step 11: Update part stock
    console.log('🔍 Step 11: Updating part stock...');
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
          reason: 'SHIPMENT',
          reference: shipment.id,
          previousQty: parts.find(p => p.id === update.id)?.stockQuantity || 0,
          newQty: update.newStock,
          notes: `Shipment ${shipment.id} - ${classification.shipment_type}`,
          createdBy: user.id
        }
      });
    }

    console.log('✅ Part stock updated');

    // Step 12: Generate AWB with enhanced DTDC integration
    console.log('🔍 Step 12: Generating AWB with enhanced DTDC integration...');
    let awbResult: any = { success: false };
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

      awbResult = await generateRobustAWB({
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

        console.log('✅ AWB generated successfully:', awbNumber);
      } else {
        console.log('⚠️ AWB generation failed, but shipment created:', awbResult.error);
        
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'AWB_PENDING',
            dtdcData: JSON.stringify({ error: awbResult.error || 'AWB generation failed' })
          }
        });
      }
    } catch (error) {
      console.error('❌ DTDC AWB generation error:', error);
      
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'AWB_PENDING',
          dtdcData: JSON.stringify({ error: error instanceof Error ? error.message : 'DTDC integration error' })
        }
      });
    }

    // Step 13: Generate labels for boxes
    console.log('🔍 Step 13: Generating box labels...');
    const boxesWithLabels = [];
    
    for (const box of createdBoxes) {
      let labelUrl = `/api/labels/download/fallback-${box.id}`;
      
      if (awbNumber) {
        try {
          const labelResult = await generateShipmentLabel({
            courier_name: 'DTDC',
            awb_number: awbNumber,
            shipment_id: shipment.id,
            box_id: box.id,
            format: 'PDF_4X6'
          });

          if (labelResult.success && labelResult.label_url) {
            labelUrl = labelResult.label_url;
          }
        } catch (error) {
          console.error(`❌ Label generation failed for box ${box.id}:`, error);
        }
      }

      boxesWithLabels.push({
        id: box.id,
        boxNumber: parseInt(box.boxNumber),
        weight: box.weight,
        value: box.value,
        dimensions: box.dimensions,
        labelUrl
      });
    }

    console.log('✅ Label generation completed');

    // Step 14: Send notifications
    console.log('🔍 Step 14: Sending notifications...');
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

      console.log('✅ Notifications sent');
    } catch (error) {
      console.error('⚠️ Notification sending failed:', error);
    }

    // Step 15: Return comprehensive response
    console.log('🎉 Enhanced shipment creation completed successfully!');
    
    const response: EnhancedShipmentResponse = {
      success: true,
      shipment: {
        id: shipment.id,
        awbNumber,
        status: shipment.status,
        recipientName: recipient.name,
        recipientType: shipmentData.recipientType,
        totalValue,
        totalWeight,
        boxCount: createdBoxes.length,
        priority: shipmentData.priority
      },
      classification,
      payerAssignment,
      costBreakdown,
      insuranceCalculation,
      dtdc: {
        success: awbResult.success,
        awbNumber,
        error: awbResult.error,
        trackingUrl: awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}` : undefined,
        fallbackMode: awbResult.fallbackMode
      },
      boxes: boxesWithLabels,
      wallet: {
        deducted: finalCost,
        transactionId: walletResult.transactionId,
        remainingBalance: walletResult.newBalance || 0,
        payerId,
        payerRole
      },
      createdAt: shipment.createdAt.toISOString()
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('❌ Enhanced shipment creation failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Enhanced shipment creation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}