import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateAWB } from '@/lib/dtdc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, shipmentId, data } = req.body;

    if (!action || !shipmentId) {
      return res.status(400).json({ error: 'Action and shipmentId are required' });
    }

    // Fetch shipment to verify access
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId },
      include: {
        brand: true,
        serviceCenter: true,
        distributor: true,
        boxes: true
      }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Verify user has permission to perform this action
    const hasPermission = checkPermission(user, shipment, action);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied for this action' });
    }

    let result;

    switch (action) {
      case 'update_status':
        result = await updateShipmentStatus(shipmentId, data, user);
        break;
      case 'regenerate_awb':
        result = await regenerateAWB(shipment, user);
        break;
      case 'cancel':
        result = await cancelShipment(shipmentId, data, user);
        break;
      case 'confirm_receipt':
        result = await confirmReceipt(shipmentId, data, user);
        break;
      case 'report_discrepancy':
        result = await reportDiscrepancy(shipmentId, data, user);
        break;
      case 'update_tracking':
        result = await updateTracking(shipmentId, data, user);
        break;
      case 'reschedule_delivery':
        result = await rescheduleDelivery(shipmentId, data, user);
        break;
      case 'process_return':
        result = await processReturn(shipmentId, data, user);
        break;
      case 'add_note':
        result = await addNote(shipmentId, data, user);
        break;
      case 'update_priority':
        result = await updatePriority(shipmentId, data, user);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error managing advanced shipment:', error);
    return res.status(500).json({
      error: 'Failed to manage shipment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function checkPermission(user: any, shipment: any, action: string): boolean {
  // Super admin can do everything
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Brand permissions
  if (user.role === 'BRAND' && shipment.brandId === user.id) {
    const brandActions = [
      'update_status', 'regenerate_awb', 'cancel', 'update_tracking',
      'reschedule_delivery', 'process_return', 'add_note', 'update_priority'
    ];
    return brandActions.includes(action);
  }

  // Service Center permissions
  if (user.role === 'SERVICE_CENTER' && shipment.serviceCenterId === user.id) {
    const serviceCenterActions = [
      'confirm_receipt', 'report_discrepancy', 'add_note'
    ];
    return serviceCenterActions.includes(action);
  }

  // Distributor permissions
  if (user.role === 'DISTRIBUTOR' && shipment.distributorId === user.id) {
    const distributorActions = [
      'confirm_receipt', 'report_discrepancy', 'add_note'
    ];
    return distributorActions.includes(action);
  }

  return false;
}

async function updateShipmentStatus(shipmentId: string, data: any, user: any) {
  const { status, location, description, timestamp } = data;

  if (!status) {
    throw new Error('Status is required');
  }

  const validStatuses = [
    'INITIATED', 'PENDING', 'CONFIRMED', 'AWB_PENDING', 'AWB_GENERATED',
    'PICKUP_SCHEDULED', 'PICKUP_AWAITED', 'PICKUP_COMPLETED', 'DISPATCHED',
    'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'UNDELIVERED', 'RTO', 'CANCELLED', 'FAILED'
  ];

  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  // Update shipment status
  const updateData: any = {
    status,
    updatedAt: new Date()
  };

  // Set specific timestamp fields based on status
  const now = new Date();
  switch (status) {
    case 'PICKUP_COMPLETED':
      updateData.pickedUpAt = timestamp ? new Date(timestamp) : now;
      break;
    case 'IN_TRANSIT':
      updateData.inTransitAt = timestamp ? new Date(timestamp) : now;
      break;
    case 'OUT_FOR_DELIVERY':
      updateData.outForDeliveryAt = timestamp ? new Date(timestamp) : now;
      break;
    case 'DELIVERED':
      updateData.deliveredAt = timestamp ? new Date(timestamp) : now;
      updateData.actualDelivery = timestamp ? new Date(timestamp) : now;
      break;
  }

  const updatedShipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: updateData
  });

  // Add to tracking history
  const currentTrackingHistory = updatedShipment.trackingHistory ? 
    JSON.parse(updatedShipment.trackingHistory) : [];

  const newTrackingEntry = {
    timestamp: timestamp ? new Date(timestamp) : now,
    status,
    location: location || '',
    description: description || `Status updated to ${status}`,
    updatedBy: user.id,
    updatedByName: user.name
  };

  currentTrackingHistory.unshift(newTrackingEntry);

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      trackingHistory: JSON.stringify(currentTrackingHistory)
    }
  });

  // Update box tracking history if AWB exists
  if (updatedShipment.awbNumber) {
    await prisma.boxTrackingHistory.createMany({
      data: updatedShipment.boxes?.map((box: any) => ({
        boxId: box.id,
        awbNumber: updatedShipment.awbNumber!,
        status,
        location: location || '',
        timestamp: timestamp ? new Date(timestamp) : now,
        description: description || `Status updated to ${status}`
      })) || []
    });
  }

  // Create notification for status update
  const recipientId = updatedShipment.serviceCenterId || updatedShipment.distributorId;
  if (recipientId) {
    await prisma.notification.create({
      data: {
        title: 'Shipment Status Updated',
        message: `Your shipment ${updatedShipment.awbNumber || updatedShipment.id} status has been updated to ${status}`,
        type: 'SHIPMENT',
        priority: status === 'DELIVERED' ? 'HIGH' : 'MEDIUM',
        recipients: [recipientId],
        data: JSON.stringify({
          shipmentId,
          status,
          awbNumber: updatedShipment.awbNumber,
          location,
          description
        })
      }
    });
  }

  return {
    success: true,
    message: 'Shipment status updated successfully',
    shipment: updatedShipment,
    trackingEntry: newTrackingEntry
  };
}

async function regenerateAWB(shipment: any, user: any) {
  try {
    // Parse recipient address
    const recipientAddress = shipment.recipientAddress ? 
      JSON.parse(shipment.recipientAddress) : null;

    if (!recipientAddress) {
      throw new Error('Recipient address not found');
    }

    // Get recipient details
    const recipient = shipment.serviceCenter || shipment.distributor;
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Calculate total weight and value
    const totalWeight = shipment.totalWeight || 1;
    const totalValue = shipment.totalValue || 1000;

    // Generate new AWB
    const awbResult = await generateAWB({
      shipmentId: shipment.id,
      recipientName: recipient.name,
      recipientPhone: recipient.phone || '9999999999',
      recipientAddress,
      weight: totalWeight,
      declaredValue: totalValue,
      numBoxes: shipment.numBoxes || 1,
      priority: shipment.priority || 'MEDIUM'
    });

    if (awbResult.success && awbResult.awbNumber) {
      // Update shipment with new AWB
      const updatedShipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          awbNumber: awbResult.awbNumber,
          trackingNumber: awbResult.awbNumber,
          status: 'AWB_GENERATED',
          dtdcData: JSON.stringify(awbResult.dtdcResponse || {}),
          updatedAt: new Date()
        }
      });

      // Update boxes with new AWB
      await prisma.box.updateMany({
        where: { shipmentId: shipment.id },
        data: { awbNumber: awbResult.awbNumber }
      });

      return {
        success: true,
        message: 'AWB regenerated successfully',
        awbNumber: awbResult.awbNumber,
        shipment: updatedShipment,
        dtdcResponse: awbResult.dtdcResponse
      };
    } else {
      throw new Error(awbResult.error || 'AWB generation failed');
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AWB regeneration failed'
    };
  }
}

async function cancelShipment(shipmentId: string, data: any, user: any) {
  const { reason, refundWallet = true } = data;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { boxes: { include: { boxParts: { include: { part: true } } } } }
  });

  if (!shipment) {
    throw new Error('Shipment not found');
  }

  // Check if shipment can be cancelled
  const cancellableStatuses = ['INITIATED', 'PENDING', 'CONFIRMED', 'AWB_PENDING', 'AWB_GENERATED'];
  if (!cancellableStatuses.includes(shipment.status)) {
    throw new Error('Shipment cannot be cancelled at this stage');
  }

  // Update shipment status
  const updatedShipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: 'CANCELLED',
      notes: shipment.notes ? `${shipment.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`,
      updatedAt: new Date()
    }
  });

  // Restore part stock
  for (const box of shipment.boxes) {
    for (const boxPart of box.boxParts) {
      await prisma.part.update({
        where: { id: boxPart.partId },
        data: {
          stockQuantity: {
            increment: boxPart.quantity
          }
        }
      });

      // Create stock movement record
      await prisma.stockMovement.create({
        data: {
          partId: boxPart.partId,
          type: 'IN',
          quantity: boxPart.quantity,
          reason: 'SHIPMENT_CANCELLED',
          reference: shipmentId,
          previousQty: boxPart.part.stockQuantity,
          newQty: boxPart.part.stockQuantity + boxPart.quantity,
          notes: `Stock restored due to shipment cancellation: ${reason}`,
          createdBy: user.id
        }
      });
    }
  }

  // Refund wallet if requested and cost was deducted
  if (refundWallet && shipment.actualCost) {
    // This would need to be implemented in the wallet system
    // await refundToWallet(shipment.brandId, shipment.actualCost, 'SHIPMENT_CANCELLED', { shipmentId });
  }

  return {
    success: true,
    message: 'Shipment cancelled successfully',
    shipment: updatedShipment
  };
}

async function confirmReceipt(shipmentId: string, data: any, user: any) {
  const { receivedParts, notes, images } = data;

  await prisma.shipmentReceived.create({
    data: {
      serviceCenterProfileId: user.serviceCenterProfile?.id || user.distributorProfile?.id,
      shipmentId,
      awbNumber: data.awbNumber || 'MANUAL',
      expectedParts: JSON.stringify(data.expectedParts || []),
      receivedParts: JSON.stringify(receivedParts || []),
      status: 'FULLY_RECEIVED',
      receivedAt: new Date(),
      receivedBy: user.name,
      discrepancyNotes: notes,
      images: JSON.stringify(images || [])
    }
  });

  // Update shipment status if not already delivered
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      actualDelivery: new Date()
    }
  });

  return {
    success: true,
    message: 'Receipt confirmed successfully'
  };
}

async function reportDiscrepancy(shipmentId: string, data: any, user: any) {
  const { discrepancyType, description, images, affectedParts } = data;

  await prisma.shipmentReceived.create({
    data: {
      serviceCenterProfileId: user.serviceCenterProfile?.id || user.distributorProfile?.id,
      shipmentId,
      awbNumber: data.awbNumber || 'MANUAL',
      expectedParts: JSON.stringify(data.expectedParts || []),
      receivedParts: JSON.stringify(data.receivedParts || []),
      status: 'DISCREPANCY',
      receivedAt: new Date(),
      receivedBy: user.name,
      discrepancyNotes: `${discrepancyType}: ${description}`,
      images: JSON.stringify(images || [])
    }
  });

  // Create notification for brand
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (shipment) {
    await prisma.notification.create({
      data: {
        title: 'Shipment Discrepancy Reported',
        message: `A discrepancy has been reported for shipment ${shipment.awbNumber || shipmentId}`,
        type: 'ALERT',
        priority: 'HIGH',
        recipients: [shipment.brandId],
        data: JSON.stringify({
          shipmentId,
          discrepancyType,
          description,
          affectedParts,
          reportedBy: user.name
        })
      }
    });
  }

  return {
    success: true,
    message: 'Discrepancy reported successfully'
  };
}

async function updateTracking(shipmentId: string, data: any, user: any) {
  const { trackingUpdates } = data;

  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) {
    throw new Error('Shipment not found');
  }

  const currentHistory = shipment.trackingHistory ? JSON.parse(shipment.trackingHistory) : [];
  const newHistory = [...trackingUpdates, ...currentHistory];

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      trackingHistory: JSON.stringify(newHistory),
      updatedAt: new Date()
    }
  });

  return {
    success: true,
    message: 'Tracking updated successfully',
    trackingHistory: newHistory
  };
}

async function rescheduleDelivery(shipmentId: string, data: any, user: any) {
  const { newDeliveryDate, reason } = data;

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      expectedDelivery: new Date(newDeliveryDate),
      deliveryAttempts: { increment: 1 },
      notes: data.notes || `Delivery rescheduled: ${reason}`,
      updatedAt: new Date()
    }
  });

  return {
    success: true,
    message: 'Delivery rescheduled successfully'
  };
}

async function processReturn(shipmentId: string, data: any, user: any) {
  const { returnReason, returnAction } = data;

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: 'RTO',
      notes: `Return processed: ${returnReason}. Action: ${returnAction}`,
      updatedAt: new Date()
    }
  });

  return {
    success: true,
    message: 'Return processed successfully'
  };
}

async function addNote(shipmentId: string, data: any, user: any) {
  const { note } = data;

  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) {
    throw new Error('Shipment not found');
  }

  const timestamp = new Date().toISOString();
  const newNote = `[${timestamp}] ${user.name}: ${note}`;
  const updatedNotes = shipment.notes ? `${shipment.notes}\n${newNote}` : newNote;

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      notes: updatedNotes,
      updatedAt: new Date()
    }
  });

  return {
    success: true,
    message: 'Note added successfully',
    notes: updatedNotes
  };
}

async function updatePriority(shipmentId: string, data: any, user: any) {
  const { priority } = data;

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!validPriorities.includes(priority)) {
    throw new Error('Invalid priority');
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      priority,
      updatedAt: new Date()
    }
  });

  return {
    success: true,
    message: 'Priority updated successfully'
  };
}