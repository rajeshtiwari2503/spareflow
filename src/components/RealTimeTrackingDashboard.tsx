import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Truck, Package, MapPin, Clock, Zap, RefreshCw, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useWebSocketSubscriptions } from '@/hooks/useWebSocket'
import { formatDistanceToNow } from 'date-fns'

interface TrackingData {
  boxId: string
  boxNumber: number
  awbNumber: string
  status: string
  weight: number
  shipment: {
    id: string
    brand: { name: string }
    serviceCenter: { name: string }
    status: string
  }
  currentTracking: {
    status: string
    location: string
    timestamp: string
    description: string
    isLive: boolean
  } | null
  trackingHistory: Array<{
    status: string
    location: string
    timestamp: string
    description: string
    isLive: boolean
  }>
}

interface RealTimeTrackingDashboardProps {
  initialData?: TrackingData[]
  userId?: string
  userRole?: string
}

const statusColors = {
  'PENDING_AWB': 'bg-gray-500',
  'SHIPPED': 'bg-blue-500',
  'IN_TRANSIT': 'bg-yellow-500',
  'OUT_FOR_DELIVERY': 'bg-orange-500',
  'DELIVERED': 'bg-green-500',
  'DELIVERY_ATTEMPTED': 'bg-red-500',
  'RETURN_TO_ORIGIN': 'bg-purple-500',
  'AWB_FAILED': 'bg-red-600'
}

const statusIcons = {
  'PENDING_AWB': Package,
  'SHIPPED': Truck,
  'IN_TRANSIT': Truck,
  'OUT_FOR_DELIVERY': MapPin,
  'DELIVERED': Package,
  'DELIVERY_ATTEMPTED': RefreshCw,
  'RETURN_TO_ORIGIN': RefreshCw,
  'AWB_FAILED': Package
}

export function RealTimeTrackingDashboard({ 
  initialData = [], 
  userId, 
  userRole 
}: RealTimeTrackingDashboardProps) {
  const [trackingData, setTrackingData] = useState<TrackingData[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const {
    connected,
    connecting,
    notifications,
    addSubscription,
    removeSubscription,
    requestLiveTracking
  } = useWebSocketSubscriptions()

  // Subscribe to tracking updates for all boxes
  useEffect(() => {
    trackingData.forEach(item => {
      addSubscription('box', item.boxId)
      addSubscription('shipment', item.shipment.id)
    })

    return () => {
      trackingData.forEach(item => {
        removeSubscription('box', item.boxId)
        removeSubscription('shipment', item.shipment.id)
      })
    }
  }, [trackingData, addSubscription, removeSubscription])

  // Handle real-time tracking notifications
  useEffect(() => {
    const trackingNotifications = notifications.filter(n => n.type === 'tracking')
    
    trackingNotifications.forEach(notification => {
      if (notification.data) {
        const { boxId, status, location, description, timestamp } = notification.data
        
        setTrackingData(prev => prev.map(item => {
          if (item.boxId === boxId) {
            const newTrackingEntry = {
              status,
              location: location || '',
              timestamp,
              description: description || status,
              isLive: true
            }
            
            return {
              ...item,
              status: status === 'DELIVERED' ? 'DELIVERED' : 
                     ['PICKED_UP', 'IN_TRANSIT', 'REACHED_HUB', 'OUT_FOR_DELIVERY'].includes(status) ? 'IN_TRANSIT' : 
                     item.status,
              currentTracking: newTrackingEntry,
              trackingHistory: [newTrackingEntry, ...item.trackingHistory]
            }
          }
          return item
        }))
        
        setLastUpdate(new Date())
      }
    })
  }, [notifications])

  const fetchLiveTracking = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tracking/get-tracking?${new URLSearchParams({
        ...(userId && { userId }),
        ...(userRole && { role: userRole }),
        liveTracking: 'true'
      })}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setTrackingData(result.data)
          setLastUpdate(new Date())
        }
      }
    } catch (error) {
      console.error('Failed to fetch live tracking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const requestLiveTrackingForBox = (boxId: string, awbNumber: string) => {
    requestLiveTracking({ boxId, awbNumber })
  }

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Package
    return Icon
  }

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-spareflow-primary/10 rounded-lg">
            <Truck className="h-6 w-6 text-spareflow-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Real-Time Tracking</h2>
            <p className="text-sm text-gray-600">
              Live shipment updates • Last updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {connected ? 'Live' : connecting ? 'Connecting...' : 'Offline'}
            </span>
          </div>
          
          <Button
            onClick={fetchLiveTracking}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tracking Cards */}
      <div className="grid gap-4">
        <AnimatePresence>
          {trackingData.map((item, index) => {
            const StatusIcon = getStatusIcon(item.status)
            const statusColor = getStatusColor(item.status)
            
            return (
              <motion.div
                key={item.boxId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg text-white ${statusColor}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Box #{item.boxNumber}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            AWB: {item.awbNumber}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.weight}kg
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => requestLiveTrackingForBox(item.boxId, item.awbNumber)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Shipment Info */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {item.shipment.brand.name} → {item.shipment.serviceCenter.name}
                      </span>
                      <Badge variant="secondary">
                        {item.shipment.status}
                      </Badge>
                    </div>
                    
                    {/* Current Status */}
                    {item.currentTracking && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.currentTracking.isLive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="font-medium text-sm">
                              {item.currentTracking.status}
                            </span>
                            {item.currentTracking.isLive && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Live
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(item.currentTracking.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-1">
                          {item.currentTracking.description}
                        </p>
                        
                        {item.currentTracking.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {item.currentTracking.location}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tracking History */}
                    {item.trackingHistory.length > 1 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Tracking History
                        </h4>
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {item.trackingHistory.slice(1, 6).map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${entry.isLive ? 'bg-green-400' : 'bg-gray-400'}`} />
                                  <span>{entry.status}</span>
                                  {entry.location && (
                                    <span className="text-gray-500">• {entry.location}</span>
                                  )}
                                </div>
                                <span className="text-gray-500">
                                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
        
        {trackingData.length === 0 && (
          <Card className="p-8 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments to track</h3>
            <p className="text-gray-600">
              Shipments will appear here once they are created and have tracking information.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}