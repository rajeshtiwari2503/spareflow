import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateAWB, generateForwardAWB, generateReverseAWB, createShipmentLabel } from '@/lib/dtdc-robust-production';
import { deductFromWallet } from '@/lib/wallet';
import { calculateShippingCost } from '@/lib/unified-pricing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting advanced shipment creation...');
    
    // Verify authentication
    const user = await verifyToken(req);
    if (!user) {
      console.log('❌ Authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only brands can create shipments
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Only brands can create shipments' });
    }

    const {
      recipientId,
      recipientType,
      parts,
      boxes,
      priority = 'MEDIUM',
      notes = '',
      estimatedWeight,
      serviceCenterPincode,
      numBoxes,
      insurance,
      courierPartner = 'DTDC',
      serviceType = 'STANDARD',
      shipmentType = 'FORWARD', // New field to specify shipment direction
      senderDetails, // For reverse shipments
      pickupAddress, // For reverse shipments
      destinationAddress // For reverse shipments
    } = req.body;

    console.log('📦 Advanced shipment data received:', {
      recipientId,
      recipientType,
      partsCount: parts?.length || 0,
      boxesCount: boxes?.length || 0,
      courierPartner,
      serviceType,
      shipmentType
    });

    // Validate required fields
    if (!recipientId || !recipientType) {
      return res.status(400).json({ error: 'Recipient ID and type are required' });
    }

    if (!parts || parts.length === 0) {
      return res.status(400).json({ error: 'At least one part is required' });
    }

    if (!boxes || boxes.length === 0) {
      return res.status(400).json({ error: 'Box allocation is required' });
    }

    // Step 1: Verify recipient exists and is authorized
    console.log('🔍 Step 1: Verifying recipient...');
    let recipient: any = null;
    let recipientAddress: any = null;

    if (recipientType === 'SERVICE_CENTER') {
      const authorization = await prisma.brandAuthorizedServiceCenter.findFirst({
        where: {
          brandId: user.id,
          serviceCenterUserId: recipientId,
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
          distributorUserId: recipientId,
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
    const partIds = parts.map((p: any) => p.partId);
    const partsData = await prisma.part.findMany({
      where: {
        id: { in: partIds },
        brandId: user.id
      }
    });

    if (partsData.length !== partIds.length) {
      return res.status(400).json({ error: 'Some parts not found or not owned by brand' });
    }

    let totalWeight = 0;
    let totalValue = 0;
    const partUpdates: Array<{ id: string; newStock: number; originalStock: number }> = [];

    for (const selectedPart of parts) {
      const part = partsData.find((p: any) => p.id === selectedPart.partId);
      if (!part) {
        return res.status(400).json({ error: `Part ${selectedPart.partId} not found` });
      }

      if (part.stockQuantity < selectedPart.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for part ${part.code}. Available: ${part.stockQuantity}, Requested: ${selectedPart.quantity}` 
        });
      }

      // Fix weight calculation - part.weight is stored in kg in database
      const partWeightInKg = part.weight || 0.5; // Default 0.5kg (500g) if no weight specified
      const partWeightInGrams = partWeightInKg * 1000; // Convert kg to grams for calculation
      
      console.log(`📦 Part ${part.code}: weight=${part.weight}kg (${partWeightInGrams}g), quantity=${selectedPart.quantity}`);
      
      totalWeight += partWeightInGrams * selectedPart.quantity;
      totalValue += part.price * selectedPart.quantity;
      partUpdates.push({
        id: part.id,
        newStock: part.stockQuantity - selectedPart.quantity,
        originalStock: part.stockQuantity
      });
    }

    console.log('✅ Parts verified. Total weight:', totalWeight, 'g (', (totalWeight / 1000).toFixed(3), 'kg), Total value: ₹', totalValue);

    // Step 3: Calculate shipping cost
    console.log('🔍 Step 3: Calculating shipping cost...');
    const weightInKg = Math.max(totalWeight / 1000, 0.1); // Ensure minimum 100g
    const shippingCost = await calculateShippingCost({
      brandId: user.id,
      weight: weightInKg,
      distance: 100,
      priority,
      numBoxes: boxes.length,
      declaredValue: totalValue,
      recipientPincode: recipientAddress.pincode || '400001'
    });

    console.log('✅ Shipping cost calculated: ₹', shippingCost.finalTotal, 'for weight:', weightInKg, 'kg');

    // Step 4: Check wallet balance and deduct
    console.log('🔍 Step 4: Checking wallet balance...');
    const walletResult = await deductFromWallet(
      user.id, 
      shippingCost.finalTotal, 
      `Advanced shipment to ${recipient.name} (${recipientType})`,
      `SHIPMENT_${Date.now()}`, // Use consistent SHIPMENT_ prefix
      undefined
    );

    if (!walletResult.success) {
      return res.status(400).json({ 
        error: 'Failed to create Shipment as Insufficient Bal', 
        details: walletResult.error,
        required: shippingCost.finalTotal,
        available: walletResult.currentBalance || 0
      });
    }

    console.log('✅ Wallet deducted successfully');

    // Step 5: Create advanced shipment in database
    console.log('🔍 Step 5: Creating advanced shipment in database...');
    
    // Determine recipient fields based on type
    const shipmentData: any = {
      brandId: user.id,
      recipientId,
      numBoxes: boxes.length,
      status: 'PENDING',
      recipientType,
      recipientAddress: JSON.stringify({
        street: recipientAddress.street || '',
        area: recipientAddress.area || '',
        city: recipientAddress.city || '',
        state: recipientAddress.state || '',
        pincode: recipientAddress.pincode || '',
        country: recipientAddress.country || 'India'
      }),
      recipientPincode: recipientAddress?.pincode || '400001',
      totalWeight: weightInKg,
      totalValue,
      estimatedCost: shippingCost.finalTotal,
      actualCost: shippingCost.finalTotal,
      courierPartner,
      declaredValue: totalValue,
      insurance: insurance ? JSON.stringify(insurance) : JSON.stringify({ type: 'NONE' }),
      notes,
      priority,
      expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      deliveryAttempts: 0,
      metadata: JSON.stringify({
        serviceType,
        costBreakdown: shippingCost,
        walletTransactionId: walletResult.transactionId,
        createdBy: user.id,
        createdByName: user.name
      })
    };

    // Set the correct recipient field based on type
    if (recipientType === 'SERVICE_CENTER') {
      shipmentData.serviceCenterId = recipientId;
    } else {
      shipmentData.distributorId = recipientId;
    }

    const shipment = await prisma.shipment.create({
      data: shipmentData
    });

    console.log('✅ Advanced shipment created with ID:', shipment.id);

    // Update the wallet transaction reference to include the shipment ID for easier refund tracking
    try {
      await prisma.walletTransaction.update({
        where: { id: walletResult.transactionId },
        data: { 
          reference: `SHIPMENT_${shipment.id}`,
          description: `Advanced shipment ${shipment.id} to ${recipient.name} (${recipientType})`
        }
      });
      console.log('✅ Wallet transaction reference updated with shipment ID');
    } catch (error) {
      console.error('⚠️ Failed to update wallet transaction reference:', error);
    }

    // Step 6: Create boxes and box parts
    console.log('🔍 Step 6: Creating boxes...');
    const createdBoxes = [];
    
    for (let i = 0; i < boxes.length; i++) {
      const boxData = boxes[i];
      
      const boxWeight = boxData.parts.reduce((sum: number, p: any) => {
        const part = partsData.find((part: any) => part.id === p.partId);
        const partWeightInKg = part?.weight || 0.5; // Weight is already in kg
        return sum + (partWeightInKg * p.quantity);
      }, 0); // Already in kg, no conversion needed

      const boxValue = boxData.parts.reduce((sum: number, p: any) => {
        const part = partsData.find((part: any) => part.id === p.partId);
        return sum + (part ? part.price * p.quantity : 0);
      }, 0);

      const box = await prisma.box.create({
        data: {
          shipmentId: shipment.id,
          boxNumber: (i + 1).toString(),
          weight: boxWeight,
          status: 'PENDING',
          customerPrice: boxValue,
          dtdcCost: shippingCost.finalTotal / boxes.length, // Distribute cost across boxes
          margin: boxValue - (shippingCost.finalTotal / boxes.length),
          marginPercent: ((boxValue - (shippingCost.finalTotal / boxes.length)) / boxValue) * 100
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

    // Step 7: Update part stock and create stock movements
    console.log('🔍 Step 7: Updating part stock...');
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
          quantity: -(update.originalStock - update.newStock),
          reason: 'SHIPMENT',
          reference: shipment.id,
          previousQty: update.originalStock,
          newQty: update.newStock,
          notes: `Advanced shipment to ${recipient.name} (${recipientType})`,
          createdBy: user.id
        }
      });
    }

    console.log('✅ Part stock updated');

    // Step 8: Generate AWB with DTDC (Forward or Reverse)
    console.log(`🔍 Step 8: Generating ${shipmentType} AWB with DTDC...`);
    let awbResult: any = { success: false };
    let awbNumber: string | null = null;

    try {
      // Prepare AWB request based on shipment type
      const awbRequest = {
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
        weight: weightInKg,
        declaredValue: totalValue,
        numBoxes: boxes.length,
        priority,
        shipmentType: shipmentType as 'FORWARD' | 'REVERSE',
        senderDetails: senderDetails || {
          name: user.name,
          phone: user.phone || '9999999999',
          address: {
            street: 'Tech Park, Andheri East',
            area: 'Near Metro Station',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400069',
            country: 'India'
          }
        }
      };

      // Generate AWB based on shipment type
      if (shipmentType === 'REVERSE') {
        awbResult = await generateReverseAWB(awbRequest);
      } else {
        awbResult = await generateForwardAWB(awbRequest);
      }

      if (awbResult.success && awbResult.awb_number) {
        awbNumber = awbResult.awb_number;
        
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            awbNumber,
            trackingNumber: awbNumber,
            status: 'AWB_GENERATED',
            dtdcData: JSON.stringify(awbResult.dtdcResponse || {}),
            pickedUpAt: new Date() // Set pickup time when AWB is generated
          }
        });

        // Update boxes with AWB number
        await prisma.box.updateMany({
          where: { shipmentId: shipment.id },
          data: { awbNumber }
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

    // Step 9: Generate labels for boxes
    console.log('🔍 Step 9: Generating box labels...');
    const labelResults = [];
    
    for (let i = 0; i < createdBoxes.length; i++) {
      const box = createdBoxes[i];
      const originalBoxData = boxes[i]; // Get the original box data for dimensions
      
      try {
        const labelResult = await createShipmentLabel({
          boxId: box.id,
          shipmentId: shipment.id,
          awbNumber: awbNumber || `PENDING-${shipment.id}`,
          recipientName: recipient.name,
          recipientAddress: {
            street: recipientAddress.street || '',
            area: recipientAddress.area || '',
            city: recipientAddress.city || '',
            state: recipientAddress.state || '',
            pincode: recipientAddress.pincode || '400001',
            country: recipientAddress.country || 'India'
          },
          boxNumber: parseInt(box.boxNumber),
          totalBoxes: createdBoxes.length,
          weight: box.weight,
          dimensions: originalBoxData?.dimensions || { length: 30, breadth: 20, height: 15 }
        });

        labelResults.push({
          boxId: box.id,
          success: labelResult.success,
          labelUrl: labelResult.labelUrl,
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

    // Step 10: Create margin log
    console.log('🔍 Step 10: Creating margin log...');
    try {
      await prisma.marginLog.create({
        data: {
          shipmentId: shipment.id,
          brandId: user.id,
          customerPrice: totalValue,
          dtdcCost: shippingCost.finalTotal,
          margin: totalValue - shippingCost.finalTotal,
          marginPercent: ((totalValue - shippingCost.finalTotal) / totalValue) * 100,
          awbNumber,
          weight: weightInKg,
          serviceType,
          origin: 'Brand Warehouse',
          destination: `${recipientAddress.city}, ${recipientAddress.state}`,
          notes: `Advanced shipment to ${recipientType}: ${recipient.name}`
        }
      });

      console.log('✅ Margin log created');
    } catch (error) {
      console.error('⚠️ Margin log creation failed:', error);
    }

    // Step 11: Create courier transaction record
    console.log('🔍 Step 11: Creating courier transaction...');
    try {
      await prisma.courierTransaction.create({
        data: {
          transactionNumber: `${shipmentType === 'REVERSE' ? 'REV-' : ''}TXN-${shipment.id}`,
          userId: user.id,
          courierType: shipmentType as any,
          serviceType: serviceType as any,
          direction: recipientType === 'SERVICE_CENTER' ? 'BRAND_TO_SERVICE_CENTER' : 'BRAND_TO_DISTRIBUTOR',
          awbNumber,
          weight: weightInKg,
          pieces: boxes.length,
          originPincode: '400001', // Brand's pincode (should be from brand profile)
          destinationPincode: recipientAddress.pincode || '400001',
          originAddress: 'Brand Warehouse', // Should be from brand profile
          destinationAddress: `${recipientAddress.street}, ${recipientAddress.city}`,
          baseRate: shippingCost.baseRate || 0,
          weightCharges: shippingCost.weightCharges || 0,
          serviceCharges: shippingCost.serviceCharges || 0,
          remoteAreaSurcharge: shippingCost.remoteAreaSurcharge || 0,
          platformMarkup: shippingCost.platformMarkup || 0,
          totalCost: shippingCost.finalTotal,
          walletDeducted: true,
          walletDeductionAmount: shippingCost.finalTotal,
          paymentStatus: 'COMPLETED',
          status: awbNumber ? 'BOOKED' : 'CREATED',
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          notes: `Advanced ${shipmentType.toLowerCase()} shipment via ${courierPartner}`
        }
      });

      console.log('✅ Courier transaction created');
    } catch (error) {
      console.error('⚠️ Courier transaction creation failed:', error);
    }

    // Step 12: Send notifications
    console.log('🔍 Step 12: Sending notifications...');
    try {
      await prisma.notification.create({
        data: {
          title: 'New Advanced Shipment Incoming',
          message: `A new advanced shipment from ${user.name} is on its way. AWB: ${awbNumber || 'Pending'}, Value: ₹${totalValue}`,
          type: 'SHIPMENT',
          priority: priority === 'CRITICAL' ? 'CRITICAL' : priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          recipients: [recipientId],
          data: JSON.stringify({
            shipmentId: shipment.id,
            awbNumber,
            totalValue,
            totalWeight: weightInKg,
            boxCount: createdBoxes.length,
            courierPartner,
            serviceType,
            trackingUrl: awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}` : null
          }),
          actionRequired: false,
          actionUrl: `/dashboard/shipments/${shipment.id}`
        }
      });

      console.log('✅ Notifications sent');
    } catch (error) {
      console.error('⚠️ Notification sending failed:', error);
    }

    // Step 13: Return comprehensive response
    console.log('🎉 Advanced shipment creation completed successfully!');

    const response = {
      success: true,
      shipmentId: shipment.id,
      awbNumber,
      trackingNumber: awbNumber,
      shipment: {
        id: shipment.id,
        awbNumber,
        trackingNumber: awbNumber,
        status: shipment.status,
        recipientName: recipient.name,
        recipientType,
        totalValue,
        totalWeight: weightInKg,
        boxCount: createdBoxes.length,
        estimatedCost: shippingCost.finalTotal,
        actualCost: shippingCost.finalTotal,
        courierPartner,
        priority,
        expectedDelivery: shipment.expectedDelivery,
        declaredValue: totalValue,
        insurance: insurance || { type: 'NONE' }
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
        status: box.status,
        awbNumber: box.awbNumber,
        customerPrice: box.customerPrice,
        dtdcCost: box.dtdcCost,
        margin: box.margin,
        marginPercent: box.marginPercent
      })),
      labels: labelResults,
      costBreakdown: shippingCost,
      wallet: {
        deducted: shippingCost.finalTotal,
        transactionId: walletResult.transactionId,
        remainingBalance: walletResult.newBalance
      },
      tracking: {
        awbNumber,
        courierPartner,
        status: shipment.status,
        trackingUrl: awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}` : null,
        expectedDelivery: shipment.expectedDelivery
      },
      createdAt: shipment.createdAt
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('❌ Advanced shipment creation failed:', error);
    
    return res.status(500).json({
      error: 'Advanced shipment creation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}