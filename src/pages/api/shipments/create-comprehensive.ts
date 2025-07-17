import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { generateAWB, generateShippingLabel } from '@/lib/dtdc-production';
import { deductFromWallet } from '@/lib/wallet';
import { calculateShippingCost } from '@/lib/unified-pricing';

interface ShipmentRequest {
  recipientId: string;
  recipientType: 'SERVICE_CENTER' | 'DISTRIBUTOR';
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
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
  estimatedWeight?: number;
  serviceCenterPincode?: string;
  numBoxes?: number;
  insurance?: {
    type: 'NONE' | 'CARRIER_RISK';
    declaredValue?: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting comprehensive shipment creation...');
    
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    console.log('✅ User authenticated:', user.email, user.role);

    // Only brands can create shipments
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Only brands can create shipments' });
    }

    const shipmentData: ShipmentRequest = req.body;
    console.log('📦 Shipment data received:', {
      recipientId: shipmentData.recipientId,
      recipientType: shipmentData.recipientType,
      partsCount: shipmentData.parts?.length || 0,
      boxesCount: shipmentData.boxes?.length || 0
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

    // Step 1: Verify recipient exists and is authorized
    console.log('🔍 Step 1: Verifying recipient...');
    let recipient: any = null;
    let recipientAddress: any = null;

    if (shipmentData.recipientType === 'SERVICE_CENTER') {
      const authorization = await prisma.brandAuthorizedServiceCenter.findFirst({
        where: {
          brandId: user.id,
          serviceCenterId: shipmentData.recipientId,
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
    } else {
      const authorization = await prisma.brandAuthorizedDistributor.findFirst({
        where: {
          brandId: user.id,
          distributorId: shipmentData.recipientId,
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
    }

    if (!recipientAddress) {
      return res.status(400).json({ error: 'Recipient address not found' });
    }

    console.log('✅ Recipient verified:', recipient.name);

    // Step 2: Verify parts and calculate totals
    console.log('🔍 Step 2: Verifying parts and calculating totals...');
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

      if (part.stock < selectedPart.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for part ${part.code}. Available: ${part.stock}, Requested: ${selectedPart.quantity}` 
        });
      }

      totalWeight += part.weight * selectedPart.quantity;
      totalValue += part.price * selectedPart.quantity;
      partUpdates.push({
        id: part.id,
        newStock: part.stock - selectedPart.quantity
      });
    }

    console.log('✅ Parts verified. Total weight:', totalWeight, 'g, Total value: ₹', totalValue);

    // Step 3: Calculate shipping cost using the same logic as cost estimation
    console.log('🔍 Step 3: Calculating shipping cost...');
    
    // Use the same cost estimation logic as the frontend
    const costEstimateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/shipments/cost-estimate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || ''
      },
      body: JSON.stringify({
        brandId: user.id,
        shipments: [{
          recipientId: shipmentData.recipientId,
          recipientType: shipmentData.recipientType,
          recipientPincode: recipientAddress.pincode || '400001',
          numBoxes: shipmentData.boxes.length,
          estimatedWeight: totalWeight / 1000, // Convert to kg
          priority: shipmentData.priority,
          insurance: shipmentData.insurance || { type: 'NONE' }
        }]
      })
    });

    let finalShippingCost = 0;
    let costBreakdownData = null;
    let insuranceData = null;

    if (costEstimateResponse.ok) {
      const costData = await costEstimateResponse.json();
      if (costData.success && costData.estimates && costData.estimates[0]) {
        const estimate = costData.estimates[0];
        finalShippingCost = estimate.finalTotal;
        costBreakdownData = estimate;
        insuranceData = estimate.insurance;
        console.log('✅ Cost calculated using estimation API:', {
          subtotal: estimate.subtotal,
          insurance: estimate.insurance?.totalInsurance || 0,
          finalTotal: estimate.finalTotal
        });
      } else {
        throw new Error('Failed to get cost estimate');
      }
    } else {
      // Fallback to basic calculation if cost estimate fails
      console.log('⚠️ Cost estimate API failed, using fallback calculation');
      const baseRate = 50 * shipmentData.boxes.length;
      const weightCost = Math.max(0, (totalWeight / 1000) - 0.5) * 25;
      const subtotal = Math.max(baseRate + weightCost, 75);
      
      // Calculate insurance if specified
      let insuranceCost = 0;
      if (shipmentData.insurance && shipmentData.insurance.type !== 'NONE') {
        const declaredValue = shipmentData.insurance.declaredValue || totalValue;
        const premium = declaredValue * 0.02; // 2% premium
        const gst = premium * 0.18; // 18% GST
        insuranceCost = premium + gst;
        
        insuranceData = {
          type: shipmentData.insurance.type,
          declaredValue,
          premium,
          gst,
          totalInsurance: insuranceCost
        };
      }
      
      finalShippingCost = subtotal + insuranceCost;
      costBreakdownData = {
        baseRate,
        weightCharges: weightCost,
        subtotal,
        insurance: insuranceData,
        finalTotal: finalShippingCost
      };
    }

    console.log('✅ Final shipping cost (including insurance): ₹', finalShippingCost);

    // Step 4: Check wallet balance and deduct
    console.log('🔍 Step 4: Checking wallet balance...');
    const walletResult = await deductFromWallet(
      user.id, 
      finalShippingCost, // Use the final cost including insurance
      `Shipment to ${recipient.name} (${shipmentData.recipientType})${insuranceData ? ' with insurance' : ''}`,
      `SHIPMENT_${Date.now()}`, // Use consistent SHIPMENT_ prefix
      undefined
    );

    if (!walletResult.success) {
      return res.status(400).json({ 
        error: 'Failed to create Shipment as Insufficient Bal', 
        details: walletResult.error,
        required: finalShippingCost,
        available: walletResult.currentBalance || 0
      });
    }

    console.log('✅ Wallet deducted successfully');

    // Step 5: Create shipment in database
    console.log('🔍 Step 5: Creating shipment in database...');
    const shipment = await prisma.shipment.create({
      data: {
        brandId: user.id,
        recipientId: shipmentData.recipientId,
        recipientType: shipmentData.recipientType,
        status: 'PENDING',
        priority: shipmentData.priority,
        notes: shipmentData.notes || '',
        totalWeight: totalWeight / 1000,
        totalValue,
        estimatedCost: finalShippingCost, // Use final cost including insurance
        actualCost: finalShippingCost, // Use final cost including insurance
        courierPartner: 'DTDC',
        recipientAddress: {
          street: recipientAddress.street || '',
          area: recipientAddress.area || '',
          city: recipientAddress.city || '',
          state: recipientAddress.state || '',
          pincode: recipientAddress.pincode || '',
          country: recipientAddress.country || 'India'
        },
        insurance: insuranceData || shipmentData.insurance || { type: 'NONE' },
        metadata: {
          walletDeducted: finalShippingCost,
          costBreakdown: costBreakdownData,
          transactionId: walletResult.transactionId,
          shipmentFlowVersion: 'V276'
        }
      }
    });

    console.log('✅ Shipment created with ID:', shipment.id);

    // Update the wallet transaction reference to include the shipment ID for easier refund tracking
    try {
      await prisma.walletTransaction.update({
        where: { id: walletResult.transactionId },
        data: { 
          reference: `SHIPMENT_${shipment.id}`,
          description: `Comprehensive shipment ${shipment.id} to ${recipient.name} (${shipmentData.recipientType})`
        }
      });
      console.log('✅ Wallet transaction reference updated with shipment ID');
    } catch (error) {
      console.error('⚠️ Failed to update wallet transaction reference:', error);
    }

    // Step 6: Create boxes and box parts
    console.log('🔍 Step 6: Creating boxes...');
    const createdBoxes = [];
    
    for (let i = 0; i < shipmentData.boxes.length; i++) {
      const boxData = shipmentData.boxes[i];
      
      const box = await prisma.box.create({
        data: {
          shipmentId: shipment.id,
          boxNumber: i + 1,
          dimensions: boxData.dimensions,
          weight: boxData.parts.reduce((sum, p) => {
            const part = parts.find(part => part.id === p.partId);
            return sum + (part ? part.weight * p.quantity : 0);
          }, 0) / 1000, // Convert to kg
          value: boxData.parts.reduce((sum, p) => {
            const part = parts.find(part => part.id === p.partId);
            return sum + (part ? part.price * p.quantity : 0);
          }, 0)
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

    console.log('✅ Boxes created:', createdBoxes.length);

    // Step 7: Update part stock
    console.log('🔍 Step 7: Updating part stock...');
    for (const update of partUpdates) {
      await prisma.part.update({
        where: { id: update.id },
        data: { stock: update.newStock }
      });
    }

    console.log('✅ Part stock updated');

    // Step 8: Generate AWB with DTDC Production API
    console.log('🔍 Step 8: Generating AWB with DTDC Production API...');
    let awbResult: any = { success: false };
    let awbNumber: string | null = null;

    try {
      awbResult = await generateAWB({
        // Required DTDC API fields
        consignee_name: recipient.name,
        consignee_phone: recipient.phone || '9999999999',
        consignee_address: `${recipientAddress.street || ''}, ${recipientAddress.area || ''}`.trim(),
        consignee_city: recipientAddress.city || '',
        consignee_state: recipientAddress.state || '',
        consignee_pincode: recipientAddress.pincode || '400001',
        weight: totalWeight / 1000, // Convert to kg
        pieces: shipmentData.boxes.length,
        declared_value: totalValue,
        reference_number: `SF-${shipment.id}`,
        shipment_id: shipment.id,
        box_id: createdBoxes[0]?.id, // For label generation
        pickup_pincode: '400069', // SpareFlow warehouse pincode
        product_type: 'NON-DOC'
      });

      if (awbResult.success && awbResult.awb_number) {
        awbNumber = awbResult.awb_number;
        
        // Update shipment with AWB
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            awbNumber,
            status: 'CONFIRMED',
            dtdcData: awbResult.dtdcResponse || {}
          }
        });

        console.log('✅ AWB generated successfully:', awbNumber);
      } else {
        console.log('⚠️ AWB generation failed, but shipment created:', awbResult.error);
        
        // Update shipment status to indicate AWB generation failed
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'AWB_PENDING',
            dtdcData: { error: awbResult.error || 'AWB generation failed' }
          }
        });
      }
    } catch (error) {
      console.error('❌ DTDC AWB generation error:', error);
      
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'AWB_PENDING',
          dtdcData: { error: error instanceof Error ? error.message : 'DTDC integration error' }
        }
      });
    }

    // Step 9: Generate labels for boxes
    console.log('🔍 Step 9: Generating box labels...');
    const labelResults = [];
    
    for (const box of createdBoxes) {
      try {
        const labelResult = await generateShippingLabel(
          awbNumber || `PENDING-${shipment.id}`,
          box.id
        );

        labelResults.push({
          boxId: box.id,
          success: labelResult.success,
          labelUrl: labelResult.label_url,
          error: labelResult.error
        });
      } catch (error) {
        console.error(`❌ Label generation failed for box ${box.id}:`, error);
        labelResults.push({
          boxId: box.id,
          success: false,
          error: error instanceof Error ? error.message : 'Label generation failed'
        });
      }
    }

    console.log('✅ Label generation completed');

    // Step 10: Send notifications
    console.log('🔍 Step 10: Sending notifications...');
    try {
      // Create notification for recipient
      await prisma.notification.create({
        data: {
          title: 'New Shipment Incoming',
          message: `A new shipment from ${user.name} is on its way. AWB: ${awbNumber || 'Pending'}`,
          type: 'SHIPMENT_CREATED',
          recipients: [shipmentData.recipientId],
          relatedEntityType: 'SHIPMENT',
          relatedEntityId: shipment.id,
          metadata: {
            shipmentId: shipment.id,
            awbNumber,
            totalValue,
            totalWeight: totalWeight / 1000
          }
        }
      });

      console.log('✅ Notifications sent');
    } catch (error) {
      console.error('⚠️ Notification sending failed:', error);
    }

    // Step 11: Return comprehensive response
    console.log('🎉 Shipment creation completed successfully!');
    
    const response = {
      success: true,
      shipment: {
        id: shipment.id,
        awbNumber,
        status: shipment.status,
        recipientName: recipient.name,
        recipientType: shipmentData.recipientType,
        totalValue,
        totalWeight: totalWeight / 1000,
        boxCount: createdBoxes.length,
        estimatedCost: finalShippingCost, // Use final cost including insurance
        priority: shipmentData.priority
      },
      dtdc: {
        success: awbResult.success,
        awbNumber,
        error: awbResult.error,
        trackingUrl: awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}` : null
      },
      boxes: createdBoxes.map(box => ({
        id: box.id,
        boxNumber: box.boxNumber,
        weight: box.weight,
        value: box.value,
        dimensions: box.dimensions
      })),
      labels: labelResults,
      costBreakdown: costBreakdownData || {
        baseRate: 0,
        weightCharges: 0,
        subtotal: 0,
        insurance: insuranceData,
        finalTotal: finalShippingCost
      },
      wallet: {
        deducted: finalShippingCost, // Show actual deducted amount
        transactionId: walletResult.transactionId,
        remainingBalance: walletResult.newBalance
      },
      createdAt: shipment.createdAt
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('❌ Comprehensive shipment creation failed:', error);
    
    return res.status(500).json({
      error: 'Shipment creation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}