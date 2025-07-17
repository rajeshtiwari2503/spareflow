import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { notificationManager } from '@/lib/notification-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { 
        limit = '20', 
        offset = '0', 
        unreadOnly = 'false',
        type 
      } = req.query;

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const unreadOnlyBool = unreadOnly === 'true';

      // Get user notifications
      let notifications = await notificationManager.getUserNotifications(
        user.id,
        limitNum,
        offsetNum,
        unreadOnlyBool
      );

      // Filter by type if specified
      if (type && type !== 'all') {
        notifications = notifications.filter(n => n.type === type);
      }

      // Get unread count
      const unreadCount = await notificationManager.getUnreadCount(user.id);

      return res.status(200).json({
        success: true,
        notifications,
        unreadCount,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: notifications.length === limitNum
        }
      });
    }

    if (req.method === 'POST') {
      const { action, notificationId, notificationIds } = req.body;

      switch (action) {
        case 'markAsRead':
          if (!notificationId) {
            return res.status(400).json({ error: 'Notification ID required' });
          }

          const markResult = await notificationManager.markAsRead(notificationId, user.id);
          return res.status(200).json({
            success: markResult,
            message: markResult ? 'Notification marked as read' : 'Failed to mark notification as read'
          });

        case 'markAllAsRead':
          const markAllResult = await notificationManager.markAllAsRead(user.id);
          return res.status(200).json({
            success: markAllResult,
            message: markAllResult ? 'All notifications marked as read' : 'Failed to mark all notifications as read'
          });

        case 'markMultipleAsRead':
          if (!notificationIds || !Array.isArray(notificationIds)) {
            return res.status(400).json({ error: 'Notification IDs array required' });
          }

          const results = await Promise.allSettled(
            notificationIds.map(id => notificationManager.markAsRead(id, user.id))
          );

          const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
          
          return res.status(200).json({
            success: successCount > 0,
            message: `${successCount}/${notificationIds.length} notifications marked as read`,
            successCount,
            totalCount: notificationIds.length
          });

        case 'createTestNotification':
          // Only allow for development/testing
          if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Test notifications not allowed in production' });
          }

          const testResult = await notificationManager.createNotification(
            user.id,
            'test',
            'Test Notification',
            'This is a test notification to verify the system is working correctly.',
            {
              testData: true,
              timestamp: new Date().toISOString(),
              actionUrl: '/dashboard',
              actionLabel: 'View Dashboard'
            }
          );

          return res.status(200).json({
            success: testResult,
            message: testResult ? 'Test notification created' : 'Failed to create test notification'
          });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    if (req.method === 'DELETE') {
      const { notificationId } = req.query;

      if (!notificationId) {
        return res.status(400).json({ error: 'Notification ID required' });
      }

      // For now, we'll just mark as read instead of deleting
      // In the future, we could implement soft delete
      const deleteResult = await notificationManager.markAsRead(notificationId as string, user.id);
      
      return res.status(200).json({
        success: deleteResult,
        message: deleteResult ? 'Notification removed' : 'Failed to remove notification'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}