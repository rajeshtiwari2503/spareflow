import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'DISTRIBUTOR') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.query;
    const { action, reason } = req.body;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Find the order and verify it belongs to this distributor
    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id: orderId,
        distributorId: user.id
      },
      include: {
        brand: true,
        serviceCenter: true,
        items: {
          include: {
            part: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let updateData: any = {
      processedAt: new Date()
    };

    let notificationTitle = '';
    let notificationMessage = '';

    switch (action) {
      case 'confirm':
      case 'accept':
        if (order.status !== 'DRAFT') {
          return res.status(400).json({ error: 'Order cannot be confirmed in current status' });
        }
        updateData.status = 'APPROVED';
        notificationTitle = 'Order Confirmed';
        notificationMessage = `Order ${order.orderNumber} has been confirmed by distributor`;
        break;

      case 'reject':
        if (order.status !== 'DRAFT') {
          return res.status(400).json({ error: 'Order cannot be rejected in current status' });
        }
        updateData.status = 'REJECTED';
        updateData.rejectionReason = reason || 'No reason provided';
        updateData.rejectedAt = new Date();
        notificationTitle = 'Order Rejected';
        notificationMessage = `Order ${order.orderNumber} has been rejected. Reason: ${reason || 'No reason provided'}`;
        break;

      case 'process':
      case 'ship':
        if (order.status !== 'APPROVED') {
          return res.status(400).json({ error: 'Order must be approved before processing' });
        }
        updateData.status = 'DISPATCHED';
        updateData.shippedAt = new Date();
        updateData.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        notificationTitle = 'Order Shipped';
        notificationMessage = `Order ${order.orderNumber} has been shipped`;
        break;

      case 'deliver':
        if (order.status !== 'DISPATCHED') {
          return res.status(400).json({ error: 'Order must be shipped before marking as delivered' });
        }
        updateData.status = 'DELIVERED';
        updateData.deliveredAt = new Date();
        notificationTitle = 'Order Delivered';
        notificationMessage = `Order ${order.orderNumber} has been delivered`;
        break;

      case 'cancel':
        if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
          return res.status(400).json({ error: 'Order cannot be cancelled in current status' });
        }
        updateData.status = 'CANCELLED';
        updateData.rejectionReason = reason || 'Cancelled by distributor';
        notificationTitle = 'Order Cancelled';
        notificationMessage = `Order ${order.orderNumber} has been cancelled. Reason: ${reason || 'Cancelled by distributor'}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Update the order
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        brand: true,
        serviceCenter: true,
        items: {
          include: {
            part: true
          }
        }
      }
    });

    // Create notifications for relevant parties
    const notifications = [];

    // Notify brand
    if (order.brandId) {
      notifications.push({
        userId: order.brandId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'ORDER_UPDATE',
        relatedId: orderId
      });
    }

    // Notify service center
    if (order.serviceCenterId) {
      notifications.push({
        userId: order.serviceCenterId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'ORDER_UPDATE',
        relatedId: orderId
      });
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: `ORDER_${action.toUpperCase()}`,
        details: JSON.stringify({
          orderId: orderId,
          orderNumber: order.orderNumber,
          previousStatus: order.status,
          newStatus: updateData.status,
          reason: reason || null
        })
      }
    });

    // Handle inventory updates for confirmed orders
    if (action === 'confirm' || action === 'accept') {
      // Check and update distributor inventory
      for (const item of order.items) {
        const inventoryItem = await prisma.distributorInventory.findFirst({
          where: {
            distributorId: user.id,
            partId: item.partId
          }
        });

        if (inventoryItem) {
          // Check if we have enough stock
          if (inventoryItem.currentStock < item.quantity) {
            // Create low stock notification
            await prisma.notification.create({
              data: {
                userId: user.id,
                title: 'Low Stock Alert',
                message: `Insufficient stock for ${item.part.name} (${item.part.partNumber}). Required: ${item.quantity}, Available: ${inventoryItem.currentStock}`,
                type: 'INVENTORY_ALERT',
                relatedId: inventoryItem.id
              }
            });
          } else {
            // Reserve the stock
            await prisma.distributorInventory.update({
              where: { id: inventoryItem.id },
              data: {
                currentStock: inventoryItem.currentStock - item.quantity
              }
            });
          }
        }
      }
    }

    // Handle wallet transactions for delivered orders
    if (action === 'deliver') {
      // Create credit transaction for the distributor
      const marginAmount = order.totalAmount * 0.1; // 10% margin
      
      await prisma.walletTransaction.create({
        data: {
          userId: user.id,
          type: 'CREDIT',
          amount: marginAmount,
          description: `Commission for order ${order.orderNumber}`,
          purchaseOrderId: orderId,
          balanceAfter: 0, // This would be calculated based on current balance
          status: 'COMPLETED'
        }
      });

      // Update wallet balance
      const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id }
      });

      if (wallet) {
        await prisma.wallet.update({
          where: { userId: user.id },
          data: {
            balance: wallet.balance + marginAmount,
            totalEarned: wallet.totalEarned + marginAmount
          }
        });
      } else {
        await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: marginAmount,
            totalEarned: marginAmount
          }
        });
      }
    }

    res.status(200).json({
      message: `Order ${action}ed successfully`,
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}