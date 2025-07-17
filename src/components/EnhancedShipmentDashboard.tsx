import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Package, 
  Download, 
  Eye, 
  Truck, 
  MapPin, 
  Calendar, 
  Weight, 
  FileText,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  RotateCcw,
  MoreVertical,
  Printer
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import LabelManager from '@/components/LabelManager'

interface Box {
  id: string
  boxNumber: string
  awbNumber: string | null
  status: string
  weight: number
  boxParts: {
    id: string
    quantity: number
    part: {
      id: string
      name: string
      partNumber: string
    }
  }[]
}

interface Shipment {
  id: string
  numBoxes: number
  status: string
  createdAt: string
  brand: {
    id: string
    name: string
  }
  serviceCenter: {
    id: string
    name: string
    serviceCenterProfile?: {
      centerName: string
      addresses: {
        street: string
        city: string
        state: string
        pincode: string
      }[]
    }
  }
  boxes: Box[]
}

interface EnhancedShipmentDashboardProps {
  brandId?: string
  userId?: string
  userRole?: string
}

const EnhancedShipmentDashboard: React.FC<EnhancedShipmentDashboardProps> = ({ 
  brandId, 
  userId, 
  userRole 
}) => {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('all')
  const [downloadingLabels, setDownloadingLabels] = useState<Set<string>>(new Set())
  const [processingShipments, setProcessingShipments] = useState<Set<string>>(new Set())
  const [selectedBoxForLabel, setSelectedBoxForLabel] = useState<{ boxId: string; boxNumber: string; awbNumber: string; shipmentId: string } | null>(null)

  useEffect(() => {
    fetchShipments()
  }, [brandId, userId, userRole])

  const fetchShipments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters for filtering
      const params = new URLSearchParams()
      if (brandId) {
        params.append('brandId', brandId)
      } else if (userId && userRole) {
        params.append('userId', userId)
        params.append('role', userRole)
      }
      
      const url = `/api/shipments${params.toString() ? `?${params.toString()}` : ''}`
      console.log('🔍 Fetching shipments from:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API response error:', response.status, errorText)
        throw new Error(`Failed to fetch shipments: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 API response received:', {
        dataType: typeof data,
        isArray: Array.isArray(data),
        hasShipments: data && 'shipments' in data,
        shipmentsType: data?.shipments ? typeof data.shipments : 'undefined',
        shipmentsIsArray: data?.shipments ? Array.isArray(data.shipments) : false,
        shipmentsLength: data?.shipments ? data.shipments.length : 0
      })
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        console.log('✅ Using direct array data')
        setShipments(data)
      } else if (data && Array.isArray(data.shipments)) {
        console.log('✅ Using data.shipments array')
        setShipments(data.shipments)
      } else {
        console.warn('⚠️ API returned non-array data:', data)
        setShipments([])
      }
    } catch (err) {
      console.error('Error fetching shipments:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch shipments')
      setShipments([]) // Reset to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'pickup_awaited': return 'bg-orange-100 text-orange-800'
      case 'pickup_scheduled': return 'bg-orange-100 text-orange-800'
      case 'pickup_completed': return 'bg-green-100 text-green-800'
      case 'dispatched': return 'bg-green-100 text-green-800'
      case 'held_up': return 'bg-red-100 text-red-800'
      case 'in_transit': return 'bg-yellow-100 text-yellow-800'
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-emerald-100 text-emerald-800'
      case 'undelivered': return 'bg-red-100 text-red-800'
      case 'rto': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated': return <Clock className="w-4 h-4" />
      case 'confirmed': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <AlertCircle className="w-4 h-4" />
      case 'pickup_awaited': return <Clock className="w-4 h-4" />
      case 'pickup_scheduled': return <Calendar className="w-4 h-4" />
      case 'pickup_completed': return <CheckCircle className="w-4 h-4" />
      case 'dispatched': return <Truck className="w-4 h-4" />
      case 'held_up': return <AlertCircle className="w-4 h-4" />
      case 'in_transit': return <Truck className="w-4 h-4" />
      case 'out_for_delivery': return <Truck className="w-4 h-4" />
      case 'delivered': return <CheckCircle className="w-4 h-4" />
      case 'undelivered': return <XCircle className="w-4 h-4" />
      case 'rto': return <RotateCcw className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return <XCircle className="w-4 h-4" />
    }
  }

  const getStatusDisplayName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pickup_awaited': return 'Pickup Awaited'
      case 'pickup_scheduled': return 'Pickup Scheduled'
      case 'pickup_completed': return 'Pickup Completed'
      case 'held_up': return 'Held Up'
      case 'in_transit': return 'In Transit'
      case 'out_for_delivery': return 'Out For Delivery'
      case 'delivered': return 'Delivered'
      case 'undelivered': return 'Undelivered'
      case 'rto': return 'RTO'
      case 'cancelled': return 'Cancelled'
      default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    }
  }

  const downloadLabel = async (boxId: string, awbNumber: string) => {
    try {
      setDownloadingLabels(prev => new Set(prev).add(boxId))
      
      const response = await fetch(`/api/labels/download/${boxId}`)
      if (!response.ok) {
        throw new Error('Failed to download label')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipping-label-${awbNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading label:', err)
      alert('Failed to download label. Please try again.')
    } finally {
      setDownloadingLabels(prev => {
        const newSet = new Set(prev)
        newSet.delete(boxId)
        return newSet
      })
    }
  }

  const generateLabelsForShipment = async (shipmentId: string) => {
    try {
      const response = await fetch('/api/labels/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipmentId })
      })

      if (!response.ok) {
        throw new Error('Failed to generate labels')
      }

      const result = await response.json()
      alert(`Generated ${result.summary.successful}/${result.summary.total} labels successfully`)
    } catch (err) {
      console.error('Error generating labels:', err)
      alert('Failed to generate labels. Please try again.')
    }
  }

  const trackShipment = (awbNumber: string) => {
    window.open(`https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}`, '_blank')
  }

  const regenerateAWB = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to regenerate AWB numbers for this shipment? This will create new AWB numbers for boxes that don\'t have them.')) {
      return
    }

    try {
      setProcessingShipments(prev => new Set(prev).add(shipmentId))
      
      const response = await fetch(`/api/shipments/${shipmentId}/regenerate-awb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate AWB')
      }

      const result = await response.json()
      alert(`AWB regeneration completed. ${result.summary.successful} successful, ${result.summary.failed} failed.`)
      
      // Refresh shipments to show updated data
      await fetchShipments()
    } catch (err) {
      console.error('Error regenerating AWB:', err)
      alert('Failed to regenerate AWB. Please try again.')
    } finally {
      setProcessingShipments(prev => {
        const newSet = new Set(prev)
        newSet.delete(shipmentId)
        return newSet
      })
    }
  }

  const deleteShipment = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to delete this shipment? This action cannot be undone. If the shipment has AWB numbers, they will be cancelled and any charges will be refunded.')) {
      return
    }

    try {
      setProcessingShipments(prev => new Set(prev).add(shipmentId))
      
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete shipment')
      }

      const result = await response.json()
      alert(`Shipment deleted successfully. ${result.refund ? `₹${result.refund.amount} refunded to wallet.` : ''}`)
      
      // Refresh shipments to show updated data
      await fetchShipments()
    } catch (err) {
      console.error('Error deleting shipment:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete shipment. Please try again.')
    } finally {
      setProcessingShipments(prev => {
        const newSet = new Set(prev)
        newSet.delete(shipmentId)
        return newSet
      })
    }
  }

  const canEditOrDelete = (shipment: Shipment) => {
    return shipment.status !== 'DELIVERED' && shipment.status !== 'CANCELLED'
  }

  const hasFailedBoxes = (shipment: Shipment) => {
    return shipment.boxes && Array.isArray(shipment.boxes) && shipment.boxes.some(box => !box.awbNumber || box.status === 'PENDING')
  }

  const filterShipments = (shipments: Shipment[]) => {
    // Ensure shipments is an array
    if (!Array.isArray(shipments)) {
      console.warn('filterShipments: shipments is not an array:', shipments)
      return []
    }

    switch (selectedTab) {
      case 'pending':
        return shipments.filter(s => 
          ['INITIATED', 'PENDING', 'PICKUP_AWAITED'].includes(s.status.toUpperCase()) || 
          (s.boxes && Array.isArray(s.boxes) && s.boxes.some(b => !b.awbNumber || ['PENDING', 'PICKUP_AWAITED'].includes(b.status.toUpperCase())))
        )
      case 'pickup_scheduled':
        return shipments.filter(s => 
          s.status.toUpperCase() === 'PICKUP_SCHEDULED' || 
          (s.boxes && Array.isArray(s.boxes) && s.boxes.some(b => b.status.toUpperCase() === 'PICKUP_SCHEDULED'))
        )
      case 'dispatched':
        return shipments.filter(s => 
          ['DISPATCHED', 'PICKUP_COMPLETED'].includes(s.status.toUpperCase()) ||
          (s.boxes && Array.isArray(s.boxes) && s.boxes.some(b => ['DISPATCHED', 'PICKUP_COMPLETED'].includes(b.status.toUpperCase())))
        )
      case 'in_transit':
        return shipments.filter(s => 
          s.status.toUpperCase() === 'IN_TRANSIT' || 
          (s.boxes && Array.isArray(s.boxes) && s.boxes.some(b => b.status.toUpperCase() === 'IN_TRANSIT'))
        )
      case 'out_for_delivery':
        return shipments.filter(s => 
          s.status.toUpperCase() === 'OUT_FOR_DELIVERY' || 
          (s.boxes && Array.isArray(s.boxes) && s.boxes.some(b => b.status.toUpperCase() === 'OUT_FOR_DELIVERY'))
        )
      case 'delivered':
        return shipments.filter(s => 
          s.status.toUpperCase() === 'DELIVERED' || 
          (s.boxes && Array.isArray(s.boxes) && s.boxes.some(b => b.status.toUpperCase() === 'DELIVERED'))
        )
      case 'issues':
        return shipments.filter(s => 
          ['HELD_UP', 'UNDELIVERED', 'RTO', 'CANCELLED'].includes(s.status.toUpperCase()) ||
          (s.boxes && Array.isArray(s.boxes) && s.boxes.some(b => ['HELD_UP', 'UNDELIVERED', 'RTO', 'CANCELLED'].includes(b.status.toUpperCase())))
        )
      default:
        return shipments
    }
  }

  const getShipmentStats = () => {
    // Ensure shipments is an array before processing
    if (!Array.isArray(shipments)) {
      console.warn('shipments is not an array:', shipments)
      return { total: 0, pending: 0, pickupScheduled: 0, dispatched: 0, inTransit: 0, outForDelivery: 0, delivered: 0, issues: 0 }
    }

    const total = shipments.length
    const pending = shipments.filter(s => 
      ['INITIATED', 'PENDING', 'PICKUP_AWAITED'].includes(s.status.toUpperCase()) || 
      (s.boxes && s.boxes.some(b => !b.awbNumber || ['PENDING', 'PICKUP_AWAITED'].includes(b.status.toUpperCase())))
    ).length
    const pickupScheduled = shipments.filter(s => 
      s.status.toUpperCase() === 'PICKUP_SCHEDULED' || 
      (s.boxes && s.boxes.some(b => b.status.toUpperCase() === 'PICKUP_SCHEDULED'))
    ).length
    const dispatched = shipments.filter(s => 
      ['DISPATCHED', 'PICKUP_COMPLETED'].includes(s.status.toUpperCase()) ||
      (s.boxes && s.boxes.some(b => ['DISPATCHED', 'PICKUP_COMPLETED'].includes(b.status.toUpperCase())))
    ).length
    const inTransit = shipments.filter(s => 
      s.status.toUpperCase() === 'IN_TRANSIT' || 
      (s.boxes && s.boxes.some(b => b.status.toUpperCase() === 'IN_TRANSIT'))
    ).length
    const outForDelivery = shipments.filter(s => 
      s.status.toUpperCase() === 'OUT_FOR_DELIVERY' || 
      (s.boxes && s.boxes.some(b => b.status.toUpperCase() === 'OUT_FOR_DELIVERY'))
    ).length
    const delivered = shipments.filter(s => 
      s.status.toUpperCase() === 'DELIVERED' || 
      (s.boxes && s.boxes.some(b => b.status.toUpperCase() === 'DELIVERED'))
    ).length
    const issues = shipments.filter(s => 
      ['HELD_UP', 'UNDELIVERED', 'RTO', 'CANCELLED'].includes(s.status.toUpperCase()) ||
      (s.boxes && s.boxes.some(b => ['HELD_UP', 'UNDELIVERED', 'RTO', 'CANCELLED'].includes(b.status.toUpperCase())))
    ).length
    
    return { total, pending, pickupScheduled, dispatched, inTransit, outForDelivery, delivered, issues }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading shipments...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchShipments}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const stats = getShipmentStats()
  const filteredShipments = filterShipments(shipments)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Shipment Management</h2>
          <p className="text-gray-600">Manage and track your shipments</p>
        </div>
        <Button onClick={fetchShipments} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">{stats.pickupScheduled}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dispatched</p>
                <p className="text-2xl font-bold">{stats.dispatched}</p>
              </div>
              <Truck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold">{stats.inTransit}</p>
              </div>
              <Truck className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out for Delivery</p>
                <p className="text-2xl font-bold">{stats.outForDelivery}</p>
              </div>
              <Truck className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Issues</p>
                <p className="text-2xl font-bold">{stats.issues}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="pickup_scheduled">Scheduled ({stats.pickupScheduled})</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched ({stats.dispatched})</TabsTrigger>
          <TabsTrigger value="in_transit">In Transit ({stats.inTransit})</TabsTrigger>
          <TabsTrigger value="out_for_delivery">Out for Delivery ({stats.outForDelivery})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({stats.delivered})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({stats.issues})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredShipments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
                <p className="text-gray-600">
                  {selectedTab === 'all' 
                    ? 'No shipments have been created yet.' 
                    : `No shipments in ${selectedTab} status.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredShipments.map((shipment) => (
              <Card key={shipment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Shipment #{shipment.id.slice(-8)}
                        <Badge className={getStatusColor(shipment.status)}>
                          {getStatusIcon(shipment.status)}
                          <span className="ml-1">{getStatusDisplayName(shipment.status)}</span>
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(shipment.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {shipment.numBoxes} boxes
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {shipment.serviceCenter.serviceCenterProfile?.centerName || shipment.serviceCenter.name}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateLabelsForShipment(shipment.id)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Generate All Labels
                      </Button>
                      
                      {/* Shipment Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={processingShipments.has(shipment.id)}
                          >
                            {processingShipments.has(shipment.id) ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <MoreVertical className="w-4 h-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasFailedBoxes(shipment) && (
                            <DropdownMenuItem 
                              onClick={() => regenerateAWB(shipment.id)}
                              disabled={processingShipments.has(shipment.id)}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Regenerate AWB
                            </DropdownMenuItem>
                          )}
                          {canEditOrDelete(shipment) && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => alert('Edit functionality coming soon!')}
                                disabled={processingShipments.has(shipment.id)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Shipment
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteShipment(shipment.id)}
                                disabled={processingShipments.has(shipment.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Shipment
                              </DropdownMenuItem>
                            </>
                          )}
                          {!canEditOrDelete(shipment) && !hasFailedBoxes(shipment) && (
                            <DropdownMenuItem disabled>
                              <AlertCircle className="w-4 h-4 mr-2" />
                              No actions available
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Shipment Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">From (Brand)</h4>
                        <p className="text-sm text-gray-600">{shipment.brand.name}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">To (Service Center)</h4>
                        <p className="text-sm text-gray-600">
                          {shipment.serviceCenter.serviceCenterProfile?.centerName || shipment.serviceCenter.name}
                        </p>
                        {shipment.serviceCenter.serviceCenterProfile?.addresses?.[0] && (
                          <p className="text-xs text-gray-500 mt-1">
                            {shipment.serviceCenter.serviceCenterProfile.addresses[0].city}, {shipment.serviceCenter.serviceCenterProfile.addresses[0].state} - {shipment.serviceCenter.serviceCenterProfile.addresses[0].pincode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Boxes */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Boxes ({shipment.boxes.length})</h4>
                      <div className="grid gap-3">
                        {shipment.boxes.map((box) => (
                          <div key={box.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h5 className="font-medium">Box #{box.boxNumber}</h5>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Weight className="w-4 h-4" />
                                    {box.weight.toFixed(2)} kg
                                  </span>
                                  <Badge className={getStatusColor(box.status)}>
                                    {getStatusIcon(box.status)}
                                    <span className="ml-1">{getStatusDisplayName(box.status)}</span>
                                  </Badge>
                                  {box.awbNumber && (
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                      AWB: {box.awbNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                {box.awbNumber ? (
                                  <>
                                    {/* V220 Enhanced Label Manager Integration */}
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedBoxForLabel({
                                            boxId: box.id,
                                            boxNumber: box.boxNumber,
                                            awbNumber: box.awbNumber!,
                                            shipmentId: shipment.id
                                          })}
                                        >
                                          <Eye className="w-4 h-4 mr-1" />
                                          Preview & Download
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                                        <DialogHeader>
                                          <DialogTitle>Box Label Manager - V220 Enhanced</DialogTitle>
                                          <DialogDescription>
                                            Preview, print, and download professional shipping labels with enhanced formatting
                                          </DialogDescription>
                                        </DialogHeader>
                                        {selectedBoxForLabel && selectedBoxForLabel.boxId === box.id && (
                                          <LabelManager
                                            boxId={box.id}
                                            boxNumber={box.boxNumber}
                                            awbNumber={box.awbNumber!}
                                            shipmentId={shipment.id}
                                            onLabelGenerated={(result) => {
                                              console.log('Label generated:', result)
                                              // Optional: Show success message or refresh data
                                            }}
                                          />
                                        )}
                                      </DialogContent>
                                    </Dialog>
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadLabel(box.id, box.awbNumber!)}
                                      disabled={downloadingLabels.has(box.id)}
                                    >
                                      {downloadingLabels.has(box.id) ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Download className="w-4 h-4" />
                                      )}
                                      <span className="ml-1">Quick Download</span>
                                    </Button>
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => trackShipment(box.awbNumber!)}
                                    >
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      Track
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="secondary">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    AWB Pending
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Parts in this box */}
                            {box.boxParts.length > 0 && (
                              <div>
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Parts ({box.boxParts.length})</h6>
                                <div className="space-y-1">
                                  {box.boxParts.map((boxPart) => (
                                    <div key={boxPart.id} className="flex justify-between items-center text-sm">
                                      <span className="text-gray-600">
                                        {boxPart.part.name} ({boxPart.part.partNumber})
                                      </span>
                                      <span className="font-medium">Qty: {boxPart.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EnhancedShipmentDashboard