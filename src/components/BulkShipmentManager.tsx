import React, { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { EnhancedLoading } from '@/components/ui/enhanced-loading'
import { useToast } from '@/components/ui/use-toast'
import { 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Package,
  Truck,
  FileText,
  Eye,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react'

interface BulkShipmentItem {
  id?: string
  serviceCenterId: string
  serviceCenterName: string
  serviceCenterPincode: string
  serviceCenterAddress: string
  serviceCenterPhone: string
  numBoxes: number
  estimatedWeight?: number
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  notes?: string
  parts?: Array<{
    partId: string
    partName?: string
    quantity: number
    boxNumber?: number
  }>
}

interface BulkOperationResult {
  success: boolean
  totalShipments: number
  successfulShipments: number
  failedShipments: number
  results: Array<{
    index: number
    success: boolean
    shipmentId?: string
    error?: string
    details?: any
  }>
  summary: {
    totalCost: number
    totalDtdcCost: number
    totalMargin: number
    walletBalance: number
  }
}

interface BulkShipmentManagerProps {
  brandId: string
  onShipmentsCreated?: (results: BulkOperationResult) => void
}

export default function BulkShipmentManager({ brandId, onShipmentsCreated }: BulkShipmentManagerProps) {
  const [activeTab, setActiveTab] = useState('create')
  const [shipments, setShipments] = useState<BulkShipmentItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [results, setResults] = useState<BulkOperationResult | null>(null)
  const [serviceCenters, setServiceCenters] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [existingShipments, setExistingShipments] = useState<any[]>([])
  const [selectedShipments, setSelectedShipments] = useState<string[]>([])
  const [bulkOperation, setBulkOperation] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Load initial data
  React.useEffect(() => {
    loadServiceCenters()
    loadParts()
    loadExistingShipments()
  }, [])

  const loadServiceCenters = async () => {
    try {
      const response = await fetch('/api/brand/authorized-service-centers')
      if (response.ok) {
        const data = await response.json()
        setServiceCenters(data.serviceCenters || [])
      }
    } catch (error) {
      console.error('Error loading authorized service centers:', error)
    }
  }

  const loadParts = async () => {
    try {
      const response = await fetch(`/api/parts?brandId=${brandId}`)
      if (response.ok) {
        const data = await response.json()
        setParts(data)
      }
    } catch (error) {
      console.error('Error loading parts:', error)
    }
  }

  const loadExistingShipments = async () => {
    try {
      const response = await fetch(`/api/shipments?brandId=${brandId}`)
      if (response.ok) {
        const data = await response.json()
        setExistingShipments(data)
      }
    } catch (error) {
      console.error('Error loading shipments:', error)
    }
  }

  const addShipment = () => {
    const newShipment: BulkShipmentItem = {
      serviceCenterId: '',
      serviceCenterName: '',
      serviceCenterPincode: '',
      serviceCenterAddress: '',
      serviceCenterPhone: '',
      numBoxes: 1,
      estimatedWeight: 1.0,
      priority: 'MEDIUM',
      notes: '',
      parts: []
    }
    setShipments([...shipments, newShipment])
  }

  const removeShipment = (index: number) => {
    setShipments(shipments.filter((_, i) => i !== index))
  }

  const updateShipment = (index: number, field: keyof BulkShipmentItem, value: any) => {
    const updated = [...shipments]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-populate service center details when service center is selected
    if (field === 'serviceCenterId' && value) {
      const serviceCenter = serviceCenters.find(sc => sc.id === value)
      if (serviceCenter) {
        updated[index].serviceCenterName = serviceCenter.name
        // You would populate other fields from serviceCenter data if available
      }
    }
    
    setShipments(updated)
  }

  const addPartToShipment = (shipmentIndex: number) => {
    const updated = [...shipments]
    if (!updated[shipmentIndex].parts) {
      updated[shipmentIndex].parts = []
    }
    updated[shipmentIndex].parts!.push({
      partId: '',
      partName: '',
      quantity: 1,
      boxNumber: 1
    })
    setShipments(updated)
  }

  const updateShipmentPart = (shipmentIndex: number, partIndex: number, field: string, value: any) => {
    const updated = [...shipments]
    if (!updated[shipmentIndex].parts) return
    
    updated[shipmentIndex].parts![partIndex] = {
      ...updated[shipmentIndex].parts![partIndex],
      [field]: value
    }

    // Auto-populate part name when part is selected
    if (field === 'partId' && value) {
      const part = parts.find(p => p.id === value)
      if (part) {
        updated[shipmentIndex].parts![partIndex].partName = part.name
      }
    }

    setShipments(updated)
  }

  const removePartFromShipment = (shipmentIndex: number, partIndex: number) => {
    const updated = [...shipments]
    if (!updated[shipmentIndex].parts) return
    updated[shipmentIndex].parts = updated[shipmentIndex].parts!.filter((_, i) => i !== partIndex)
    setShipments(updated)
  }

  const validateShipments = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (shipments.length === 0) {
      errors.push('At least one shipment is required')
      return { isValid: false, errors }
    }

    shipments.forEach((shipment, index) => {
      if (!shipment.serviceCenterId) {
        errors.push(`Shipment ${index + 1}: Service Center is required`)
      }
      if (!shipment.serviceCenterPincode) {
        errors.push(`Shipment ${index + 1}: Service Center Pincode is required`)
      }
      if (!shipment.serviceCenterAddress) {
        errors.push(`Shipment ${index + 1}: Service Center Address is required`)
      }
      if (!shipment.serviceCenterPhone) {
        errors.push(`Shipment ${index + 1}: Service Center Phone is required`)
      }
      if (shipment.numBoxes < 1) {
        errors.push(`Shipment ${index + 1}: Number of boxes must be at least 1`)
      }
      if (shipment.parts && shipment.parts.length > 0) {
        shipment.parts.forEach((part, partIndex) => {
          if (!part.partId) {
            errors.push(`Shipment ${index + 1}, Part ${partIndex + 1}: Part selection is required`)
          }
          if (part.quantity < 1) {
            errors.push(`Shipment ${index + 1}, Part ${partIndex + 1}: Quantity must be at least 1`)
          }
          if (part.boxNumber && (part.boxNumber < 1 || part.boxNumber > shipment.numBoxes)) {
            errors.push(`Shipment ${index + 1}, Part ${partIndex + 1}: Box number must be between 1 and ${shipment.numBoxes}`)
          }
        })
      }
    })

    return { isValid: errors.length === 0, errors }
  }

  const processBulkShipments = async () => {
    const validation = validateShipments()
    if (!validation.isValid) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)
    setResults(null)

    try {
      const response = await fetch('/api/shipments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          shipments,
          options: {
            generateAWBImmediately: true,
            generateLabels: false,
            notifyServiceCenters: false,
            batchSize: 5
          }
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data)
        setProcessingProgress(100)
        
        toast({
          title: 'Bulk Operation Complete',
          description: `${data.successfulShipments}/${data.totalShipments} shipments created successfully`,
          variant: data.successfulShipments === data.totalShipments ? 'default' : 'destructive'
        })

        if (onShipmentsCreated) {
          onShipmentsCreated(data)
        }

        // Clear shipments on success
        if (data.successfulShipments === data.totalShipments) {
          setShipments([])
        }
      } else {
        throw new Error(data.error || 'Failed to create bulk shipments')
      }
    } catch (error) {
      console.error('Bulk shipment error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create bulk shipments',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        
        const parsedShipments: BulkShipmentItem[] = []
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          if (values.length < headers.length) continue
          
          const shipment: BulkShipmentItem = {
            serviceCenterId: values[headers.indexOf('serviceCenterId')] || '',
            serviceCenterName: values[headers.indexOf('serviceCenterName')] || '',
            serviceCenterPincode: values[headers.indexOf('serviceCenterPincode')] || '',
            serviceCenterAddress: values[headers.indexOf('serviceCenterAddress')] || '',
            serviceCenterPhone: values[headers.indexOf('serviceCenterPhone')] || '',
            numBoxes: parseInt(values[headers.indexOf('numBoxes')]) || 1,
            estimatedWeight: parseFloat(values[headers.indexOf('estimatedWeight')]) || 1.0,
            priority: (values[headers.indexOf('priority')] as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM',
            notes: values[headers.indexOf('notes')] || ''
          }
          
          parsedShipments.push(shipment)
        }
        
        setShipments(parsedShipments)
        toast({
          title: 'CSV Imported',
          description: `${parsedShipments.length} shipments imported successfully`
        })
      } catch (error) {
        toast({
          title: 'Import Error',
          description: 'Failed to parse CSV file',
          variant: 'destructive'
        })
      }
    }
    reader.readAsText(file)
  }

  const downloadCSVTemplate = () => {
    const headers = [
      'serviceCenterId',
      'serviceCenterName',
      'serviceCenterPincode',
      'serviceCenterAddress',
      'serviceCenterPhone',
      'numBoxes',
      'estimatedWeight',
      'priority',
      'notes'
    ]
    
    const csvContent = headers.join(',') + '\n' + 
      'sc_123,Service Center Name,400001,123 Main St Mumbai,9999999999,2,1.5,MEDIUM,Sample shipment'
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk_shipments_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const performBulkOperation = async () => {
    if (selectedShipments.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select shipments to perform bulk operation',
        variant: 'destructive'
      })
      return
    }

    if (!bulkOperation) {
      toast({
        title: 'No Operation',
        description: 'Please select an operation to perform',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)

    try {
      const requestData: any = {
        operation: bulkOperation,
        shipmentIds: selectedShipments
      }

      if (bulkOperation === 'updateStatus') {
        // You might want to add a status selection UI
        requestData.data = { status: 'DISPATCHED' }
      }

      const response = await fetch('/api/shipments/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Bulk Operation Complete',
          description: `${data.summary.successful}/${data.summary.total} operations completed successfully`
        })
        
        // Refresh existing shipments
        loadExistingShipments()
        setSelectedShipments([])
      } else {
        throw new Error(data.error || 'Bulk operation failed')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Bulk operation failed',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredShipments = existingShipments.filter(shipment => {
    const matchesSearch = searchTerm === '' || 
      shipment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.serviceCenter?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'default'
      case 'DISPATCHED': return 'secondary'
      case 'INITIATED': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bulk Shipment Manager</h2>
          <p className="text-muted-foreground">Create and manage multiple shipments efficiently</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Bulk Shipments</TabsTrigger>
          <TabsTrigger value="manage">Manage Existing</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bulk Shipment Creation
              </CardTitle>
              <CardDescription>
                Create multiple shipments at once. You can add shipments manually or import from CSV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Import/Export Controls */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <Button
                  onClick={addShipment}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Shipment
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />

              {/* Shipments List */}
              {shipments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Shipments ({shipments.length})</h3>
                    {shipments.length > 0 && (
                      <Button
                        onClick={processBulkShipments}
                        disabled={isProcessing}
                        className="flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <EnhancedLoading variant="spinner" size="sm" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Create All Shipments
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {isProcessing && (
                    <div className="space-y-2">
                      <Progress value={processingProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground">
                        Processing shipments... {processingProgress}%
                      </p>
                    </div>
                  )}

                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {shipments.map((shipment, index) => (
                        <Card key={index} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">
                                Shipment {index + 1}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant={getPriorityColor(shipment.priority || 'MEDIUM')}>
                                  {shipment.priority || 'MEDIUM'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeShipment(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Service Center</Label>
                                {serviceCenters.length === 0 ? (
                                  <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      You have no authorized Service Centers. Please add one first in the Network tab.
                                    </AlertDescription>
                                  </Alert>
                                ) : (
                                  <Select
                                    value={shipment.serviceCenterId}
                                    onValueChange={(value) => updateShipment(index, 'serviceCenterId', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select service center" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {serviceCenters.map((sc) => (
                                        <SelectItem key={sc.id} value={sc.id}>
                                          {sc.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Pincode</Label>
                                <Input
                                  value={shipment.serviceCenterPincode}
                                  onChange={(e) => updateShipment(index, 'serviceCenterPincode', e.target.value)}
                                  placeholder="400001"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Address</Label>
                              <Textarea
                                value={shipment.serviceCenterAddress}
                                onChange={(e) => updateShipment(index, 'serviceCenterAddress', e.target.value)}
                                placeholder="Complete service center address"
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                  value={shipment.serviceCenterPhone}
                                  onChange={(e) => updateShipment(index, 'serviceCenterPhone', e.target.value)}
                                  placeholder="9999999999"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Number of Boxes</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={shipment.numBoxes}
                                  onChange={(e) => updateShipment(index, 'numBoxes', parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Weight (kg)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={shipment.estimatedWeight || ''}
                                  onChange={(e) => updateShipment(index, 'estimatedWeight', parseFloat(e.target.value) || 1.0)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                  value={shipment.priority || 'MEDIUM'}
                                  onValueChange={(value) => updateShipment(index, 'priority', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input
                                  value={shipment.notes || ''}
                                  onChange={(e) => updateShipment(index, 'notes', e.target.value)}
                                  placeholder="Optional notes"
                                />
                              </div>
                            </div>

                            {/* Parts Section */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Parts (Optional)</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addPartToShipment(index)}
                                  className="flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Part
                                </Button>
                              </div>
                              
                              {shipment.parts && shipment.parts.length > 0 && (
                                <div className="space-y-2 border rounded-lg p-3">
                                  {shipment.parts.map((part, partIndex) => (
                                    <div key={partIndex} className="flex items-center gap-2">
                                      <Select
                                        value={part.partId}
                                        onValueChange={(value) => updateShipmentPart(index, partIndex, 'partId', value)}
                                      >
                                        <SelectTrigger className="flex-1">
                                          <SelectValue placeholder="Select part" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {parts.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              {p.name} ({p.code})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={part.quantity}
                                        onChange={(e) => updateShipmentPart(index, partIndex, 'quantity', parseInt(e.target.value) || 1)}
                                        placeholder="Qty"
                                        className="w-20"
                                      />
                                      <Input
                                        type="number"
                                        min="1"
                                        max={shipment.numBoxes}
                                        value={part.boxNumber || ''}
                                        onChange={(e) => updateShipmentPart(index, partIndex, 'boxNumber', parseInt(e.target.value) || undefined)}
                                        placeholder="Box #"
                                        className="w-20"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePartFromShipment(index, partIndex)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Results */}
              {results && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {results.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      Bulk Operation Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{results.totalShipments}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{results.successfulShipments}</div>
                        <div className="text-sm text-muted-foreground">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{results.failedShipments}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">₹{results.summary.totalCost.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Total Cost</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-semibold">Detailed Results</h4>
                      <ScrollArea className="h-40">
                        <div className="space-y-1">
                          {results.results.map((result, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex items-center gap-2">
                                {result.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm">Shipment {result.index + 1}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.success ? result.shipmentId : result.error}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Manage Existing Shipments
              </CardTitle>
              <CardDescription>
                Perform bulk operations on existing shipments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters and Search */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shipments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="INITIATED">Initiated</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={loadExistingShipments}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>

              {/* Bulk Operations */}
              {selectedShipments.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedShipments.length} shipment(s) selected
                  </span>
                  <Select value={bulkOperation} onValueChange={setBulkOperation}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updateStatus">Update Status</SelectItem>
                      <SelectItem value="generateAWB">Generate AWB</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={performBulkOperation}
                    disabled={!bulkOperation || isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <EnhancedLoading variant="spinner" size="sm" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Shipments Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedShipments.length === filteredShipments.length && filteredShipments.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedShipments(filteredShipments.map(s => s.id))
                            } else {
                              setSelectedShipments([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Service Center</TableHead>
                      <TableHead>Boxes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedShipments.includes(shipment.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedShipments([...selectedShipments, shipment.id])
                              } else {
                                setSelectedShipments(selectedShipments.filter(id => id !== shipment.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {shipment.id.slice(-8)}
                        </TableCell>
                        <TableCell>{shipment.serviceCenter?.name}</TableCell>
                        <TableCell>{shipment.numBoxes}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(shipment.status)}>
                            {shipment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(shipment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Shipment Details</DialogTitle>
                                  <DialogDescription>
                                    Shipment ID: {shipment.id}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Service Center</Label>
                                      <p className="text-sm">{shipment.serviceCenter?.name}</p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <Badge variant={getStatusColor(shipment.status)}>
                                        {shipment.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Boxes ({shipment.boxes?.length || 0})</Label>
                                    {shipment.boxes && shipment.boxes.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {shipment.boxes.map((box: any) => (
                                          <div key={box.id} className="flex items-center justify-between p-2 border rounded">
                                            <span>Box {box.boxNumber}</span>
                                            <div className="flex items-center gap-2">
                                              {box.awbNumber && (
                                                <Badge variant="outline">{box.awbNumber}</Badge>
                                              )}
                                              <Badge variant={getStatusColor(box.status)}>
                                                {box.status}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredShipments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No shipments found matching your criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}