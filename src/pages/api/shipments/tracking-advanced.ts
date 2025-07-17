import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shipmentId, awbNumber } = req.query;

    if (!shipmentId && !awbNumber) {
      return res.status(400).json({ error: 'Either shipmentId or awbNumber is required' });
    }

    // Build where clause based on provided parameters
    let whereClause: any = {};
    
    if (shipmentId) {
      whereClause.id = shipmentId as string;
    } else if (awbNumber) {
      whereClause.awbNumber = awbNumber as string;
    }

    // Add user-based filtering
    if (user.role === 'BRAND') {
      whereClause.brandId = user.id;
    } else if (user.role === 'SERVICE_CENTER') {
      whereClause.serviceCenterId = user.id;
    } else if (user.role === 'DISTRIBUTOR') {
      whereClause.distributorId = user.id;
    } else if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch shipment with comprehensive details
    const shipment = await prisma.shipment.findFirst({
      where: whereClause,
      include: {
        brand: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            brandProfile: {
              select: {
                companyName: true,
                addresses: {
                  select: {
                    street: true,
                    city: true,
                    state: true,
                    pincode: true
                  }
                }
              }
            }
          }
        },
        serviceCenter: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            serviceCenterProfile: {
              select: {
                centerName: true,
                addresses: {
                  select: {
                    street: true,
                    city: true,
                    state: true,
                    pincode: true
                  }
                }
              }
            }
          }
        },
        distributor: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            distributorProfile: {
              select: {
                companyName: true,
                address: {
                  select: {
                    street: true,
                    city: true,
                    state: true,
                    pincode: true
                  }
                }
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
                    name: true, 
                    code: true, 
                    price: true,
                    weight: true,
                    category: true
                  }
                }
              }
            },
            trackingHistory: {
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        marginLogs: {
          orderBy: { calculatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Parse JSON fields
    let recipientAddress = null;
    let dtdcData = null;
    let trackingHistory = [];
    let metadata = null;
    let insurance = null;

    try {
      recipientAddress = shipment.recipientAddress ? JSON.parse(shipment.recipientAddress) : null;
    } catch (e) {
      console.warn('Failed to parse recipientAddress:', e);
    }

    try {
      dtdcData = shipment.dtdcData ? JSON.parse(shipment.dtdcData) : null;
    } catch (e) {
      console.warn('Failed to parse dtdcData:', e);
    }

    try {
      trackingHistory = shipment.trackingHistory ? JSON.parse(shipment.trackingHistory) : [];
    } catch (e) {
      console.warn('Failed to parse trackingHistory:', e);
    }

    try {
      metadata = shipment.metadata ? JSON.parse(shipment.metadata) : null;
    } catch (e) {
      console.warn('Failed to parse metadata:', e);
    }

    try {
      insurance = shipment.insurance ? JSON.parse(shipment.insurance) : null;
    } catch (e) {
      console.warn('Failed to parse insurance:', e);
    }

    // Calculate shipment statistics
    const totalParts = shipment.boxes.reduce((sum, box) => 
      sum + box.boxParts.reduce((boxSum, bp) => boxSum + bp.quantity, 0), 0
    );

    const uniquePartTypes = new Set(
      shipment.boxes.flatMap(box => 
        box.boxParts.map(bp => bp.part.id)
      )
    ).size;

    // Determine current status and next expected action
    const statusMapping = {
      'INITIATED': { label: 'Shipment Initiated', color: 'blue', progress: 10 },
      'PENDING': { label: 'Pending Processing', color: 'yellow', progress: 20 },
      'CONFIRMED': { label: 'Shipment Confirmed', color: 'green', progress: 30 },
      'AWB_PENDING': { label: 'AWB Generation Pending', color: 'orange', progress: 35 },
      'AWB_GENERATED': { label: 'AWB Generated', color: 'green', progress: 40 },
      'PICKUP_SCHEDULED': { label: 'Pickup Scheduled', color: 'blue', progress: 50 },
      'PICKUP_AWAITED': { label: 'Pickup Awaited', color: 'yellow', progress: 55 },
      'PICKUP_COMPLETED': { label: 'Pickup Completed', color: 'green', progress: 60 },
      'DISPATCHED': { label: 'Dispatched', color: 'blue', progress: 65 },
      'IN_TRANSIT': { label: 'In Transit', color: 'blue', progress: 75 },
      'OUT_FOR_DELIVERY': { label: 'Out for Delivery', color: 'purple', progress: 90 },
      'DELIVERED': { label: 'Delivered', color: 'green', progress: 100 },
      'UNDELIVERED': { label: 'Undelivered', color: 'red', progress: 85 },
      'RTO': { label: 'Return to Origin', color: 'orange', progress: 70 },
      'CANCELLED': { label: 'Cancelled', color: 'red', progress: 0 },
      'FAILED': { label: 'Failed', color: 'red', progress: 0 }
    };

    const currentStatus = statusMapping[shipment.status as keyof typeof statusMapping] || 
      { label: shipment.status, color: 'gray', progress: 0 };

    // Build comprehensive tracking response
    const trackingResponse = {
      success: true,
      shipment: {
        id: shipment.id,
        awbNumber: shipment.awbNumber,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        statusInfo: currentStatus,
        
        // Basic details
        recipientType: shipment.recipientType,
        courierPartner: shipment.courierPartner,
        priority: shipment.priority,
        notes: shipment.notes,
        
        // Weight and value
        totalWeight: shipment.totalWeight,
        totalValue: shipment.totalValue,
        declaredValue: shipment.declaredValue,
        
        // Costs
        estimatedCost: shipment.estimatedCost,
        actualCost: shipment.actualCost,
        
        // Dates
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt,
        expectedDelivery: shipment.expectedDelivery,
        actualDelivery: shipment.actualDelivery,
        pickedUpAt: shipment.pickedUpAt,
        inTransitAt: shipment.inTransitAt,
        outForDeliveryAt: shipment.outForDeliveryAt,
        deliveredAt: shipment.deliveredAt,
        
        // Delivery info
        deliveryAttempts: shipment.deliveryAttempts,
        
        // Additional data
        insurance,
        metadata,
        dtdcData
      },
      
      // Sender information
      sender: {
        id: shipment.brand.id,
        name: shipment.brand.name,
        email: shipment.brand.email,
        companyName: shipment.brand.brandProfile?.companyName,
        address: shipment.brand.brandProfile?.addresses?.[0]
      },
      
      // Recipient information
      recipient: {
        type: shipment.recipientType,
        address: recipientAddress,
        details: shipment.recipientType === 'SERVICE_CENTER' ? {
          id: shipment.serviceCenter?.id,
          name: shipment.serviceCenter?.name,
          email: shipment.serviceCenter?.email,
          centerName: shipment.serviceCenter?.serviceCenterProfile?.centerName,
          address: shipment.serviceCenter?.serviceCenterProfile?.addresses?.[0]
        } : {
          id: shipment.distributor?.id,
          name: shipment.distributor?.name,
          email: shipment.distributor?.email,
          companyName: shipment.distributor?.distributorProfile?.companyName,
          address: shipment.distributor?.distributorProfile?.address
        }
      },
      
      // Box details
      boxes: shipment.boxes.map(box => ({
        id: box.id,
        boxNumber: box.boxNumber,
        awbNumber: box.awbNumber,
        weight: box.weight,
        status: box.status,
        
        // Pricing
        customerPrice: box.customerPrice,
        dtdcCost: box.dtdcCost,
        margin: box.margin,
        marginPercent: box.marginPercent,
        
        // Parts in this box
        parts: box.boxParts.map(bp => ({
          id: bp.part.id,
          name: bp.part.name,
          code: bp.part.code,
          quantity: bp.quantity,
          unitPrice: bp.part.price,
          totalPrice: bp.part.price * bp.quantity,
          weight: bp.part.weight,
          category: bp.part.category
        })),
        
        // Box tracking history
        trackingHistory: box.trackingHistory.map(th => ({
          id: th.id,
          awbNumber: th.awbNumber,
          scanCode: th.scanCode,
          status: th.status,
          location: th.location,
          timestamp: th.timestamp,
          description: th.description
        }))
      })),
      
      // Overall tracking history
      trackingHistory,
      
      // Statistics
      statistics: {
        totalBoxes: shipment.boxes.length,
        totalParts,
        uniquePartTypes,
        totalWeight: shipment.totalWeight,
        totalValue: shipment.totalValue,
        averageBoxWeight: shipment.totalWeight ? shipment.totalWeight / shipment.boxes.length : 0,
        averageBoxValue: shipment.totalValue ? shipment.totalValue / shipment.boxes.length : 0
      },
      
      // Margin information
      margin: shipment.marginLogs.length > 0 ? {
        customerPrice: shipment.marginLogs[0].customerPrice,
        dtdcCost: shipment.marginLogs[0].dtdcCost,
        margin: shipment.marginLogs[0].margin,
        marginPercent: shipment.marginLogs[0].marginPercent,
        calculatedAt: shipment.marginLogs[0].calculatedAt
      } : null,
      
      // Tracking URLs
      trackingUrls: {
        dtdc: shipment.awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${shipment.awbNumber}` : null,
        internal: `/dashboard/shipments/${shipment.id}`
      },
      
      // Actions available based on status and user role
      availableActions: getAvailableActions(shipment, user),
      
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(trackingResponse);

  } catch (error) {
    console.error('Error fetching advanced shipment tracking:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch shipment tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getAvailableActions(shipment: any, user: any): string[] {
  const actions: string[] = [];
  
  // Brand actions
  if (user.role === 'BRAND' && shipment.brandId === user.id) {
    switch (shipment.status) {
      case 'INITIATED':
      case 'PENDING':
        actions.push('cancel', 'edit');
        break;
      case 'AWB_PENDING':
        actions.push('regenerate_awb', 'cancel');
        break;
      case 'AWB_GENERATED':
      case 'PICKUP_SCHEDULED':
        actions.push('track', 'cancel');
        break;
      case 'PICKUP_COMPLETED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        actions.push('track');
        break;
      case 'UNDELIVERED':
        actions.push('track', 'reschedule_delivery');
        break;
      case 'RTO':
        actions.push('track', 'process_return');
        break;
    }
  }
  
  // Service Center / Distributor actions
  if ((user.role === 'SERVICE_CENTER' && shipment.serviceCenterId === user.id) ||
      (user.role === 'DISTRIBUTOR' && shipment.distributorId === user.id)) {
    switch (shipment.status) {
      case 'PICKUP_COMPLETED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        actions.push('track');
        break;
      case 'DELIVERED':
        actions.push('confirm_receipt', 'report_discrepancy');
        break;
      case 'UNDELIVERED':
        actions.push('track', 'contact_courier');
        break;
    }
  }
  
  // Admin actions
  if (user.role === 'SUPER_ADMIN') {
    actions.push('track', 'edit', 'cancel', 'update_status', 'regenerate_awb');
  }
  
  return actions;
}