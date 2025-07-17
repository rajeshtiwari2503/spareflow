import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getShipmentsReceived(req, res);
      case 'POST':
        return await createShipmentReceived(req, res);
      case 'PUT':
        return await updateShipmentReceived(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Service Center Shipments Received API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getShipmentsReceived(req: NextApiRequest, res: NextApiResponse) {
  const { serviceCenterProfileId, status, page = 1, limit = 10 } = req.query;

  if (!serviceCenterProfileId) {
    return res.status(400).json({ error: 'Service center profile ID is required' });
  }

  const where: any = {
    serviceCenterProfileId: serviceCenterProfileId as string
  };

  if (status) {
    where.status = status as string;
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [shipments, total] = await Promise.all([
    prisma.shipmentReceived.findMany({
      where,
      include: {
        shipment: {
          include: {
            brand: {
              select: { id: true, name: true, email: true }
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
        },
        serviceCenterProfile: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string)
    }),
    prisma.shipmentReceived.count({ where })
  ]);

  // Parse JSON fields and add computed fields
  const shipmentsWithParsedData = shipments.map(shipment => ({
    ...shipment,
    expectedParts: JSON.parse(shipment.expectedParts || '[]'),
    receivedParts: JSON.parse(shipment.receivedParts || '[]'),
    images: JSON.parse(shipment.images || '[]'),
    isOverdue: shipment.status === 'PENDING' && 
               shipment.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
  }));

  return res.status(200).json({
    shipments: shipmentsWithParsedData,
    pagination: {
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
}

async function createShipmentReceived(req: NextApiRequest, res: NextApiResponse) {
  const {
    serviceCenterProfileId,
    shipmentId,
    awbNumber,
    courierName,
    expectedParts,
    labelUrl
  } = req.body;

  if (!serviceCenterProfileId || !awbNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const shipmentReceived = await prisma.shipmentReceived.create({
    data: {
      serviceCenterProfileId,
      shipmentId,
      awbNumber,
      courierName,
      expectedParts: JSON.stringify(expectedParts || []),
      labelUrl,
      status: 'PENDING'
    },
    include: {
      shipment: {
        include: {
          brand: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      serviceCenterProfile: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  // Create notification for service center
  await prisma.notification.create({
    data: {
      userId: shipmentReceived.serviceCenterProfile.userId,
      title: 'New Shipment Expected',
      message: `Shipment with AWB ${awbNumber} is expected to arrive. Please track and mark as received when it arrives.`,
      type: 'SHIPMENT_EXPECTED',
      relatedId: shipmentReceived.id
    }
  });

  return res.status(201).json({
    ...shipmentReceived,
    expectedParts: JSON.parse(shipmentReceived.expectedParts || '[]'),
    receivedParts: JSON.parse(shipmentReceived.receivedParts || '[]'),
    images: JSON.parse(shipmentReceived.images || '[]')
  });
}

async function updateShipmentReceived(req: NextApiRequest, res: NextApiResponse) {
  const {
    id,
    receivedParts,
    status,
    receivedBy,
    discrepancyNotes,
    images
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Shipment received ID is required' });
  }

  const existingShipment = await prisma.shipmentReceived.findUnique({
    where: { id },
    include: {
      serviceCenterProfile: {
        include: { user: true }
      }
    }
  });

  if (!existingShipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const updateData: any = {};

  if (receivedParts) {
    updateData.receivedParts = JSON.stringify(receivedParts);
  }

  if (status) {
    updateData.status = status;
    if (status !== 'PENDING') {
      updateData.receivedAt = new Date();
    }
  }

  if (receivedBy) {
    updateData.receivedBy = receivedBy;
  }

  if (discrepancyNotes) {
    updateData.discrepancyNotes = discrepancyNotes;
  }

  if (images) {
    updateData.images = JSON.stringify(images);
  }

  const updatedShipment = await prisma.shipmentReceived.update({
    where: { id },
    data: updateData,
    include: {
      shipment: {
        include: {
          brand: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      serviceCenterProfile: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  // If shipment is marked as received, update inventory and create notifications
  if (status && status !== 'PENDING') {
    const expectedParts = JSON.parse(existingShipment.expectedParts || '[]');
    const actualReceivedParts = JSON.parse(updatedShipment.receivedParts || '[]');

    // Update inventory for received parts
    for (const receivedPart of actualReceivedParts) {
      try {
        await prisma.serviceCenterInventory.upsert({
          where: {
            serviceCenterProfileId_partId: {
              serviceCenterProfileId: existingShipment.serviceCenterProfileId,
              partId: receivedPart.partId
            }
          },
          update: {
            currentStock: {
              increment: receivedPart.quantity
            },
            lastRestocked: new Date()
          },
          create: {
            serviceCenterProfileId: existingShipment.serviceCenterProfileId,
            partId: receivedPart.partId,
            currentStock: receivedPart.quantity,
            minStockLevel: 5,
            maxStockLevel: 50,
            unitCost: 0,
            lastRestocked: new Date()
          }
        });
      } catch (error) {
        console.error('Error updating inventory for part:', receivedPart.partId, error);
      }
    }

    // Create notification based on status
    let notificationMessage = '';
    let notificationType = '';

    switch (status) {
      case 'FULLY_RECEIVED':
        notificationMessage = `Shipment ${existingShipment.awbNumber} has been fully received and inventory updated.`;
        notificationType = 'SHIPMENT_RECEIVED';
        break;
      case 'PARTIALLY_RECEIVED':
        notificationMessage = `Shipment ${existingShipment.awbNumber} has been partially received. Some items may be missing.`;
        notificationType = 'SHIPMENT_PARTIAL';
        break;
      case 'DISCREPANCY':
        notificationMessage = `Shipment ${existingShipment.awbNumber} has discrepancies. Please review the received items.`;
        notificationType = 'SHIPMENT_DISCREPANCY';
        break;
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: existingShipment.serviceCenterProfile.userId,
          title: 'Shipment Status Updated',
          message: notificationMessage,
          type: notificationType,
          relatedId: updatedShipment.id
        }
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: existingShipment.serviceCenterProfile.userId,
        action: 'SHIPMENT_RECEIVED',
        details: JSON.stringify({
          awbNumber: existingShipment.awbNumber,
          status,
          receivedBy,
          expectedPartsCount: expectedParts.length,
          receivedPartsCount: actualReceivedParts.length,
          hasDiscrepancy: status === 'DISCREPANCY'
        })
      }
    });
  }

  return res.status(200).json({
    ...updatedShipment,
    expectedParts: JSON.parse(updatedShipment.expectedParts || '[]'),
    receivedParts: JSON.parse(updatedShipment.receivedParts || '[]'),
    images: JSON.parse(updatedShipment.images || '[]')
  });
}