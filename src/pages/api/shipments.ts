import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetShipments(req, res);
  } else if (req.method === 'POST') {
    // Redirect POST requests to the advanced shipment creation API
    return res.status(301).json({ 
      error: 'Please use /api/shipments/create-advanced for shipment creation',
      redirect: '/api/shipments/create-advanced'
    });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetShipments(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { page = 1, limit = 10, status, search, priority, courierPartner } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause: any = {};

    // Filter by user role with enhanced logic
    if (user.role === 'BRAND') {
      whereClause.brandId = user.id;
    } else if (user.role === 'SERVICE_CENTER') {
      whereClause.serviceCenterId = user.id;
    } else if (user.role === 'DISTRIBUTOR') {
      whereClause.distributorId = user.id;
    } else if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Enhanced filtering options
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (priority && priority !== 'all') {
      whereClause.priority = priority;
    }

    if (courierPartner && courierPartner !== 'all') {
      whereClause.courierPartner = courierPartner;
    }

    // Enhanced search functionality
    if (search) {
      whereClause.OR = [
        { awbNumber: { contains: search as string, mode: 'insensitive' } },
        { trackingNumber: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
        { id: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where: whereClause,
        include: {
          brand: {
            select: { 
              id: true, 
              name: true, 
              email: true,
              brandProfile: {
                select: { companyName: true }
              }
            }
          },
          serviceCenter: {
            select: { 
              id: true, 
              name: true, 
              email: true,
              serviceCenterProfile: {
                select: { centerName: true }
              }
            }
          },
          distributor: {
            select: { 
              id: true, 
              name: true, 
              email: true,
              distributorProfile: {
                select: { companyName: true }
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
                      name: true, 
                      code: true, 
                      price: true,
                      weight: true,
                      category: true
                    }
                  }
                }
              }
            }
          },
          marginLogs: {
            orderBy: { calculatedAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.shipment.count({ where: whereClause })
    ]);

    // Parse JSON fields and enhance response
    const enhancedShipments = shipments.map(shipment => {
      let recipientAddress = null;
      let dtdcData = null;
      let trackingHistory = [];
      let metadata = null;
      let insurance = null;

      try {
        recipientAddress = shipment.recipientAddress ? JSON.parse(shipment.recipientAddress) : null;
        dtdcData = shipment.dtdcData ? JSON.parse(shipment.dtdcData) : null;
        trackingHistory = shipment.trackingHistory ? JSON.parse(shipment.trackingHistory) : [];
        metadata = shipment.metadata ? JSON.parse(shipment.metadata) : null;
        insurance = shipment.insurance ? JSON.parse(shipment.insurance) : null;
      } catch (e) {
        console.warn('Failed to parse JSON fields for shipment:', shipment.id);
      }

      // Calculate statistics
      const totalParts = shipment.boxes.reduce((sum, box) => 
        sum + box.boxParts.reduce((boxSum, bp) => boxSum + bp.quantity, 0), 0
      );

      const uniquePartTypes = new Set(
        shipment.boxes.flatMap(box => 
          box.boxParts.map(bp => bp.part.id)
        )
      ).size;

      return {
        ...shipment,
        recipientAddress,
        dtdcData,
        trackingHistory,
        metadata,
        insurance,
        statistics: {
          totalParts,
          uniquePartTypes,
          totalBoxes: shipment.boxes.length
        },
        margin: shipment.marginLogs.length > 0 ? shipment.marginLogs[0] : null,
        trackingUrl: shipment.awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${shipment.awbNumber}` : null
      };
    });

    return res.status(200).json({
      success: true,
      shipments: enhancedShipments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      },
      filters: {
        availableStatuses: [
          'INITIATED', 'PENDING', 'CONFIRMED', 'AWB_PENDING', 'AWB_GENERATED',
          'PICKUP_SCHEDULED', 'PICKUP_AWAITED', 'PICKUP_COMPLETED', 'DISPATCHED',
          'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'UNDELIVERED', 'RTO', 'CANCELLED', 'FAILED'
        ],
        availablePriorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        availableCouriers: ['DTDC', 'BLUEDART', 'FEDEX', 'DHL']
      }
    });

  } catch (error) {
    console.error('Error fetching shipments:', error);
    return res.status(500).json({ error: 'Failed to fetch shipments' });
  }
}

async function handleCreateShipment(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🚀 Starting comprehensive shipment creation...');
    
    // Verify authentication
    const user = await verifyToken(req);
    if (!user) {
      console.log('❌ Authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('✅ User authenticated:', user.email, user.role);

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
      insurance
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
          serviceCenterId: recipientId,
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
          distributorId: recipientId,
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
    const partUpdates: Array<{ id: string; newStock: number }> = [];

    for (const selectedPart of parts) {
      const part = partsData.find((p: any) => p.id === selectedPart.partId);
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

    // Step 3: Calculate shipping cost
    console.log('🔍 Step 3: Calculating shipping cost...');
    const shippingCost = await calculateShippingCost({
      brandId: user.id,
      weight: totalWeight / 1000,
      distance: 100,
      priority,
      numBoxes: boxes.length,
      declaredValue: totalValue,
      recipientPincode: recipientAddress.pincode || '400001'
    });

    console.log('✅ Shipping cost calculated: ₹', shippingCost.finalTotal);

    // Step 4: Check wallet balance and deduct
    console.log('🔍 Step 4: Checking wallet balance...');
    const walletResult = await deductFromWallet(
      user.id, 
      shippingCost.finalTotal, 
      `Shipment to ${recipient.name} (${recipientType})`,
      `SHIPMENT_${Date.now()}`,
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

    // Step 5: Create shipment in database
    console.log('🔍 Step 5: Creating shipment in database...');
    const shipment = await prisma.shipment.create({
      data: {
        brandId: user.id,
        recipientId,
        recipientType,
        status: 'PENDING',
        priority,
        notes,
        totalWeight: totalWeight / 1000,
        totalValue,
        estimatedCost: shippingCost.finalTotal,
        actualCost: shippingCost.finalTotal,
        courierPartner: 'DTDC',
        recipientAddress: {
          street: recipientAddress.street || '',
          area: recipientAddress.area || '',
          city: recipientAddress.city || '',
          state: recipientAddress.state || '',
          pincode: recipientAddress.pincode || '',
          country: recipientAddress.country || 'India'
        },
        insurance: insurance || { type: 'NONE' }
      }
    });

    console.log('✅ Shipment created with ID:', shipment.id);

    // Step 6: Create boxes and box parts
    console.log('🔍 Step 6: Creating boxes...');
    const createdBoxes = [];
    
    for (let i = 0; i < boxes.length; i++) {
      const boxData = boxes[i];
      
      const box = await prisma.box.create({
        data: {
          shipmentId: shipment.id,
          boxNumber: i + 1,
          dimensions: boxData.dimensions,
          weight: boxData.parts.reduce((sum: number, p: any) => {
            const part = partsData.find((part: any) => part.id === p.partId);
            return sum + (part ? part.weight * p.quantity : 0);
          }, 0) / 1000,
          value: boxData.parts.reduce((sum: number, p: any) => {
            const part = partsData.find((part: any) => part.id === p.partId);
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

    // Step 8: Generate AWB with DTDC
    console.log('🔍 Step 8: Generating AWB with DTDC...');
    let awbResult: any = { success: false };
    let awbNumber: string | null = null;

    try {
      awbResult = await generateAWB({
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
        weight: totalWeight / 1000,
        declaredValue: totalValue,
        numBoxes: boxes.length,
        priority
      });

      if (awbResult.success && awbResult.awbNumber) {
        awbNumber = awbResult.awbNumber;
        
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
          boxNumber: box.boxNumber,
          totalBoxes: createdBoxes.length,
          weight: box.weight,
          dimensions: box.dimensions
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

    // Step 10: Send notifications
    console.log('🔍 Step 10: Sending notifications...');
    try {
      await prisma.notification.create({
        data: {
          title: 'New Shipment Incoming',
          message: `A new shipment from ${user.name} is on its way. AWB: ${awbNumber || 'Pending'}`,
          type: 'SHIPMENT_CREATED',
          recipients: [recipientId],
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
      shipmentId: shipment.id,
      awbNumber,
      trackingNumber: awbNumber,
      shipment: {
        id: shipment.id,
        awbNumber,
        status: shipment.status,
        recipientName: recipient.name,
        recipientType,
        totalValue,
        totalWeight: totalWeight / 1000,
        boxCount: createdBoxes.length,
        estimatedCost: shippingCost.finalTotal,
        priority
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
      costBreakdown: shippingCost,
      wallet: {
        deducted: shippingCost.finalTotal,
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