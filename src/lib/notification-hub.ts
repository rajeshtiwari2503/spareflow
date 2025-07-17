// Unified Notification Hub for cross-dashboard notifications
import { apiClient } from './unified-api-client';
import { realTimeManager } from './real-time-manager';

export interface Notification {
  id: string;
  type: 'SHIPMENT' | 'INVENTORY' | 'ORDER' | 'SYSTEM' | 'ALERT' | 'WARNING';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recipients: string[];
  data?: any;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationRequest {
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recipients: string[];
  data?: any;
  actionRequired?: boolean;
  actionUrl?: string;
  channels?: ('WEBSOCKET' | 'EMAIL' | 'WHATSAPP' | 'SMS')[];
}

export class NotificationHub {
  private static instance: NotificationHub;

  static getInstance(): NotificationHub {
    if (!NotificationHub.instance) {
      NotificationHub.instance = new NotificationHub();
    }
    return NotificationHub.instance;
  }

  // Shipment notifications
  async notifyShipmentCreated(shipment: any): Promise<void> {
    const notifications: NotificationRequest[] = [
      {
        type: 'SHIPMENT_CREATED',
        title: 'Shipment Created',
        message: `Shipment ${shipment.awbNumber} has been created and is ready for dispatch.`,
        priority: 'MEDIUM',
        recipients: [shipment.brandId],
        data: { 
          shipmentId: shipment.id, 
          awbNumber: shipment.awbNumber,
          serviceCenterName: shipment.serviceCenterName 
        },
        actionUrl: `/dashboard/brand?tab=shipments&shipment=${shipment.id}`,
        channels: ['WEBSOCKET', 'EMAIL']
      },
      {
        type: 'SHIPMENT_INCOMING',
        title: 'Incoming Shipment',
        message: `You have an incoming shipment ${shipment.awbNumber}. Expected delivery: ${shipment.estimatedDelivery}`,
        priority: 'HIGH',
        recipients: [shipment.serviceCenterId],
        data: { 
          shipmentId: shipment.id, 
          awbNumber: shipment.awbNumber,
          estimatedDelivery: shipment.estimatedDelivery 
        },
        actionRequired: true,
        actionUrl: `/dashboard/service-center?tab=incoming-shipments&shipment=${shipment.id}`,
        channels: ['WEBSOCKET', 'EMAIL', 'WHATSAPP']
      }
    ];

    await this.sendNotifications(notifications);
  }

  async notifyShipmentDelivered(shipment: any): Promise<void> {
    const notifications: NotificationRequest[] = [
      {
        type: 'SHIPMENT_DELIVERED',
        title: 'Shipment Delivered',
        message: `Shipment ${shipment.awbNumber} has been successfully delivered to ${shipment.serviceCenterName}.`,
        priority: 'MEDIUM',
        recipients: [shipment.brandId],
        data: { 
          shipmentId: shipment.id, 
          awbNumber: shipment.awbNumber,
          deliveredAt: new Date().toISOString()
        },
        actionUrl: `/dashboard/brand?tab=shipments&shipment=${shipment.id}`,
        channels: ['WEBSOCKET', 'EMAIL']
      }
    ];

    await this.sendNotifications(notifications);
  }

  // Inventory notifications
  async notifyInventoryLow(partId: string, currentStock: number, minLevel: number, locationInfo: any): Promise<void> {
    const part = await this.getPartDetails(partId);
    const relevantUsers = await this.getInventoryStakeholders(partId, locationInfo);

    const notification: NotificationRequest = {
      type: 'INVENTORY_LOW',
      title: 'Low Stock Alert',
      message: `${part.name} is running low at ${locationInfo.name}. Current stock: ${currentStock}, Minimum level: ${minLevel}`,
      priority: currentStock === 0 ? 'CRITICAL' : 'HIGH',
      recipients: relevantUsers,
      data: { 
        partId, 
        partName: part.name,
        partCode: part.code,
        currentStock, 
        minLevel,
        locationId: locationInfo.id,
        locationName: locationInfo.name,
        locationType: locationInfo.type
      },
      actionRequired: true,
      actionUrl: `/dashboard?tab=inventory&part=${partId}`,
      channels: currentStock === 0 ? ['WEBSOCKET', 'EMAIL', 'WHATSAPP'] : ['WEBSOCKET', 'EMAIL']
    };

    await this.sendNotifications([notification]);
  }

  async notifyInventoryRestocked(partId: string, newStock: number, locationInfo: any): Promise<void> {
    const part = await this.getPartDetails(partId);
    const relevantUsers = await this.getInventoryStakeholders(partId, locationInfo);

    const notification: NotificationRequest = {
      type: 'INVENTORY_RESTOCKED',
      title: 'Inventory Restocked',
      message: `${part.name} has been restocked at ${locationInfo.name}. New stock level: ${newStock}`,
      priority: 'LOW',
      recipients: relevantUsers,
      data: { 
        partId, 
        partName: part.name,
        partCode: part.code,
        newStock,
        locationId: locationInfo.id,
        locationName: locationInfo.name,
        locationType: locationInfo.type
      },
      channels: ['WEBSOCKET']
    };

    await this.sendNotifications([notification]);
  }

  // Order notifications
  async notifyOrderStatusChange(orderId: string, newStatus: string, oldStatus: string): Promise<void> {
    const order = await this.getOrderDetails(orderId);

    const notifications: NotificationRequest[] = [
      {
        type: 'ORDER_STATUS_CHANGE',
        title: 'Order Status Update',
        message: `Your order ${order.orderNumber} status has been updated from ${oldStatus} to ${newStatus}`,
        priority: this.getOrderStatusPriority(newStatus),
        recipients: [order.customerId],
        data: { 
          orderId, 
          orderNumber: order.orderNumber,
          newStatus, 
          oldStatus,
          trackingUrl: order.trackingUrl
        },
        actionUrl: `/dashboard/customer?tab=orders&order=${orderId}`,
        channels: ['WEBSOCKET', 'EMAIL']
      }
    ];

    // Notify distributor/brand if order is cancelled or has issues
    if (newStatus === 'CANCELLED' || newStatus === 'FAILED') {
      notifications.push({
        type: 'ORDER_ISSUE',
        title: 'Order Issue',
        message: `Order ${order.orderNumber} status changed to ${newStatus}. Customer: ${order.customerName}`,
        priority: 'HIGH',
        recipients: [order.distributorId, order.brandId].filter(Boolean),
        data: { 
          orderId, 
          orderNumber: order.orderNumber,
          newStatus,
          customerName: order.customerName,
          reason: order.cancellationReason
        },
        actionRequired: true,
        actionUrl: `/dashboard?tab=orders&order=${orderId}`,
        channels: ['WEBSOCKET', 'EMAIL']
      });
    }

    await this.sendNotifications(notifications);
  }

  // System notifications
  async notifySystemAlert(alertType: string, message: string, affectedUsers: string[], priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'): Promise<void> {
    const notification: NotificationRequest = {
      type: 'SYSTEM_ALERT',
      title: 'System Alert',
      message,
      priority,
      recipients: affectedUsers,
      data: { alertType },
      channels: priority === 'CRITICAL' ? ['WEBSOCKET', 'EMAIL', 'WHATSAPP'] : ['WEBSOCKET', 'EMAIL']
    };

    await this.sendNotifications([notification]);
  }

  // Warranty notifications
  async notifyWarrantyExpiring(warrantyId: string, partName: string, customerId: string, expiryDate: string): Promise<void> {
    const notification: NotificationRequest = {
      type: 'WARRANTY_EXPIRING',
      title: 'Warranty Expiring Soon',
      message: `Your warranty for ${partName} will expire on ${expiryDate}. Consider extending or purchasing a new warranty.`,
      priority: 'MEDIUM',
      recipients: [customerId],
      data: { 
        warrantyId, 
        partName, 
        expiryDate 
      },
      actionUrl: `/dashboard/customer?tab=warranty&warranty=${warrantyId}`,
      channels: ['WEBSOCKET', 'EMAIL']
    };

    await this.sendNotifications([notification]);
  }

  // Service ticket notifications
  async notifyServiceTicketUpdate(ticketId: string, status: string, customerId: string, serviceCenterId: string): Promise<void> {
    const ticket = await this.getServiceTicketDetails(ticketId);

    const notifications: NotificationRequest[] = [
      {
        type: 'SERVICE_TICKET_UPDATE',
        title: 'Service Ticket Update',
        message: `Your service ticket ${ticket.ticketNumber} status has been updated to ${status}`,
        priority: 'MEDIUM',
        recipients: [customerId],
        data: { 
          ticketId, 
          ticketNumber: ticket.ticketNumber,
          status,
          issue: ticket.issue
        },
        actionUrl: `/dashboard/customer?tab=warranty&ticket=${ticketId}`,
        channels: ['WEBSOCKET', 'EMAIL']
      }
    ];

    // Notify service center for certain status changes
    if (status === 'ASSIGNED' || status === 'ESCALATED') {
      notifications.push({
        type: 'SERVICE_TICKET_ASSIGNED',
        title: 'Service Ticket Assigned',
        message: `Service ticket ${ticket.ticketNumber} has been assigned to you. Issue: ${ticket.issue}`,
        priority: 'HIGH',
        recipients: [serviceCenterId],
        data: { 
          ticketId, 
          ticketNumber: ticket.ticketNumber,
          issue: ticket.issue,
          customerName: ticket.customerName
        },
        actionRequired: true,
        actionUrl: `/dashboard/service-center?tab=tickets&ticket=${ticketId}`,
        channels: ['WEBSOCKET', 'EMAIL', 'WHATSAPP']
      });
    }

    await this.sendNotifications(notifications);
  }

  // Private methods
  private async sendNotifications(notifications: NotificationRequest[]): Promise<void> {
    await Promise.all(notifications.map(async (notification) => {
      try {
        // Send real-time notification via WebSocket
        if (!notification.channels || notification.channels.includes('WEBSOCKET')) {
          realTimeManager.broadcast('NOTIFICATION', notification);
        }
        
        // Store in database for persistence
        await this.storeNotification(notification);
        
        // Send email if specified
        if (notification.channels?.includes('EMAIL') || notification.priority === 'HIGH' || notification.priority === 'CRITICAL') {
          await this.sendEmailNotification(notification);
        }
        
        // Send WhatsApp for critical notifications or if specified
        if (notification.channels?.includes('WHATSAPP') || notification.priority === 'CRITICAL') {
          await this.sendWhatsAppNotification(notification);
        }

        // Send SMS if specified
        if (notification.channels?.includes('SMS')) {
          await this.sendSMSNotification(notification);
        }
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }));
  }

  private async storeNotification(notification: NotificationRequest): Promise<void> {
    try {
      await apiClient.post('/api/notifications', {
        ...notification,
        id: this.generateNotificationId(),
        read: false,
        createdAt: new Date().toISOString(),
        expiresAt: this.calculateExpiryDate(notification.priority)
      });
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  private async sendEmailNotification(notification: NotificationRequest): Promise<void> {
    try {
      await apiClient.post('/api/notifications/email', {
        recipients: notification.recipients,
        subject: notification.title,
        message: notification.message,
        priority: notification.priority,
        actionUrl: notification.actionUrl
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  private async sendWhatsAppNotification(notification: NotificationRequest): Promise<void> {
    try {
      await apiClient.post('/api/notifications/whatsapp', {
        recipients: notification.recipients,
        message: `${notification.title}\n\n${notification.message}`,
        priority: notification.priority
      });
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  }

  private async sendSMSNotification(notification: NotificationRequest): Promise<void> {
    try {
      await apiClient.post('/api/notifications/sms', {
        recipients: notification.recipients,
        message: `${notification.title}: ${notification.message}`,
        priority: notification.priority
      });
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  // Helper methods
  private async getPartDetails(partId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/parts/${partId}`);
      return response.data || { name: 'Unknown Part', code: 'UNKNOWN' };
    } catch (error) {
      console.error('Error fetching part details:', error);
      return { name: 'Unknown Part', code: 'UNKNOWN' };
    }
  }

  private async getOrderDetails(orderId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/orders/${orderId}`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching order details:', error);
      return {};
    }
  }

  private async getServiceTicketDetails(ticketId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/service-tickets/${ticketId}`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching service ticket details:', error);
      return {};
    }
  }

  private async getInventoryStakeholders(partId: string, locationInfo: any): Promise<string[]> {
    try {
      const response = await apiClient.get(`/api/inventory/${partId}/stakeholders`, {
        locationId: locationInfo.id,
        locationType: locationInfo.type
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching inventory stakeholders:', error);
      return [];
    }
  }

  private getOrderStatusPriority(status: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (status.toUpperCase()) {
      case 'CANCELLED':
      case 'FAILED':
        return 'HIGH';
      case 'DELIVERED':
        return 'MEDIUM';
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateExpiryDate(priority: string): string {
    const now = new Date();
    const daysToExpire = priority === 'CRITICAL' ? 30 : priority === 'HIGH' ? 14 : 7;
    now.setDate(now.getDate() + daysToExpire);
    return now.toISOString();
  }
}

// React hooks for using notifications
import { useEffect, useState } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load existing notifications
    const loadNotifications = async () => {
      try {
        const response = await apiClient.get('/api/notifications');
        if (response.success && response.data) {
          // Handle different response formats
          let notificationsArray: Notification[] = [];
          
          if (Array.isArray(response.data)) {
            notificationsArray = response.data;
          } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
            notificationsArray = response.data.notifications;
          } else if (typeof response.data === 'object' && response.data.notifications) {
            notificationsArray = Array.isArray(response.data.notifications) ? response.data.notifications : [];
          }
          
          setNotifications(notificationsArray);
          setUnreadCount(notificationsArray.filter(n => !n.read).length);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        // Set empty array on error to prevent filter issues
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    // Subscribe to real-time notifications
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
      }
    };
    
    realTimeManager.subscribe('NOTIFICATION', handleNotification);
    loadNotifications();
    
    return () => {
      realTimeManager.unsubscribe('NOTIFICATION', handleNotification);
    };
  }, []);
  
  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      await apiClient.put('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/api/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.read ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };
  
  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}

// Export singleton instance
export const notificationHub = NotificationHub.getInstance();