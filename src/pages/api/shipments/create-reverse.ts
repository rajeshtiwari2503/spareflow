import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateReverseAWB, createShipmentLabel } from '@/lib/dtdc-robust-production';
import { deductFromWallet } from '@/lib/wallet';
import { calculateShippingCost } from '@/lib/unified-pricing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting reverse shipment creation...');
    
    // Verify authentication
    const user = await verifyToken(req);
    if (!user) {
      console.log('❌ Authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Service centers and distributors can create reverse shipments
    if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(user.role)) {
      return res.status(403).json({ error: 'Only service centers and distributors can create reverse shipments' });
    }

    const {
      brandId,
      parts,
      boxes,
      priority = 'MEDIUM',
      notes = '',
      estimatedWeight,
      returnReason = 'DEFECTIVE',
      costResponsibility = 'BRAND',
      numBoxes,
      insurance,
      courierPartner = 'DTDC',
      serviceType = 'STANDARD',
      pickupAddress,
      destinationAddress
    } = req.body;

    console.log('📦 Reverse shipment data received:', {
      brandId,
      partsCount: parts?.length || 0,
      boxesCount: boxes?.length || 0,
      returnReason,
      costResponsibility,
      courierPartner,
      serviceType
    });

    // Validate required fields
    if (!brandId) {
      return res.status(400).json({ error: 'Brand ID is required for reverse shipments' });
    }

    if (!parts || parts.length === 0) {
      return res.status(400).json({ error: 'At least one part is required' });
    }

    if (!boxes || boxes.length === 0) {
      return res.status(400).json({ error: 'Box allocation is required' });
    }

    if (!pickupAddress) {
      return res.status(400).json({ error: 'Pickup address is required for reverse shipments' });
    }

    // Step 1: Verify brand exists and is authorized
    console.log('🔍 Step 1: Verifying brand authorization...');
    let brandUser: any = null;
    let isAuthorized = false;

    if (user.role === 'SERVICE_CENTER') {
      const authorization = await prisma.brandAuthorizedServiceCenter.findFirst({
        where: {
          brandId,
          serviceCenterUserId: user.id,
          status: 'Active'
        },
        include: {
          brand: {
            include: {
              brandProfile: {
                include: {
                  addresses: true
                }
              }
            }
          }
        }
      });

      if (authorization) {
        brandUser = authorization.brand;
        isAuthorized = true;
      }
    } else if (user.role === 'DISTRIBUTOR') {
      const authorization = await prisma.brandAuthorizedDistributor.findFirst({
        where: {
          brandId,
          distributorUserId: user.id,
          status: 'Active'
        },
        include: {
          brand: {
            include: {
              brandProfile: {
                include: {
                  addresses: true
                }
              }
            }
          }
        }
      });

      if (authorization) {
        brandUser = authorization.brand;
        isAuthorized = true;
      }
    }

    if (!isAuthorized || !brandUser) {
      return res.status(404).json({ error: 'Brand not found or not authorized for reverse shipments' });
    }

    console.log('✅ Brand authorization verified:', brandUser.name);

    // Step 2: Verify parts belong to the brand
    console.log('🔍 Step 2: Verifying parts ownership...');
    const partIds = parts.map((p: any) => p.partId);
    const partsData = await prisma.part.findMany({
      where: {
        id: { in: partIds },
        brandId: brandId
      }
    });

    if (partsData.length !== partIds.length) {
      return res.status(400).json({ error: 'Some parts not found or not owned by the specified brand' });
    }

    let totalWeight = 0;
    let totalValue = 0;

    for (const selectedPart of parts) {
      const part = partsData.find((p: any) => p.id === selectedPart.partId);
      if (!part) {
        return res.status(400).json({ error: `Part ${selectedPart.partId} not found` });
      }

      // For reverse shipments, we don't check stock as items are being returned
      const partWeightInKg = part.weight || 0.5; // Default 0.5kg if no weight specified
      const partWeightInGrams = partWeightInKg * 1000;
      
      console.log(`📦 Return Part ${part.code}: weight=${part.weight}kg (${partWeightInGrams}g), quantity=${selectedPart.quantity}`);
      
      totalWeight += partWeightInGrams * selectedPart.quantity;
      totalValue += part.price * selectedPart.quantity;
    }

    console.log('✅ Parts verified. Total weight:', totalWeight, 'g (', (totalWeight / 1000).toFixed(3), 'kg), Total value: ₹', totalValue);

    // Step 3: Calculate shipping cost for reverse shipment
    console.log('🔍 Step 3: Calculating reverse shipping cost...');
    const weightInKg = Math.max(totalWeight / 1000, 0.1);
    
    // For reverse shipments, cost calculation might be different
    const shippingCost = await calculateShippingCost({
      brandId: brandId,
      weight: weightInKg,
      distance: 100,
      priority,
      numBoxes: boxes.length,
      declaredValue: totalValue,
      recipientPincode: destinationAddress?.pincode || '400001',
      shipmentType: 'REVERSE'
    });

    console.log('✅ Reverse shipping cost calculated: ₹', shippingCost.finalTotal, 'for weight:', weightInKg, 'kg');

    // Step 4: Handle payment based on cost responsibility
    console.log('🔍 Step 4: Handling payment based on cost responsibility...');
    let payerId = brandId; // Default to brand paying
    let walletResult: any = { success: true, transactionId: null };

    if (costResponsibility === 'SERVICE_CENTER' && user.role === 'SERVICE_CENTER') {
      payerId = user.id;
    } else if (costResponsibility === 'DISTRIBUTOR' && user.role === 'DISTRIBUTOR') {
      payerId = user.id;
    }

    // Only deduct wallet if cost responsibility is not on brand for defective items
    if (!(returnReason === 'DEFECTIVE' && costResponsibility === 'BRAND')) {
      walletResult = await deductFromWallet(
        payerId, 
        shippingCost.finalTotal, 
        `Reverse shipment to ${brandUser.name} (${returnReason})`,
        `REV_SHIPMENT_${Date.now()}`,
        undefined
      );

      if (!walletResult.success) {
        return res.status(400).json({ 
          error: 'Failed to create reverse shipment due to insufficient balance', 
          details: walletResult.error,
          required: shippingCost.finalTotal,
          available: walletResult.currentBalance || 0,
          costResponsibility
        });
      }
    }

    console.log('✅ Payment handled successfully');

    // Step 5: Create reverse shipment in database
    console.log('🔍 Step 5: Creating reverse shipment in database...');
    
    const shipmentData: any = {
      brandId: brandId,
      recipientId: brandId, // Brand is the recipient for reverse shipments
      numBoxes: boxes.length,
      status: 'PENDING',
      recipientType: 'BRAND',
      recipientAddress: JSON.stringify(destinationAddress || {
        street: 'Tech Park, Andheri East',
        area: 'Near Metro Station',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400069',
        country: 'India'
      }),
      recipientPincode: destinationAddress?.pincode || '400069',
      totalWeight: weightInKg,
      totalValue,
      estimatedCost: shippingCost.finalTotal,
      actualCost: shippingCost.finalTotal,
      courierPartner,
      declaredValue: totalValue,
      insurance: insurance ? JSON.stringify(insurance) : JSON.stringify({ type: 'NONE' }),
      notes: `${notes} | Return Reason: ${returnReason} | Cost Responsibility: ${costResponsibility}`,
      priority,
      expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      deliveryAttempts: 0,
      metadata: JSON.stringify({
        serviceType,
        costBreakdown: shippingCost,
        walletTransactionId: walletResult.transactionId,
        createdBy: user.id,
        createdByName: user.name,
        shipmentType: 'REVERSE',
        returnReason,
        costResponsibility,
        payerId
      })
    };

    // Set the correct sender field based on user role
    if (user.role === 'SERVICE_CENTER') {
      shipmentData.serviceCenterId = user.id;
    } else {
      shipmentData.distributorId = user.id;
    }

    const shipment = await prisma.shipment.create({
      data: shipmentData
    });

    console.log('✅ Reverse shipment created with ID:', shipment.id);

    // Step 6: Create boxes and box parts
    console.log('🔍 Step 6: Creating boxes for reverse shipment...');
    const createdBoxes = [];
    
    for (let i = 0; i < boxes.length; i++) {
      const boxData = boxes[i];
      
      const boxWeight = boxData.parts.reduce((sum: number, p: any) => {
        const part = partsData.find((part: any) => part.id === p.partId);
        const partWeightInKg = part?.weight || 0.5;
        return sum + (partWeightInKg * p.quantity);
      }, 0);

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
          dtdcCost: shippingCost.finalTotal / boxes.length,
          margin: -(shippingCost.finalTotal / boxes.length), // Negative margin for reverse shipments
          marginPercent: -((shippingCost.finalTotal / boxes.length) / boxValue) * 100
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

    // Step 7: Generate AWB with DTDC for reverse shipment
    console.log('🔍 Step 7: Generating reverse AWB with DTDC...');
    let awbResult: any = { success: false };
    let awbNumber: string | null = null;

    try {
      awbResult = await generateReverseAWB({
        shipmentId: shipment.id,
        recipientName: brandUser.name,
        recipientPhone: brandUser.phone || '9999999999',
        recipientAddress: destinationAddress || {
          street: 'Tech Park, Andheri East',
          area: 'Near Metro Station',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400069',
          country: 'India'
        },
        weight: weightInKg,
        declaredValue: totalValue,
        numBoxes: boxes.length,
        priority,
        senderDetails: {
          name: user.name,
          phone: user.phone || '9999999999',
          address: pickupAddress
        }
      });

      if (awbResult.success && awbResult.awb_number) {
        awbNumber = awbResult.awb_number;
        
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            awbNumber,
            trackingNumber: awbNumber,
            status: 'AWB_GENERATED',
            dtdcData: JSON.stringify(awbResult.dtdcResponse || {}),
            pickedUpAt: new Date()
          }
        });

        // Update boxes with AWB number
        await prisma.box.updateMany({
          where: { shipmentId: shipment.id },
          data: { awbNumber }
        });

        console.log('✅ Reverse AWB generated successfully:', awbNumber);
      } else {
        console.log('⚠️ Reverse AWB generation failed, but shipment created:', awbResult.error);
        
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'AWB_PENDING',
            dtdcData: JSON.stringify({ error: awbResult.error || 'AWB generation failed' })
          }
        });
      }
    } catch (error) {
      console.error('❌ DTDC reverse AWB generation error:', error);
      
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'AWB_PENDING',
          dtdcData: JSON.stringify({ error: error instanceof Error ? error.message : 'DTDC integration error' })
        }
      });
    }

    // Step 8: Generate labels for boxes
    console.log('🔍 Step 8: Generating reverse shipment labels...');
    const labelResults = [];
    
    for (let i = 0; i < createdBoxes.length; i++) {
      const box = createdBoxes[i];
      const originalBoxData = boxes[i];
      
      try {
        const labelResult = await createShipmentLabel({
          boxId: box.id,
          shipmentId: shipment.id,
          awbNumber: awbNumber || `PENDING-${shipment.id}`,
          recipientName: brandUser.name,
          recipientAddress: destinationAddress || {
            street: 'Tech Park, Andheri East',
            area: 'Near Metro Station',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400069',
            country: 'India'
          },
          boxNumber: parseInt(box.boxNumber),
          totalBoxes: createdBoxes.length,
          weight: box.weight,
          dimensions: originalBoxData?.dimensions || { length: 30, breadth: 20, height: 15 },
          shipmentType: 'REVERSE'
        });

        labelResults.push({
          boxId: box.id,
          success: labelResult.success,
          labelUrl: labelResult.labelUrl,
          error: labelResult.error
        });
      } catch (error) {
        console.error(`❌ Reverse label generation failed for box ${box.id}:`, error);
        labelResults.push({
          boxId: box.id,
          success: false,
          error: error instanceof Error ? error.message : 'Label generation failed'
        });
      }
    }

    console.log('✅ Reverse label generation completed');

    // Step 9: Create courier transaction record
    console.log('🔍 Step 9: Creating reverse courier transaction...');
    try {
      await prisma.courierTransaction.create({
        data: {
          transactionNumber: `REV-TXN-${shipment.id}`,
          userId: user.id,
          payerId: payerId,
          courierType: 'REVERSE',
          serviceType: serviceType as any,
          direction: user.role === 'SERVICE_CENTER' ? 'SERVICE_CENTER_TO_BRAND' : 'DISTRIBUTOR_TO_BRAND',
          awbNumber,
          weight: weightInKg,
          pieces: boxes.length,
          originPincode: pickupAddress.pincode,
          destinationPincode: destinationAddress?.pincode || '400069',
          originAddress: `${pickupAddress.street}, ${pickupAddress.city}`,
          destinationAddress: destinationAddress ? `${destinationAddress.street}, ${destinationAddress.city}` : 'SpareFlow Warehouse, Mumbai',
          baseRate: shippingCost.baseRate || 0,
          weightCharges: shippingCost.weightCharges || 0,
          serviceCharges: shippingCost.serviceCharges || 0,
          remoteAreaSurcharge: shippingCost.remoteAreaSurcharge || 0,
          platformMarkup: shippingCost.platformMarkup || 0,
          totalCost: shippingCost.finalTotal,
          costResponsibility,
          returnReason,
          walletDeducted: walletResult.transactionId ? true : false,
          walletDeductionAmount: walletResult.transactionId ? shippingCost.finalTotal : 0,
          paymentStatus: walletResult.transactionId ? 'COMPLETED' : 'PENDING',
          status: awbNumber ? 'BOOKED' : 'CREATED',
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          notes: `Reverse shipment via ${courierPartner} - ${returnReason}`
        }
      });

      console.log('✅ Reverse courier transaction created');
    } catch (error) {
      console.error('⚠️ Reverse courier transaction creation failed:', error);
    }

    // Step 10: Send notifications
    console.log('🔍 Step 10: Sending reverse shipment notifications...');
    try {
      await prisma.notification.create({
        data: {
          title: 'New Reverse Shipment Initiated',
          message: `A reverse shipment has been initiated by ${user.name}. AWB: ${awbNumber || 'Pending'}, Value: ₹${totalValue}, Reason: ${returnReason}`,
          type: 'SHIPMENT',
          priority: priority === 'CRITICAL' ? 'CRITICAL' : priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          recipients: [brandId],
          data: JSON.stringify({
            shipmentId: shipment.id,
            awbNumber,
            totalValue,
            totalWeight: weightInKg,
            boxCount: createdBoxes.length,
            courierPartner,
            serviceType,
            returnReason,
            costResponsibility,
            trackingUrl: awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}` : null
          }),
          actionRequired: false,
          actionUrl: `/dashboard/shipments/${shipment.id}`
        }
      });

      console.log('✅ Reverse shipment notifications sent');
    } catch (error) {
      console.error('⚠️ Notification sending failed:', error);
    }

    // Step 11: Return comprehensive response
    console.log('🎉 Reverse shipment creation completed successfully!');

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
        recipientName: brandUser.name,
        recipientType: 'BRAND',
        totalValue,
        totalWeight: weightInKg,
        boxCount: createdBoxes.length,
        estimatedCost: shippingCost.finalTotal,
        actualCost: shippingCost.finalTotal,
        courierPartner,
        priority,
        expectedDelivery: shipment.expectedDelivery,
        declaredValue: totalValue,
        insurance: insurance || { type: 'NONE' },
        shipmentType: 'REVERSE',
        returnReason,
        costResponsibility
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
        deducted: walletResult.transactionId ? shippingCost.finalTotal : 0,
        transactionId: walletResult.transactionId,
        remainingBalance: walletResult.newBalance,
        paidBy: payerId,
        costResponsibility
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
    console.error('❌ Reverse shipment creation failed:', error);
    
    return res.status(500).json({
      error: 'Reverse shipment creation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}