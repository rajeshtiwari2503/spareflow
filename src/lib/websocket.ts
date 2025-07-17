import { Server as ServerIO } from 'socket.io'
import { Server as NetServer } from 'http'

interface SocketServer extends NetServer {
  io?: ServerIO | undefined
}

// Notification types
export interface NotificationData {
  id: string
  type: 'shipment' | 'tracking' | 'order' | 'reverse_request' | 'purchase_order' | 'wallet' | 'system'
  title: string
  message: string
  data?: any
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  userId?: string
  userRole?: string
  actionUrl?: string
  actionLabel?: string
}

export interface ShipmentNotification extends NotificationData {
  type: 'shipment'
  data: {
    shipmentId: string
    brandId: string
    serviceCenterId: string
    status: string
    numBoxes: number
    awbNumbers?: string[]
  }
}

export interface TrackingNotification extends NotificationData {
  type: 'tracking'
  data: {
    boxId: string
    awbNumber: string
    shipmentId: string
    status: string
    location?: string
    description?: string
    scanCode?: string
  }
}

export interface OrderNotification extends NotificationData {
  type: 'order'
  data: {
    orderId: string
    customerId: string
    status: string
    partId: string
    quantity: number
    awbNumber?: string
  }
}

export interface ReverseRequestNotification extends NotificationData {
  type: 'reverse_request'
  data: {
    requestId: string
    serviceCenterId: string
    brandId?: string
    partId: string
    status: string
    reason: string
  }
}

export interface PurchaseOrderNotification extends NotificationData {
  type: 'purchase_order'
  data: {
    orderId: string
    distributorId: string
    brandId?: string
    partId: string
    quantity: number
    status: string
  }
}

export interface WalletNotification extends NotificationData {
  type: 'wallet'
  data: {
    userId: string
    transactionType: 'debit' | 'credit'
    amount: number
    balance: number
    reference?: string
  }
}

export interface SystemNotification extends NotificationData {
  type: 'system'
  data: {
    category: 'maintenance' | 'update' | 'alert' | 'announcement'
    affectedRoles?: string[]
  }
}

// Global socket instance
let globalSocket: ServerIO | null = null

export function setGlobalSocket(io: ServerIO) {
  globalSocket = io
}

export function getGlobalSocket(): ServerIO | null {
  return globalSocket
}

// Notification emission functions
export function emitToUser(userId: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`user:${userId}`).emit('notification', notification)
  console.log(`Notification sent to user ${userId}:`, notification.title)
}

export function emitToRole(role: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`role:${role}`).emit('notification', notification)
  console.log(`Notification sent to role ${role}:`, notification.title)
}

export function emitToShipment(shipmentId: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`shipment:${shipmentId}`).emit('notification', notification)
  console.log(`Notification sent to shipment ${shipmentId}:`, notification.title)
}

export function emitToBox(boxId: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`box:${boxId}`).emit('notification', notification)
  console.log(`Notification sent to box ${boxId}:`, notification.title)
}

export function emitToBrand(brandId: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`brand:${brandId}`).emit('notification', notification)
  console.log(`Notification sent to brand ${brandId}:`, notification.title)
}

export function emitToServiceCenter(serviceCenterId: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`service_center:${serviceCenterId}`).emit('notification', notification)
  console.log(`Notification sent to service center ${serviceCenterId}:`, notification.title)
}

export function emitToDistributor(distributorId: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`distributor:${distributorId}`).emit('notification', notification)
  console.log(`Notification sent to distributor ${distributorId}:`, notification.title)
}

export function emitToCustomer(customerId: string, notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.to(`customer:${customerId}`).emit('notification', notification)
  console.log(`Notification sent to customer ${customerId}:`, notification.title)
}

export function broadcastToAll(notification: NotificationData) {
  if (!globalSocket) {
    console.warn('Socket.IO not initialized, cannot emit notification')
    return
  }

  globalSocket.emit('notification', notification)
  console.log(`Broadcast notification sent:`, notification.title)
}

// Specific notification helpers
export async function notifyShipmentCreated(shipment: any) {
  const notification: ShipmentNotification = {
    id: `shipment_created_${shipment.id}_${Date.now()}`,
    type: 'shipment',
    title: 'New Shipment Created',
    message: `Shipment #${shipment.id} has been created with ${shipment.numBoxes} boxes`,
    data: {
      shipmentId: shipment.id,
      brandId: shipment.brandId,
      serviceCenterId: shipment.serviceCenterId,
      status: shipment.status,
      numBoxes: shipment.numBoxes
    },
    timestamp: new Date().toISOString(),
    priority: 'medium',
    actionUrl: `/dashboard?tab=shipments&shipment=${shipment.id}`,
    actionLabel: 'View Shipment'
  }

  // Notify brand and service center via WebSocket
  emitToBrand(shipment.brandId, notification)
  emitToServiceCenter(shipment.serviceCenterId, notification)
  emitToShipment(shipment.id, notification)

  // Send email notifications via notification manager
  try {
    const { default: notificationManager } = await import('@/lib/notification-manager')
    await notificationManager.sendShipmentNotification(shipment, false)
  } catch (error) {
    console.error('Failed to send email notification for shipment creation:', error)
  }
}

export async function notifyShipmentStatusUpdate(shipment: any, oldStatus: string) {
  const notification: ShipmentNotification = {
    id: `shipment_status_${shipment.id}_${Date.now()}`,
    type: 'shipment',
    title: 'Shipment Status Updated',
    message: `Shipment #${shipment.id} status changed from ${oldStatus} to ${shipment.status}`,
    data: {
      shipmentId: shipment.id,
      brandId: shipment.brandId,
      serviceCenterId: shipment.serviceCenterId,
      status: shipment.status,
      numBoxes: shipment.numBoxes
    },
    timestamp: new Date().toISOString(),
    priority: shipment.status === 'DELIVERED' ? 'high' : 'medium',
    actionUrl: `/dashboard?tab=shipments&shipment=${shipment.id}`,
    actionLabel: 'View Shipment'
  }

  emitToBrand(shipment.brandId, notification)
  emitToServiceCenter(shipment.serviceCenterId, notification)
  emitToShipment(shipment.id, notification)

  // Send email notifications via notification manager
  try {
    const { default: notificationManager } = await import('@/lib/notification-manager')
    await notificationManager.sendShipmentNotification(shipment, true)
  } catch (error) {
    console.error('Failed to send email notification for shipment status update:', error)
  }
}

export function notifyTrackingUpdate(box: any, trackingData: any) {
  const notification: TrackingNotification = {
    id: `tracking_update_${box.id}_${Date.now()}`,
    type: 'tracking',
    title: 'Package Tracking Update',
    message: `Box #${box.boxNumber} (AWB: ${box.awbNumber}) - ${trackingData.description || trackingData.status}`,
    data: {
      boxId: box.id,
      awbNumber: box.awbNumber,
      shipmentId: box.shipmentId,
      status: trackingData.status,
      location: trackingData.location,
      description: trackingData.description,
      scanCode: trackingData.scanCode
    },
    timestamp: new Date().toISOString(),
    priority: trackingData.status === 'DELIVERED' ? 'high' : 'medium',
    actionUrl: `/dashboard?tab=tracking&box=${box.id}`,
    actionLabel: 'Track Package'
  }

  emitToBox(box.id, notification)
  emitToShipment(box.shipmentId, notification)
}

export function notifyOrderStatusUpdate(order: any, oldStatus: string) {
  const notification: OrderNotification = {
    id: `order_status_${order.id}_${Date.now()}`,
    type: 'order',
    title: 'Order Status Updated',
    message: `Order #${order.id} status changed from ${oldStatus} to ${order.status}`,
    data: {
      orderId: order.id,
      customerId: order.customerId,
      status: order.status,
      partId: order.partId,
      quantity: order.quantity,
      awbNumber: order.awbNumber
    },
    timestamp: new Date().toISOString(),
    priority: order.status === 'DELIVERED' ? 'high' : 'medium',
    actionUrl: `/dashboard?tab=orders&order=${order.id}`,
    actionLabel: 'View Order'
  }

  emitToCustomer(order.customerId, notification)
}

export function notifyReverseRequestUpdate(request: any, oldStatus: string) {
  const notification: ReverseRequestNotification = {
    id: `reverse_request_${request.id}_${Date.now()}`,
    type: 'reverse_request',
    title: 'Reverse Request Updated',
    message: `Reverse request #${request.id} status changed from ${oldStatus} to ${request.status}`,
    data: {
      requestId: request.id,
      serviceCenterId: request.serviceCenterId,
      brandId: request.brandId,
      partId: request.partId,
      status: request.status,
      reason: request.reason
    },
    timestamp: new Date().toISOString(),
    priority: request.status === 'APPROVED' ? 'high' : 'medium',
    actionUrl: `/dashboard?tab=reverse-requests&request=${request.id}`,
    actionLabel: 'View Request'
  }

  emitToServiceCenter(request.serviceCenterId, notification)
  if (request.brandId) {
    emitToBrand(request.brandId, notification)
  }
}

export function notifyPurchaseOrderUpdate(order: any, oldStatus: string) {
  const notification: PurchaseOrderNotification = {
    id: `purchase_order_${order.id}_${Date.now()}`,
    type: 'purchase_order',
    title: 'Purchase Order Updated',
    message: `Purchase order #${order.id} status changed from ${oldStatus} to ${order.status}`,
    data: {
      orderId: order.id,
      distributorId: order.distributorId,
      brandId: order.brandId,
      partId: order.partId,
      quantity: order.quantity,
      status: order.status
    },
    timestamp: new Date().toISOString(),
    priority: order.status === 'APPROVED' ? 'high' : 'medium',
    actionUrl: `/dashboard?tab=purchase-orders&order=${order.id}`,
    actionLabel: 'View Order'
  }

  emitToDistributor(order.distributorId, notification)
  if (order.brandId) {
    emitToBrand(order.brandId, notification)
  }
}

export async function notifyWalletTransaction(userId: string, transaction: any) {
  const notification: WalletNotification = {
    id: `wallet_transaction_${transaction.id}_${Date.now()}`,
    type: 'wallet',
    title: `Wallet ${transaction.type === 'DEBIT' ? 'Debited' : 'Credited'}`,
    message: `₹${transaction.amount} ${transaction.type === 'DEBIT' ? 'debited from' : 'credited to'} your wallet. Balance: ₹${transaction.balanceAfter}`,
    data: {
      userId: userId,
      transactionType: transaction.type.toLowerCase(),
      amount: transaction.amount,
      balance: transaction.balanceAfter,
      reference: transaction.reference
    },
    timestamp: new Date().toISOString(),
    priority: transaction.type === 'DEBIT' ? 'medium' : 'low',
    actionUrl: `/dashboard?tab=wallet`,
    actionLabel: 'View Wallet'
  }

  emitToUser(userId, notification)

  // Send email notifications via notification manager
  try {
    const { default: notificationManager } = await import('@/lib/notification-manager')
    await notificationManager.sendWalletTransactionNotification(userId, transaction)
  } catch (error) {
    console.error('Failed to send email notification for wallet transaction:', error)
  }
}

export function notifySystemAlert(message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium', affectedRoles?: string[]) {
  const notification: SystemNotification = {
    id: `system_alert_${Date.now()}`,
    type: 'system',
    title: 'System Alert',
    message: message,
    data: {
      category: 'alert',
      affectedRoles: affectedRoles
    },
    timestamp: new Date().toISOString(),
    priority: priority
  }

  if (affectedRoles && affectedRoles.length > 0) {
    affectedRoles.forEach(role => emitToRole(role, notification))
  } else {
    broadcastToAll(notification)
  }
}