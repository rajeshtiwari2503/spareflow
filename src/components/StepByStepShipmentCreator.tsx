import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { EnhancedLoading } from '@/components/ui/enhanced-loading'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ManualBoxAllocationManager from '@/components/ManualBoxAllocationManager'
import { 
  ArrowRight, 
  ArrowLeft,
  Package,
  Shield,
  Calculator,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle,
  Users,
  Box,
  Ruler,
  Weight,
  Plus,
  Minus,
  Trash2,
  Brain,
  Zap,
  Target,
  MapPin,
  Phone,
  Mail,
  Settings,
  FileText
} from 'lucide-react'
import { formatWeight, getCalculationWeight } from '@/lib/weight-formatter'

interface ServiceCenter {
  id: string
  name: string
  address: string
  pincode: string
  phone: string
  email: string
}

interface Part {
  id: string
  code: string
  name: string
  price: number
  weight?: number
  length?: number
  breadth?: number
  height?: number
  description?: string
  imageUrl?: string
  category?: string
}

interface SelectedPart {
  partId: string
  part: Part
  quantity: number
  boxNumber?: number
}

interface BoxAllocation {
  boxNumber: number
  parts: SelectedPart[]
  totalWeight: number
  totalVolume: number
  dimensions: {
    length: number
    breadth: number
    height: number
  }
  autoCalculated: boolean
}

interface InsuranceOption {
  type: 'NONE' | 'CARRIER_RISK' | 'OWNER_RISK'
  declaredValue: number
  premium: number
  gst: number
  total: number
}

interface CostBreakdown {
  baseRate: number
  weightCharges: number
  remoteAreaSurcharge: number
  expressMultiplier: number
  platformMarkup: number
  subtotal: number
  insurance: InsuranceOption | null
  finalTotal: number
  breakdown: {
    appliedRules: string[]
    calculations: string[]
  }
}

interface StepByStepShipmentCreatorProps {
  brandId: string
  onShipmentCreated?: (result: any) => void
}

export default function StepByStepShipmentCreator({ brandId, onShipmentCreated }: StepByStepShipmentCreatorProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  
  // Step 1: Service Center Selection
  const [selectedServiceCenter, setSelectedServiceCenter] = useState<ServiceCenter | null>(null)
  
  // Step 2: Parts Selection
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Step 3: Box Allocation
  const [boxAllocations, setBoxAllocations] = useState<BoxAllocation[]>([])
  const [allocationMode, setAllocationMode] = useState<'AUTO' | 'MANUAL'>('MANUAL')
  const [generatedLabels, setGeneratedLabels] = useState<any[]>([])
  
  // Step 4: Insurance
  const [insurance, setInsurance] = useState<InsuranceOption>({
    type: 'NONE',
    declaredValue: 0,
    premium: 0,
    gst: 0,
    total: 0
  })
  
  // Step 5: Cost Breakdown
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null)
  
  // Additional fields
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [notes, setNotes] = useState('')
  
  const { toast } = useToast()

  const steps = [
    { number: 1, title: 'Select Service Center', icon: Users },
    { number: 2, title: 'Select Parts & Quantity', icon: Package },
    { number: 3, title: 'Allocate to Boxes', icon: Box },
    { number: 4, title: 'Select Insurance', icon: Shield },
    { number: 5, title: 'Review & Create', icon: CheckCircle }
  ]

  // Load initial data
  useEffect(() => {
    loadServiceCenters()
    loadParts()
    loadWalletBalance()
  }, [])

  const loadServiceCenters = async () => {
    try {
      const response = await fetch('/api/brand/authorized-service-centers')
      if (response.ok) {
        const data = await response.json()
        setServiceCenters(data.serviceCenters || [])
      }
    } catch (error) {
      console.error('Error loading service centers:', error)
    }
  }

  const loadParts = async () => {
    try {
      const response = await fetch(`/api/parts?brandId=${brandId}`)
      if (response.ok) {
        const data = await response.json()
        // Handle different response formats
        const partsData = Array.isArray(data) ? data : (data.data || data.parts || [])
        setParts(partsData)
      }
    } catch (error) {
      console.error('Error loading parts:', error)
    }
  }

  const loadWalletBalance = async () => {
    try {
      const response = await fetch(`/api/brand/wallet`)
      if (response.ok) {
        const data = await response.json()
        setWalletBalance(data.wallet?.balance || 0)
      }
    } catch (error) {
      console.error('Error loading wallet balance:', error)
    }
  }

  // Step 1: Service Center Selection
  const handleServiceCenterSelect = (serviceCenterId: string) => {
    const serviceCenter = serviceCenters.find(sc => sc.id === serviceCenterId)
    if (serviceCenter) {
      setSelectedServiceCenter(serviceCenter)
    }
  }

  // Step 2: Parts Selection
  const addPartToSelection = (part: Part) => {
    const existingPart = selectedParts.find(sp => sp.partId === part.id)
    if (existingPart) {
      setSelectedParts(prev => 
        prev.map(sp => 
          sp.partId === part.id 
            ? { ...sp, quantity: sp.quantity + 1 }
            : sp
        )
      )
    } else {
      setSelectedParts(prev => [...prev, {
        partId: part.id,
        part,
        quantity: 1
      }])
    }
  }

  const updatePartQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedParts(prev => prev.filter(sp => sp.partId !== partId))
    } else {
      setSelectedParts(prev => 
        prev.map(sp => 
          sp.partId === partId 
            ? { ...sp, quantity }
            : sp
        )
      )
    }
  }

  const removePartFromSelection = (partId: string) => {
    setSelectedParts(prev => prev.filter(sp => sp.partId !== partId))
  }

  // Step 3: Box Allocation with AI Auto-calculation
  const autoAllocateToBoxes = () => {
    if (selectedParts.length === 0) return

    // Calculate total volume and weight
    let totalWeight = 0
    let totalVolume = 0
    
    selectedParts.forEach(sp => {
      const partWeight = getCalculationWeight(sp.part.weight) * sp.quantity
      const partVolume = sp.part.length && sp.part.breadth && sp.part.height 
        ? (sp.part.length * sp.part.breadth * sp.part.height / 1000000) * sp.quantity // Convert cm³ to m³
        : 0.001 * sp.quantity // Default 0.001 m³ per part
      
      totalWeight += partWeight
      totalVolume += partVolume
    })

    // AI-based box allocation logic
    const maxBoxWeight = 25 // kg
    const maxBoxVolume = 0.1 // m³ (100L)
    
    let boxes: BoxAllocation[] = []
    let currentBox: BoxAllocation = {
      boxNumber: 1,
      parts: [],
      totalWeight: 0,
      totalVolume: 0,
      dimensions: { length: 0, breadth: 0, height: 0 },
      autoCalculated: true
    }

    // Sort parts by size (largest first for better packing)
    const sortedParts = [...selectedParts].sort((a, b) => {
      const volumeA = a.part.length && a.part.breadth && a.part.height 
        ? a.part.length * a.part.breadth * a.part.height 
        : 1000
      const volumeB = b.part.length && b.part.breadth && b.part.height 
        ? b.part.length * b.part.breadth * b.part.height 
        : 1000
      return volumeB - volumeA
    })

    sortedParts.forEach(selectedPart => {
      const partWeight = getCalculationWeight(selectedPart.part.weight) * selectedPart.quantity
      const partVolume = selectedPart.part.length && selectedPart.part.breadth && selectedPart.part.height 
        ? (selectedPart.part.length * selectedPart.part.breadth * selectedPart.part.height / 1000000) * selectedPart.quantity
        : 0.001 * selectedPart.quantity

      // Check if part fits in current box
      if (currentBox.totalWeight + partWeight <= maxBoxWeight && 
          currentBox.totalVolume + partVolume <= maxBoxVolume) {
        // Add to current box
        currentBox.parts.push({ ...selectedPart, boxNumber: currentBox.boxNumber })
        currentBox.totalWeight += partWeight
        currentBox.totalVolume += partVolume
      } else {
        // Start new box
        if (currentBox.parts.length > 0) {
          boxes.push(currentBox)
        }
        currentBox = {
          boxNumber: boxes.length + 1,
          parts: [{ ...selectedPart, boxNumber: boxes.length + 1 }],
          totalWeight: partWeight,
          totalVolume: partVolume,
          dimensions: { length: 0, breadth: 0, height: 0 },
          autoCalculated: true
        }
      }
    })

    // Add the last box
    if (currentBox.parts.length > 0) {
      boxes.push(currentBox)
    }

    // Auto-calculate box dimensions based on contents
    boxes = boxes.map(box => {
      let maxLength = 30, maxBreadth = 20, maxHeight = 15 // Default dimensions in cm
      
      box.parts.forEach(sp => {
        if (sp.part.length && sp.part.breadth && sp.part.height) {
          maxLength = Math.max(maxLength, sp.part.length)
          maxBreadth = Math.max(maxBreadth, sp.part.breadth)
          maxHeight = Math.max(maxHeight, sp.part.height * sp.quantity) // Stack height
        }
      })

      // Add padding for packaging
      maxLength += 5
      maxBreadth += 5
      maxHeight += 5

      return {
        ...box,
        dimensions: {
          length: maxLength,
          breadth: maxBreadth,
          height: maxHeight
        }
      }
    })

    setBoxAllocations(boxes)
    
    toast({
      title: "AI Auto-Allocation Complete!",
      description: `${boxes.length} box${boxes.length > 1 ? 'es' : ''} optimized for efficient shipping`,
      variant: "default"
    })
  }

  // Step 4: Insurance Calculation
  const calculateInsurance = (type: 'NONE' | 'CARRIER_RISK' | 'OWNER_RISK', declaredValue: number) => {
    if (type === 'NONE') {
      return {
        type,
        declaredValue: 0,
        premium: 0,
        gst: 0,
        total: 0
      }
    }

    // Ensure declaredValue is a valid number
    const safeValue = isNaN(declaredValue) || declaredValue < 0 ? 0 : declaredValue
    const premium = safeValue * 0.02 // 2% premium
    const gst = premium * 0.18 // 18% GST
    const total = premium + gst

    return {
      type,
      declaredValue: safeValue,
      premium,
      gst,
      total
    }
  }

  // Step 5: Cost Calculation
  const calculateShippingCost = async () => {
    if (!selectedServiceCenter || boxAllocations.length === 0) return

    setLoading(true)
    try {
      const totalWeight = boxAllocations.reduce((sum, box) => sum + box.totalWeight, 0)
      const totalValue = selectedParts.reduce((sum, sp) => sum + (sp.part.price * sp.quantity), 0)
      
      // Calculate insurance first if needed
      let finalInsurance = insurance
      if (insurance.type !== 'NONE' && insurance.declaredValue === 0 && totalValue > 0) {
        // Auto-set declared value to total parts value if not set
        finalInsurance = calculateInsurance(insurance.type, totalValue)
        setInsurance(finalInsurance)
      }
      
      const response = await fetch('/api/shipments/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          shipments: [{
            serviceCenterId: selectedServiceCenter.id,
            serviceCenterPincode: selectedServiceCenter.pincode,
            numBoxes: boxAllocations.length,
            estimatedWeight: totalWeight,
            priority,
            insurance: finalInsurance
          }]
        })
      })

      const data = await response.json()
      if (response.ok && data.estimates && data.estimates[0]) {
        const breakdown = data.estimates[0]
        
        // Ensure insurance is properly included in the cost breakdown
        const insuranceCost = finalInsurance.type !== 'NONE' ? finalInsurance.total : 0
        const updatedBreakdown = {
          ...breakdown,
          insurance: finalInsurance.type !== 'NONE' ? finalInsurance : null,
          finalTotal: (breakdown.subtotal || 0) + insuranceCost
        }
        
        setCostBreakdown(updatedBreakdown)
        
        console.log('Cost breakdown calculated:', {
          subtotal: breakdown.subtotal,
          insurance: insuranceCost,
          finalTotal: updatedBreakdown.finalTotal
        })
      }
    } catch (error) {
      console.error('Error calculating cost:', error)
      toast({
        title: "Error calculating shipping cost",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Final Shipment Creation
  const createShipment = async () => {
    if (!selectedServiceCenter || !costBreakdown) return

    setLoading(true)
    try {
      const totalValue = selectedParts.reduce((sum, sp) => sum + (sp.part.price * sp.quantity), 0)
      
      const shipmentData = {
        recipientId: selectedServiceCenter.id,
        recipientType: 'SERVICE_CENTER' as const,
        parts: selectedParts.map(sp => ({
          partId: sp.partId,
          quantity: sp.quantity
        })),
        boxes: boxAllocations.map((box, index) => ({
          parts: box.parts.map(p => ({
            partId: p.partId,
            quantity: p.quantity
          })),
          dimensions: box.dimensions
        })),
        priority,
        notes,
        estimatedWeight: boxAllocations.reduce((sum, box) => sum + box.totalWeight, 0),
        serviceCenterPincode: selectedServiceCenter.pincode,
        numBoxes: boxAllocations.length,
        insurance: {
          type: insurance.type,
          declaredValue: insurance.type !== 'NONE' ? (insurance.declaredValue || totalValue) : 0
        }
      }

      console.log('Creating shipment with data:', {
        ...shipmentData,
        expectedCost: costBreakdown.finalTotal,
        insuranceCost: insurance.type !== 'NONE' ? insurance.total : 0
      })

      const response = await fetch('/api/shipments/create-comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentData)
      })

      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Shipment Created Successfully!",
          description: `AWB: ${result.dtdc?.awbNumber || 'Will be generated shortly'}`,
          variant: "default"
        })
        
        // Reset form
        setCurrentStep(1)
        setSelectedServiceCenter(null)
        setSelectedParts([])
        setBoxAllocations([])
        setInsurance({ type: 'NONE', declaredValue: 0, premium: 0, gst: 0, total: 0 })
        setCostBreakdown(null)
        setNotes('')
        
        // Refresh wallet balance
        loadWalletBalance()
        
        if (onShipmentCreated) {
          onShipmentCreated(result)
        }
      } else {
        throw new Error(result.error || 'Failed to create shipment')
      }
    } catch (error) {
      console.error('Error creating shipment:', error)
      toast({
        title: "Error creating shipment",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: return selectedServiceCenter !== null
      case 2: return selectedParts.length > 0
      case 3: return boxAllocations.length > 0
      case 4: return true // Insurance is optional
      case 5: return costBreakdown !== null
      default: return false
    }
  }

  const nextStep = () => {
    if (currentStep === 3 && boxAllocations.length === 0) {
      autoAllocateToBoxes()
    }
    if (currentStep === 4) {
      calculateShippingCost()
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const filteredParts = parts.filter(part => 
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            Smart Shipment Creator
          </h2>
          <p className="text-muted-foreground">Step-by-step shipment creation with AI optimization</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Wallet Balance</div>
            <div className="text-lg font-semibold">₹{(walletBalance || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      Step {step.number}
                    </div>
                    <div className={`text-xs ${
                      isActive ? 'text-blue-500' : isCompleted ? 'text-green-500' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 mx-4 text-gray-300" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[currentStep - 1].icon, { className: "h-5 w-5" })}
            {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Choose an authorized service center to send parts to"}
            {currentStep === 2 && "Select parts and specify quantities for shipment"}
            {currentStep === 3 && "AI will optimize box allocation based on part dimensions"}
            {currentStep === 4 && "Choose insurance coverage for your shipment"}
            {currentStep === 5 && "Review all details and create your shipment"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Service Center Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {serviceCenters.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You have no authorized service centers. Please add one in the Network tab first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceCenters.map((sc) => (
                    <Card 
                      key={sc.id} 
                      className={`cursor-pointer transition-all ${
                        selectedServiceCenter?.id === sc.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleServiceCenterSelect(sc.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Shield className="h-4 w-4 text-green-600" />
                              {sc.name}
                            </h3>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                {sc.address}
                              </div>
                              <div className="flex items-center gap-2">
                                <Target className="h-3 w-3" />
                                Pincode: {sc.pincode}
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                {sc.phone}
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                {sc.email}
                              </div>
                            </div>
                          </div>
                          {selectedServiceCenter?.id === sc.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Parts Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search parts by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Badge variant="outline">
                  {selectedParts.length} part{selectedParts.length !== 1 ? 's' : ''} selected
                </Badge>
              </div>

              {/* Selected Parts */}
              {selectedParts.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Selected Parts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedParts.map((sp) => (
                      <div key={sp.partId} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-3">
                          {sp.part.imageUrl && (
                            <img 
                              src={sp.part.imageUrl} 
                              alt={sp.part.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <h4 className="font-medium">{sp.part.name}</h4>
                            <p className="text-sm text-gray-600">{sp.part.code}</p>
                            <p className="text-sm font-medium">₹{(sp.part.price || 0).toFixed(2)} each</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePartQuantity(sp.partId, sp.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{sp.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePartQuantity(sp.partId, sp.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePartFromSelection(sp.partId)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Available Parts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredParts.map((part) => (
                  <Card key={part.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {part.imageUrl && (
                          <img 
                            src={part.imageUrl} 
                            alt={part.name}
                            className="w-full h-32 object-cover rounded"
                          />
                        )}
                        <div>
                          <h4 className="font-medium">{part.name}</h4>
                          <p className="text-sm text-gray-600">{part.code}</p>
                          <p className="text-sm font-medium">₹{(part.price || 0).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Weight: {formatWeight(part.weight)}</p>
                          {part.length && part.breadth && part.height && (
                            <p className="text-xs text-gray-500">
                              Size: {part.length}×{part.breadth}×{part.height}cm
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addPartToSelection(part)}
                          className="w-full"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Shipment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Box Allocation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Allocation Mode Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Box Allocation Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={allocationMode} onValueChange={(value: 'AUTO' | 'MANUAL') => setAllocationMode(value)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="MANUAL" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Manual Allocation
                      </TabsTrigger>
                      <TabsTrigger value="AUTO" className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Auto-Allocation
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="MANUAL" className="mt-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Manual Allocation:</strong> Manually assign parts to specific boxes (Box A, Box B, etc.) 
                          and generate printable labels showing contents for easy identification at the receiver end.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                    
                    <TabsContent value="AUTO" className="mt-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>AI Auto-Allocation:</strong> Let AI optimize box allocation based on part dimensions, 
                          weight, and shipping efficiency for cost-effective packaging.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Manual Allocation */}
              {allocationMode === 'MANUAL' && (
                <ManualBoxAllocationManager
                  selectedParts={selectedParts}
                  recipientName={selectedServiceCenter?.name || ''}
                  recipientAddress={selectedServiceCenter?.address || ''}
                  onBoxAllocationsChange={(allocations) => {
                    // Convert manual allocations to the format expected by the parent component
                    const convertedAllocations = allocations.map(allocation => ({
                      boxNumber: allocation.boxNumber,
                      parts: allocation.parts,
                      totalWeight: allocation.totalWeight,
                      totalVolume: allocation.totalVolume,
                      dimensions: allocation.dimensions,
                      autoCalculated: false
                    }))
                    setBoxAllocations(convertedAllocations)
                  }}
                  onLabelsGenerated={(labels) => {
                    setGeneratedLabels(labels)
                    toast({
                      title: "Box Labels Generated",
                      description: `${labels.length} printable label(s) ready for download`,
                      variant: "default"
                    })
                  }}
                />
              )}

              {/* Auto Allocation */}
              {allocationMode === 'AUTO' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">AI-Optimized Box Allocation</h3>
                      <p className="text-sm text-gray-600">
                        Parts are automatically allocated to boxes based on weight, size, and shipping efficiency
                      </p>
                    </div>
                    <Button onClick={autoAllocateToBoxes} variant="outline">
                      <Brain className="w-4 h-4 mr-2" />
                      {boxAllocations.length > 0 ? 'Re-optimize' : 'Auto-Allocate'}
                    </Button>
                  </div>

                  {boxAllocations.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Click "Auto-Allocate" or "Next" to automatically allocate parts to boxes using AI optimization.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {boxAllocations.map((box) => (
                        <Card key={box.boxNumber} className="border-l-4 border-l-green-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Box className="h-4 w-4" />
                              Box {box.boxNumber}
                              {box.autoCalculated && (
                                <Badge variant="outline" className="text-xs">
                                  <Zap className="w-3 h-3 mr-1" />
                                  AI Optimized
                                </Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <Label className="text-xs text-gray-500">Dimensions (cm)</Label>
                                <div className="flex items-center gap-1">
                                  <Ruler className="w-3 h-3" />
                                  <span>{box.dimensions.length} × {box.dimensions.breadth} × {box.dimensions.height}</span>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Total Weight</Label>
                                <div className="flex items-center gap-1">
                                  <Weight className="w-3 h-3" />
                                  <span>{(box.totalWeight || 0).toFixed(2)} kg</span>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Volume</Label>
                                <div className="flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  <span>{((box.totalVolume || 0) * 1000).toFixed(1)} L</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Contents:</Label>
                              <div className="mt-2 space-y-2">
                                {box.parts.map((part) => (
                                  <div key={part.partId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div>
                                      <span className="font-medium">{part.part.name}</span>
                                      <span className="text-sm text-gray-600 ml-2">({part.part.code})</span>
                                    </div>
                                    <Badge variant="secondary">
                                      {part.quantity} unit{part.quantity !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Generated Labels Summary */}
              {generatedLabels.length > 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      Box Labels Generated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">
                          {generatedLabels.length} printable label(s) have been generated for your boxes.
                          These labels will help identify box contents at the receiver end.
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {generatedLabels.length} Labels Ready
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Insurance Selection */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label>Insurance Type</Label>
                    <Select
                      value={insurance.type}
                      onValueChange={(value: 'NONE' | 'CARRIER_RISK' | 'OWNER_RISK') => {
                        const newInsurance = calculateInsurance(value, insurance.declaredValue || 0)
                        setInsurance(newInsurance)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No Insurance</SelectItem>
                        <SelectItem value="CARRIER_RISK">Carrier Risk</SelectItem>
                        <SelectItem value="OWNER_RISK">Owner Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {insurance.type !== 'NONE' && (
                    <div>
                      <Label>Declared Value (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={insurance.declaredValue || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          const newInsurance = calculateInsurance(insurance.type, value)
                          setInsurance(newInsurance)
                        }}
                        placeholder="Enter declared value"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low (Standard)</SelectItem>
                        <SelectItem value="MEDIUM">Medium (Express)</SelectItem>
                        <SelectItem value="HIGH">High (Priority)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special instructions or notes..."
                      rows={3}
                    />
                  </div>
                </div>

                {insurance.type !== 'NONE' && (insurance.declaredValue || 0) > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        Insurance Calculation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Declared Value:</span>
                        <span>₹{(insurance.declaredValue || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Premium (2%):</span>
                        <span>₹{(insurance.premium || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (18%):</span>
                        <span>₹{(insurance.gst || 0).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total Insurance:</span>
                        <span>₹{(insurance.total || 0).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {(insurance.declaredValue || 0) > 10000 && insurance.type === 'NONE' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Insurance Required:</strong> Shipments with declared value over ₹10,000 require insurance coverage.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 5: Review & Create */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <EnhancedLoading variant="spinner" size="lg" />
                  <p className="mt-4">Calculating shipping costs...</p>
                </div>
              ) : costBreakdown ? (
                <div className="space-y-4">
                  {/* Shipment Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Shipment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-gray-500">Service Center</Label>
                          <p className="font-medium">{selectedServiceCenter?.name}</p>
                          <p className="text-gray-600">{selectedServiceCenter?.address}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Shipment Details</Label>
                          <p>{boxAllocations.length} box{boxAllocations.length !== 1 ? 'es' : ''}</p>
                          <p>{selectedParts.reduce((sum, sp) => sum + sp.quantity, 0)} parts</p>
                          <p>Priority: {priority}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cost Breakdown */}
                  <Card className="border-2 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-green-600" />
                        Final Cost Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Base Rate:</span>
                            <span>₹{(costBreakdown.baseRate || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Weight Charges:</span>
                            <span>₹{(costBreakdown.weightCharges || 0).toFixed(2)}</span>
                          </div>
                          {(costBreakdown.remoteAreaSurcharge || 0) > 0 && (
                            <div className="flex justify-between">
                              <span>Remote Area:</span>
                              <span>₹{(costBreakdown.remoteAreaSurcharge || 0).toFixed(2)}</span>
                            </div>
                          )}
                          {(costBreakdown.expressMultiplier || 0) > 0 && (
                            <div className="flex justify-between">
                              <span>Express Service:</span>
                              <span>₹{(costBreakdown.expressMultiplier || 0).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Platform Markup:</span>
                            <span>₹{(costBreakdown.platformMarkup || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping Subtotal:</span>
                            <span>₹{(costBreakdown.subtotal || 0).toFixed(2)}</span>
                          </div>
                          {costBreakdown.insurance && (
                            <div className="flex justify-between text-blue-600">
                              <span>Insurance:</span>
                              <span>₹{(costBreakdown.insurance.total || 0).toFixed(2)}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between font-semibold text-green-600 text-base">
                            <span>Total Cost:</span>
                            <span>₹{(costBreakdown.finalTotal || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center">
                        {(walletBalance || 0) >= (costBreakdown.finalTotal || 0) ? (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Ready to Create Shipment!</strong> 
                              ₹{(costBreakdown.finalTotal || 0).toFixed(2)} will be deducted from your wallet.
                              AWB will be generated automatically.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Insufficient Balance!</strong> 
                              You need ₹{((costBreakdown.finalTotal || 0) - (walletBalance || 0)).toFixed(2)} more in your wallet.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Cost calculation will be performed automatically when you reach this step.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </div>

            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceedToNextStep()}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={createShipment}
                disabled={!costBreakdown || (walletBalance || 0) < (costBreakdown?.finalTotal || 0) || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <EnhancedLoading variant="spinner" size="sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Shipment
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}