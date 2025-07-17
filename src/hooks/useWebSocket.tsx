import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationData } from '@/lib/websocket'
import { toast } from 'sonner'

interface UseWebSocketOptions {
  autoConnect?: boolean
  enableToasts?: boolean
  onNotification?: (notification: NotificationData) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: any) => void
}

interface WebSocketState {
  connected: boolean
  connecting: boolean
  error: string | null
  notifications: NotificationData[]
  unreadCount: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    enableToasts = true,
    onNotification,
    onConnect,
    onDisconnect,
    onError
  } = options

  const { user, token } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    notifications: [],
    unreadCount: 0
  })

  const connect = useCallback(() => {
    if (!user || !token || socketRef.current?.connected) {
      return
    }

    setState(prev => ({ ...prev, connecting: true, error: null }))

    const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socket',
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true
    })

    socket.on('connect', () => {
      console.log('WebSocket connected')
      setState(prev => ({ 
        ...prev, 
        connected: true, 
        connecting: false, 
        error: null 
      }))
      onConnect?.()
    })

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false 
      }))
      onDisconnect?.()
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: error.message 
      }))
      onError?.(error)
    })

    socket.on('notification', (notification: NotificationData) => {
      console.log('Received notification:', notification)
      
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications].slice(0, 100), // Keep last 100 notifications
        unreadCount: prev.unreadCount + 1
      }))

      // Show toast notification if enabled
      if (enableToasts) {
        const toastOptions = {
          description: notification.message,
          action: notification.actionUrl ? {
            label: notification.actionLabel || 'View',
            onClick: () => window.location.href = notification.actionUrl!
          } : undefined,
          duration: notification.priority === 'urgent' ? 10000 : 
                   notification.priority === 'high' ? 7000 : 
                   notification.priority === 'medium' ? 5000 : 3000
        }

        switch (notification.priority) {
          case 'urgent':
            toast.error(notification.title, toastOptions)
            break
          case 'high':
            toast.warning(notification.title, toastOptions)
            break
          case 'medium':
            toast.info(notification.title, toastOptions)
            break
          default:
            toast(notification.title, toastOptions)
        }
      }

      onNotification?.(notification)
    })

    socket.on('connected', (data) => {
      console.log('WebSocket welcome message:', data)
    })

    socket.on('pong', (data) => {
      console.log('WebSocket pong received:', data)
    })

    socketRef.current = socket
  }, [user, token, enableToasts, onNotification, onConnect, onDisconnect, onError])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 1000)
  }, [disconnect, connect])

  // Subscription methods
  const subscribeToShipment = useCallback((shipmentId: string) => {
    socketRef.current?.emit('subscribe_shipment', shipmentId)
  }, [])

  const unsubscribeFromShipment = useCallback((shipmentId: string) => {
    socketRef.current?.emit('unsubscribe_shipment', shipmentId)
  }, [])

  const subscribeToBox = useCallback((boxId: string) => {
    socketRef.current?.emit('subscribe_box', boxId)
  }, [])

  const unsubscribeFromBox = useCallback((boxId: string) => {
    socketRef.current?.emit('unsubscribe_box', boxId)
  }, [])

  const subscribeToCustomerOrder = useCallback((orderId: string) => {
    socketRef.current?.emit('subscribe_customer_order', orderId)
  }, [])

  const subscribeToReverseRequest = useCallback((requestId: string) => {
    socketRef.current?.emit('subscribe_reverse_request', requestId)
  }, [])

  const subscribeToPurchaseOrder = useCallback((orderId: string) => {
    socketRef.current?.emit('subscribe_purchase_order', orderId)
  }, [])

  const requestLiveTracking = useCallback((data: { awbNumber?: string, boxId?: string }) => {
    socketRef.current?.emit('request_live_tracking', data)
  }, [])

  const ping = useCallback(() => {
    socketRef.current?.emit('ping')
  }, [])

  const markAsRead = useCallback((notificationId?: string) => {
    setState(prev => {
      if (notificationId) {
        // Mark specific notification as read
        const updatedNotifications = prev.notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
        const unreadCount = updatedNotifications.filter(n => !n.read).length
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadCount
        }
      } else {
        // Mark all as read
        const updatedNotifications = prev.notifications.map(n => ({ ...n, read: true }))
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadCount: 0
        }
      }
    })
  }, [])

  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0
    }))
  }, [])

  // Auto-connect when user is available
  useEffect(() => {
    if (autoConnect && user && token && !socketRef.current) {
      connect()
    }

    return () => {
      if (socketRef.current) {
        disconnect()
      }
    }
  }, [autoConnect, user, token, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // State
    ...state,
    socket: socketRef.current,
    
    // Connection methods
    connect,
    disconnect,
    reconnect,
    
    // Subscription methods
    subscribeToShipment,
    unsubscribeFromShipment,
    subscribeToBox,
    unsubscribeFromBox,
    subscribeToCustomerOrder,
    subscribeToReverseRequest,
    subscribeToPurchaseOrder,
    
    // Utility methods
    requestLiveTracking,
    ping,
    markAsRead,
    clearNotifications
  }
}

// Hook for managing multiple subscriptions
export function useWebSocketSubscriptions() {
  const webSocket = useWebSocket()
  const subscriptionsRef = useRef<Set<string>>(new Set())

  const addSubscription = useCallback((type: string, id: string) => {
    const key = `${type}:${id}`
    if (subscriptionsRef.current.has(key)) return

    subscriptionsRef.current.add(key)
    
    switch (type) {
      case 'shipment':
        webSocket.subscribeToShipment(id)
        break
      case 'box':
        webSocket.subscribeToBox(id)
        break
      case 'customer_order':
        webSocket.subscribeToCustomerOrder(id)
        break
      case 'reverse_request':
        webSocket.subscribeToReverseRequest(id)
        break
      case 'purchase_order':
        webSocket.subscribeToPurchaseOrder(id)
        break
    }
  }, [webSocket])

  const removeSubscription = useCallback((type: string, id: string) => {
    const key = `${type}:${id}`
    if (!subscriptionsRef.current.has(key)) return

    subscriptionsRef.current.delete(key)
    
    switch (type) {
      case 'shipment':
        webSocket.unsubscribeFromShipment(id)
        break
      case 'box':
        webSocket.unsubscribeFromBox(id)
        break
      // Add other unsubscribe methods as needed
    }
  }, [webSocket])

  const clearAllSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach(key => {
      const [type, id] = key.split(':')
      removeSubscription(type, id)
    })
    subscriptionsRef.current.clear()
  }, [removeSubscription])

  useEffect(() => {
    return () => {
      clearAllSubscriptions()
    }
  }, [clearAllSubscriptions])

  return {
    ...webSocket,
    addSubscription,
    removeSubscription,
    clearAllSubscriptions,
    activeSubscriptions: Array.from(subscriptionsRef.current)
  }
}