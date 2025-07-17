import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, CheckCheck, Trash2, Settings, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWebSocket } from '@/hooks/useWebSocket'
import { NotificationData } from '@/lib/websocket'
import { formatDistanceToNow } from 'date-fns'

interface NotificationCenterProps {
  className?: string
}

const priorityColors = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-500'
}

const typeIcons = {
  shipment: '📦',
  tracking: '🚚',
  order: '🛒',
  reverse_request: '↩️',
  purchase_order: '📋',
  wallet: '💰',
  system: '⚙️'
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | 'high'>('all')
  const [enableSound, setEnableSound] = useState(true)
  const [enableToasts, setEnableToasts] = useState(true)
  
  const {
    connected,
    connecting,
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications
  } = useWebSocket({
    enableToasts,
    onNotification: (notification) => {
      // Play notification sound for high priority notifications
      if (enableSound && (notification.priority === 'urgent' || notification.priority === 'high')) {
        try {
          const audio = new Audio('/notification-sound.mp3')
          audio.volume = 0.3
          audio.play().catch(() => {
            // Ignore audio play errors (user interaction required)
          })
        } catch (error) {
          // Ignore audio errors
        }
      }
    }
  })

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read
      case 'urgent':
        return notification.priority === 'urgent'
      case 'high':
        return notification.priority === 'high'
      default:
        return true
    }
  })

  const handleNotificationClick = (notification: NotificationData) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const handleMarkAllAsRead = () => {
    markAsRead()
  }

  const handleClearAll = () => {
    clearNotifications()
  }

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-spareflow-primary/10"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            {connecting && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
            )}
            {connected && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-96 p-0" align="end">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {connected ? 'Live' : connecting ? 'Connecting...' : 'Offline'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <AnimatePresence>
                  {filteredNotifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          !notification.read ? 'bg-spareflow-primary/5' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="text-lg">
                              {typeIcons[notification.type] || '📢'}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium truncate">
                                {notification.title}
                              </h4>
                              <div
                                className={`w-2 h-2 rounded-full ${priorityColors[notification.priority]}`}
                              />
                              {!notification.read && (
                                <div className="w-2 h-2 bg-spareflow-primary rounded-full" />
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                              </span>
                              
                              {notification.actionLabel && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.actionLabel}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </ScrollArea>
            </CardContent>
            
            <Separator />
            
            <div className="p-3">
              <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="settings" className="text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="settings" className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-toasts" className="text-xs">
                      Toast notifications
                    </Label>
                    <Switch
                      id="enable-toasts"
                      checked={enableToasts}
                      onCheckedChange={setEnableToasts}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-sound" className="text-xs">
                      Sound alerts
                    </Label>
                    <Switch
                      id="enable-sound"
                      checked={enableSound}
                      onCheckedChange={setEnableSound}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Floating notification component for urgent notifications
export function FloatingNotification({ 
  notification, 
  onClose, 
  onAction 
}: { 
  notification: NotificationData
  onClose: () => void
  onAction?: () => void
}) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, notification.priority === 'urgent' ? 10000 : 5000)

    return () => clearTimeout(timer)
  }, [notification.priority, onClose])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-4 right-4 z-50 w-96"
    >
      <Card className={`border-l-4 shadow-lg ${
        notification.priority === 'urgent' ? 'border-l-red-500 bg-red-50' :
        notification.priority === 'high' ? 'border-l-orange-500 bg-orange-50' :
        'border-l-blue-500 bg-blue-50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="text-lg">
                {typeIcons[notification.type] || '📢'}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">
                  {notification.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {notification.message}
                </p>
                <div className="flex items-center gap-2">
                  {notification.actionUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={onAction}
                    >
                      {notification.actionLabel || 'View'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => {
                      setIsVisible(false)
                      setTimeout(onClose, 300)
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false)
                setTimeout(onClose, 300)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}