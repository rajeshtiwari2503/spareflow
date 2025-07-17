import { prisma } from '@/lib/prisma';
import emailService from '@/lib/email';
import { NotificationData } from '@/lib/websocket';

export interface NotificationConfig {
  enableEmail: boolean;
  enableInApp: boolean;
  enableSMS: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('email' | 'in_app' | 'sms')[];
}

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  emailTemplate?: string;
  smsTemplate?: string;
}

export class NotificationManager {
  private static instance: NotificationManager;
  
  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Create and send notification
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any,
    config: Partial<NotificationConfig> = {}
  ): Promise<boolean> {
    try {
      const defaultConfig: NotificationConfig = {
        enableEmail: true,
        enableInApp: true,
        enableSMS: false,
        priority: 'medium',
        channels: ['email', 'in_app']
      };

      const finalConfig = { ...defaultConfig, ...config };

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, phone: true, role: true }
      });

      if (!user) {
        console.error(`User not found: ${userId}`);
        return false;
      }

      const notificationData: NotificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        priority: finalConfig.priority,
        data,
        actionUrl: data?.actionUrl,
        actionLabel: data?.actionLabel
      };

      // Create in-app notification if enabled
      if (finalConfig.enableInApp && finalConfig.channels.includes('in_app')) {
        await this.createInAppNotification(userId, notificationData);
      }

      // Send email notification if enabled
      if (finalConfig.enableEmail && finalConfig.channels.includes('email') && user.email) {
        await this.sendEmailNotification(user.email, user.name, notificationData);
      }

      // Send SMS notification if enabled (placeholder for future implementation)
      if (finalConfig.enableSMS && finalConfig.channels.includes('sms') && user.phone) {
        await this.sendSMSNotification(user.phone, notificationData);
      }

      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }

  // Create in-app notification
  private async createInAppNotification(userId: string, notification: NotificationData): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          id: notification.id,
          recipients: [userId],
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data ? JSON.stringify(notification.data) : null,
          priority: notification.priority,
          read: false,
          actionUrl: notification.actionUrl,
          createdAt: new Date(notification.timestamp)
        }
      });
    } catch (error) {
      console.error('Error creating in-app notification:', error);
      throw error;
    }
  }

  // Send email notification
  private async sendEmailNotification(
    email: string, 
    name: string, 
    notification: NotificationData
  ): Promise<void> {
    try {
      await emailService.sendNotification(email, notification, name);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw error to prevent blocking other notification channels
    }
  }

  // Send SMS notification (placeholder)
  private async sendSMSNotification(phone: string, notification: NotificationData): Promise<void> {
    try {
      // SMS implementation would go here
      console.log(`SMS notification to ${phone}: ${notification.title}`);
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  // Shipment status change notification
  async notifyShipmentStatusChange(
    shipmentId: string,
    newStatus: string,
    recipientUserId: string,
    additionalData?: any
  ): Promise<boolean> {
    try {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          serviceCenter: { select: { name: true } },
          distributor: { select: { name: true } },
          brand: { select: { name: true } }
        }
      });

      if (!shipment) {
        console.error(`Shipment not found: ${shipmentId}`);
        return false;
      }

      const recipientName = shipment.serviceCenter?.name || shipment.distributor?.name || 'Customer';
      const statusMessages = {
        'INITIATED': 'Your shipment has been initiated and is being prepared.',
        'DISPATCHED': 'Your shipment has been dispatched and is on its way.',
        'IN_TRANSIT': 'Your shipment is in transit.',
        'OUT_FOR_DELIVERY': 'Your shipment is out for delivery.',
        'DELIVERED': 'Your shipment has been delivered successfully.',
        'CANCELLED': 'Your shipment has been cancelled.',
        'RETURNED': 'Your shipment has been returned.'
      };

      const message = statusMessages[newStatus as keyof typeof statusMessages] || 
                     `Your shipment status has been updated to ${newStatus}.`;

      const priority = newStatus === 'DELIVERED' ? 'high' : 
                      newStatus === 'CANCELLED' ? 'high' : 'medium';

      return await this.createNotification(
        recipientUserId,
        'shipment_status',
        `Shipment Update - ${newStatus}`,
        message,
        {
          shipmentId,
          status: newStatus,
          awbNumber: shipment.awbNumber,
          brandName: shipment.brand.name,
          recipientName,
          actionUrl: `/dashboard?tab=shipments&shipment=${shipmentId}`,
          actionLabel: 'View Shipment',
          ...additionalData
        },
        { priority: priority as 'low' | 'medium' | 'high' | 'urgent' }
      );
    } catch (error) {
      console.error('Error sending shipment status notification:', error);
      return false;
    }
  }

  // Wallet transaction notification
  async notifyWalletTransaction(
    userId: string,
    transactionType: 'CREDIT' | 'DEBIT',
    amount: number,
    balanceAfter: number,
    reference?: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const title = transactionType === 'CREDIT' ? 'Wallet Credited' : 'Wallet Debited';
      const message = `₹${amount} has been ${transactionType === 'CREDIT' ? 'added to' : 'deducted from'} your wallet. Current balance: ₹${balanceAfter}`;

      return await this.createNotification(
        userId,
        'wallet_transaction',
        title,
        message,
        {
          transactionType,
          amount,
          balanceAfter,
          reference,
          reason,
          actionUrl: '/dashboard?tab=wallet',
          actionLabel: 'View Wallet'
        },
        { priority: transactionType === 'DEBIT' ? 'medium' : 'low' }
      );
    } catch (error) {
      console.error('Error sending wallet transaction notification:', error);
      return false;
    }
  }

  // Low stock alert notification
  async notifyLowStock(
    brandUserId: string,
    partId: string,
    partName: string,
    partCode: string,
    currentStock: number,
    minStockLevel: number
  ): Promise<boolean> {
    try {
      const severity = currentStock === 0 ? 'urgent' : 'high';
      const title = currentStock === 0 ? 'Out of Stock Alert' : 'Low Stock Alert';
      const message = currentStock === 0 
        ? `${partName} (${partCode}) is out of stock. Immediate restocking required.`
        : `${partName} (${partCode}) is running low. Current stock: ${currentStock}, Minimum: ${minStockLevel}`;

      return await this.createNotification(
        brandUserId,
        'low_stock',
        title,
        message,
        {
          partId,
          partName,
          partCode,
          currentStock,
          minStockLevel,
          actionUrl: '/dashboard?tab=inventory',
          actionLabel: 'Manage Inventory'
        },
        { priority: severity }
      );
    } catch (error) {
      console.error('Error sending low stock notification:', error);
      return false;
    }
  }

  // Access request notification
  async notifyAccessRequest(
    brandUserId: string,
    requesterId: string,
    requesterName: string,
    requesterRole: string,
    requestId: string
  ): Promise<boolean> {
    try {
      const title = 'New Access Request';
      const message = `${requesterName} has requested access as a ${requesterRole.toLowerCase().replace('_', ' ')}. Please review and approve/reject the request.`;

      return await this.createNotification(
        brandUserId,
        'access_request',
        title,
        message,
        {
          requesterId,
          requesterName,
          requesterRole,
          requestId,
          actionUrl: '/dashboard?tab=network',
          actionLabel: 'Review Request'
        },
        { priority: 'medium' }
      );
    } catch (error) {
      console.error('Error sending access request notification:', error);
      return false;
    }
  }

  // Return request notification
  async notifyReturnRequest(
    brandUserId: string,
    returnRequestId: string,
    partName: string,
    serviceCenterName: string,
    reason: string
  ): Promise<boolean> {
    try {
      const title = 'New Return Request';
      const message = `${serviceCenterName} has requested to return ${partName}. Reason: ${reason}`;

      return await this.createNotification(
        brandUserId,
        'return_request',
        title,
        message,
        {
          returnRequestId,
          partName,
          serviceCenterName,
          reason,
          actionUrl: '/dashboard?tab=returns',
          actionLabel: 'Review Return'
        },
        { priority: 'medium' }
      );
    } catch (error) {
      console.error('Error sending return request notification:', error);
      return false;
    }
  }

  // System alert notification
  async notifySystemAlert(
    userIds: string[],
    alertType: string,
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<boolean> {
    try {
      const promises = userIds.map(userId => 
        this.createNotification(
          userId,
          'system_alert',
          title,
          message,
          {
            alertType,
            actionUrl: '/dashboard',
            actionLabel: 'View Dashboard'
          },
          { priority: severity }
        )
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      console.log(`System alert sent to ${successCount}/${userIds.length} users`);
      return successCount > 0;
    } catch (error) {
      console.error('Error sending system alert:', error);
      return false;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          recipients: {
            has: userId
          }
        },
        data: {
          read: true,
          readAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          recipients: {
            has: userId
          },
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<any[]> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          recipients: {
            has: userId
          },
          ...(unreadOnly && { read: false })
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return notifications.map(notif => ({
        ...notif,
        data: notif.data ? JSON.parse(notif.data) : null
      }));
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.notification.count({
        where: {
          recipients: {
            has: userId
          },
          read: false
        }
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Clean up old notifications (older than 90 days)
  async cleanupOldNotifications(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo
          }
        }
      });

      console.log(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

// Utility functions
export async function sendShipmentNotification(
  shipmentId: string,
  newStatus: string,
  recipientUserId: string,
  additionalData?: any
) {
  return notificationManager.notifyShipmentStatusChange(shipmentId, newStatus, recipientUserId, additionalData);
}

export async function sendWalletNotification(
  userId: string,
  transactionType: 'CREDIT' | 'DEBIT',
  amount: number,
  balanceAfter: number,
  reference?: string,
  reason?: string
) {
  return notificationManager.notifyWalletTransaction(userId, transactionType, amount, balanceAfter, reference, reason);
}

export async function sendLowStockAlert(
  brandUserId: string,
  partId: string,
  partName: string,
  partCode: string,
  currentStock: number,
  minStockLevel: number
) {
  return notificationManager.notifyLowStock(brandUserId, partId, partName, partCode, currentStock, minStockLevel);
}