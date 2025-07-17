import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Send, Zap, Package, Truck, Wallet, AlertTriangle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuth } from '@/contexts/AuthContext'
import AuthHeader from '@/components/AuthHeader'
import { NotificationCenter } from '@/components/NotificationCenter'
import { toast } from 'sonner'

const notificationTypes = [
  { value: 'shipment_created', label: 'Shipment Created', icon: Package, color: 'bg-blue-500' },
  { value: 'tracking_update', label: 'Tracking Update', icon: Truck, color: 'bg-yellow-500' },
  { value: 'wallet_transaction', label: 'Wallet Transaction', icon: Wallet, color: 'bg-green-500' },
  { value: 'system_alert', label: 'System Alert', icon: AlertTriangle, color: 'bg-red-500' },
  { value: 'broadcast', label: 'Broadcast Message', icon: Users, color: 'bg-purple-500' },
  { value: 'room_test', label: 'Room Test', icon: Bell, color: 'bg-orange-500' }
]

const priorityLevels = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
]

const userRoles = [
  { value: 'BRAND', label: 'Brand' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'SERVICE_CENTER', label: 'Service Center' },
  { value: 'CUSTOMER', label: 'Customer' }
]

export default function NotificationsDemo() {
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState('shipment_created')
  const [priority, setPriority] = useState('medium')
  const [message, setMessage] = useState('')
  const [customData, setCustomData] = useState('{}')
  const [isSending, setIsSending] = useState(false)

  const {
    connected,
    connecting,
    notifications,
    unreadCount,
    connect,
    disconnect,
    reconnect
  } = useWebSocket({
    enableToasts: true,
    onNotification: (notification) => {
      console.log('Demo page received notification:', notification)
    }
  })

  const sendTestNotification = async () => {
    if (!selectedType) {
      toast.error('Please select a notification type')
      return
    }

    setIsSending(true)
    try {
      let data = {}
      
      // Parse custom data if provided
      if (customData.trim()) {
        try {
          data = JSON.parse(customData)
        } catch (error) {
          toast.error('Invalid JSON in custom data')
          setIsSending(false)
          return
        }
      }

      // Add message and priority to data
      if (message) {
        data = { ...data, message, priority }
      }

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: selectedType,
          data
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Test notification sent: ${result.message}`)
      } else {
        toast.error(`Failed to send notification: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    } finally {
      setIsSending(false)
    }
  }

  const getTypeConfig = (type: string) => {
    return notificationTypes.find(t => t.value === type) || notificationTypes[0]
  }

  const getPriorityConfig = (priority: string) => {
    return priorityLevels.find(p => p.value === priority) || priorityLevels[1]
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">
              Please log in to access the notifications demo.
            </p>
            <Button onClick={() => window.location.href = '/auth/login'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Real-Time Notifications Demo" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Demo Controls */}
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  WebSocket Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      connected ? 'bg-green-500' : 
                      connecting ? 'bg-yellow-500 animate-pulse' : 
                      'bg-red-500'
                    }`} />
                    <span className="font-medium">
                      {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {unreadCount} unread
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={connect}
                    disabled={connected || connecting}
                    size="sm"
                    variant="outline"
                  >
                    Connect
                  </Button>
                  <Button
                    onClick={disconnect}
                    disabled={!connected}
                    size="sm"
                    variant="outline"
                  >
                    Disconnect
                  </Button>
                  <Button
                    onClick={reconnect}
                    size="sm"
                    variant="outline"
                  >
                    Reconnect
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Notification Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Test Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Notification Type */}
                <div className="space-y-2">
                  <Label>Notification Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map(type => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${type.color}`} />
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${level.color}`} />
                            {level.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label>Custom Message (optional)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter a custom message for the notification..."
                    rows={3}
                  />
                </div>

                {/* Custom Data */}
                <div className="space-y-2">
                  <Label>Custom Data (JSON)</Label>
                  <Textarea
                    value={customData}
                    onChange={(e) => setCustomData(e.target.value)}
                    placeholder='{"userId": "test-user", "amount": 100}'
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={sendTestNotification}
                  disabled={isSending || !connected}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Notification
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Test Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedType('shipment_created')
                      setPriority('medium')
                      setMessage('New shipment has been created and is ready for processing')
                      setCustomData('{"numBoxes": 3, "brandId": "brand-123"}')
                    }}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Shipment
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedType('tracking_update')
                      setPriority('high')
                      setMessage('Package is out for delivery')
                      setCustomData('{"status": "OUT_FOR_DELIVERY", "location": "Mumbai Central"}')
                    }}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Tracking
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedType('wallet_transaction')
                      setPriority('medium')
                      setMessage('Wallet has been debited for shipment')
                      setCustomData('{"type": "DEBIT", "amount": 750, "balanceAfter": 2250}')
                    }}
                  >
                    <Wallet className="h-4 w-4 mr-1" />
                    Wallet
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedType('system_alert')
                      setPriority('urgent')
                      setMessage('System maintenance scheduled for tonight')
                      setCustomData('{"affectedRoles": ["BRAND", "DISTRIBUTOR"]}')
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notifications Display */}
          <div className="space-y-6">
            {/* Notification Center Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Live Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <NotificationCenter />
                </div>
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                      <p className="text-sm">Send a test notification to see it here</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 rounded-lg border ${
                          !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPriorityConfig(notification.priority).color} text-white`}
                              >
                                {notification.priority}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {notification.type}
                              </span>
                            </div>
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                            <span className="text-xs text-gray-400">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle>Current User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Role:</span>
                    <Badge variant="secondary">{user.role}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}