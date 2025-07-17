import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { brandId } = req.query;

      if (!brandId || typeof brandId !== 'string') {
        return res.status(400).json({ error: 'Brand ID is required' });
      }

      // Fetch notifications for the brand user using the correct schema
      const notifications = await prisma.notification.findMany({
        where: { 
          recipients: {
            has: brandId
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to last 50 notifications
      });

      res.status(200).json({
        success: true,
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      });

    } else if (req.method === 'PUT') {
      const { notificationId } = req.body;

      if (!notificationId) {
        return res.status(400).json({ error: 'Notification ID is required' });
      }

      // Mark notification as read
      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { 
          read: true,
          readAt: new Date()
        }
      });

      res.status(200).json({
        success: true,
        notification: updatedNotification
      });

    } else if (req.method === 'POST') {
      // Create a new notification
      const {
        type,
        title,
        message,
        partId,
        partCode,
        partName,
        purchaseOrderId,
        priority = 'MEDIUM',
        brandId
      } = req.body;

      if (!type || !title || !message || !brandId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create data object with additional context
      const notificationData = {
        partId: partId || null,
        partCode: partCode || null,
        partName: partName || null,
        purchaseOrderId: purchaseOrderId || null
      };

      const notification = await prisma.notification.create({
        data: {
          type,
          title,
          message,
          priority: priority.toUpperCase(),
          recipients: [brandId],
          data: JSON.stringify(notificationData),
          read: false,
          actionRequired: false
        }
      });

      res.status(201).json({
        success: true,
        notification
      });

    } else if (req.method === 'DELETE') {
      const { notificationId } = req.body;

      if (!notificationId) {
        return res.status(400).json({ error: 'Notification ID is required' });
      }

      await prisma.notification.delete({
        where: { id: notificationId }
      });

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in notifications API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}