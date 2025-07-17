import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting simple shipment creation...');
    
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
      notes = ''
    } = req.body;

    console.log('📦 Shipment data received:', {
      recipientId,
      recipientType,
      partsCount: parts?.length || 0,
      boxesCount: boxes?.length || 0
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
    const partUpdates: Array<{ id: string; newStock: number }> = [];

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

      totalWeight += (part.weight || 0.5) * selectedPart.quantity;
      totalValue += part.price * selectedPart.quantity;
      partUpdates.push({
        id: part.id,
        newStock: part.stockQuantity - selectedPart.quantity
      });
    }

    // Ensure minimum weight for DTDC (100g minimum)
    totalWeight = Math.max(totalWeight, 0.1);

    console.log('✅ Parts verified. Total weight:', totalWeight, 'kg, Total value: ₹', totalValue);

    // Step 3: Create shipment in database with current schema
    console.log('🔍 Step 3: Creating shipment in database...');
    
    // Determine recipient fields based on type
    const shipmentData: any = {
      brandId: user.id,
      numBoxes: boxes.length,
      status: 'INITIATED',
      recipientType,
      totalWeight: totalWeight, // Store the calculated weight
      totalValue: totalValue,   // Store the calculated value
      recipientAddress: recipientAddress ? JSON.stringify({
        street: recipientAddress.street || '',
        area: recipientAddress.area || '',
        city: recipientAddress.city || '',
        state: recipientAddress.state || '',
        pincode: recipientAddress.pincode || '',
        country: recipientAddress.country || 'India'
      }) : null,
      recipientPincode: recipientAddress?.pincode || '400001',
      estimatedCost: 100, // Default cost for now
      notes,
      priority
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

    console.log('✅ Shipment created with ID:', shipment.id);

    // Step 4: Create boxes and box parts
    console.log('🔍 Step 4: Creating boxes...');
    const createdBoxes = [];
    
    for (let i = 0; i < boxes.length; i++) {
      const boxData = boxes[i];
      
      const box = await prisma.box.create({
        data: {
          shipmentId: shipment.id,
          boxNumber: (i + 1).toString(),
          weight: boxData.parts.reduce((sum: number, p: any) => {
            const part = partsData.find((part: any) => part.id === p.partId);
            return sum + ((part?.weight || 0.5) * p.quantity);
          }, 0), // Weight is already in kg
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

    console.log('✅ Boxes created:', createdBoxes.length);

    // Step 5: Update part stock
    console.log('🔍 Step 5: Updating part stock...');
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
          quantity: -(partsData.find(p => p.id === update.id)!.stockQuantity - update.newStock),
          reason: 'SHIPMENT',
          reference: shipment.id,
          previousQty: partsData.find(p => p.id === update.id)!.stockQuantity,
          newQty: update.newStock,
          notes: `Shipment to ${recipient.name}`,
          createdBy: user.id
        }
      });
    }

    console.log('✅ Part stock updated');

    // Step 6: Create notification
    console.log('🔍 Step 6: Creating notification...');
    try {
      await prisma.notification.create({
        data: {
          title: 'New Shipment Created',
          message: `A new shipment from ${user.name} has been created. Shipment ID: ${shipment.id}`,
          type: 'SHIPMENT',
          recipients: [recipientId],
          data: JSON.stringify({
            shipmentId: shipment.id,
            totalValue,
            totalWeight: totalWeight,
            boxCount: createdBoxes.length
          })
        }
      });

      console.log('✅ Notification created');
    } catch (error) {
      console.error('⚠️ Notification creation failed:', error);
    }

    // Step 7: Return response
    console.log('🎉 Shipment creation completed successfully!');

    const response = {
      success: true,
      shipmentId: shipment.id,
      shipment: {
        id: shipment.id,
        status: shipment.status,
        recipientName: recipient.name,
        recipientType,
        totalValue,
        totalWeight: totalWeight,
        boxCount: createdBoxes.length,
        priority,
        createdAt: shipment.createdAt
      },
      boxes: createdBoxes.map(box => ({
        id: box.id,
        boxNumber: box.boxNumber,
        weight: box.weight,
        status: box.status
      })),
      message: 'Shipment created successfully! AWB generation and tracking will be available soon.'
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('❌ Simple shipment creation failed:', error);
    
    return res.status(500).json({
      error: 'Shipment creation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}