import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Box,
  Package,
  Plus,
  Minus,
  Trash2,
  Move,
  Printer,
  Download,
  Eye,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Ruler,
  Weight,
  Tag,
  FileText,
  QrCode,
  Barcode,
  Copy,
  RefreshCw
} from 'lucide-react'

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
  boxLabel: string
  parts: SelectedPart[]
  totalWeight: number
  totalVolume: number
  dimensions: {
    length: number
    breadth: number
    height: number
  }
  customNotes?: string
  isManual: boolean
}

interface BoxLabel {
  boxNumber: number
  boxLabel: string
  contents: {
    partCode: string
    partName: string
    quantity: number
  }[]
  totalWeight: number
  dimensions: string
  shipmentId?: string
  recipientName: string
  recipientAddress: string
  customNotes?: string
  qrCode?: string
  barcode?: string
}

interface ManualBoxAllocationManagerProps {
  selectedParts: SelectedPart[]
  recipientName: string
  recipientAddress: string
  onBoxAllocationsChange: (allocations: BoxAllocation[]) => void
  onLabelsGenerated?: (labels: BoxLabel[]) => void
  onInsuranceChange?: (insurance: { type: 'NONE' | 'CARRIER_RISK' | 'OWNER_RISK', declaredValue: number, premium: number, gst: number, total: number }) => void
}

export default function ManualBoxAllocationManager({ 
  selectedParts, 
  recipientName, 
  recipientAddress, 
  onBoxAllocationsChange,
  onLabelsGenerated 
}: ManualBoxAllocationManagerProps) {
  const [boxAllocations, setBoxAllocations] = useState<BoxAllocation[]>([])
  const [unallocatedParts, setUnallocatedParts] = useState<SelectedPart[]>([])
  const [editingBox, setEditingBox] = useState<number | null>(null)
  const [newBoxDimensions, setNewBoxDimensions] = useState({ length: 30, breadth: 20, height: 15 })
  const [selectedPartForMove, setSelectedPartForMove] = useState<{ partId: string, fromBox: number } | null>(null)
  const [previewLabels, setPreviewLabels] = useState<BoxLabel[]>([])
  const [showLabelPreview, setShowLabelPreview] = useState(false)
  
  const { toast } = useToast()

  // Initialize unallocated parts when selectedParts change
  useEffect(() => {
    // Calculate how many of each part are already allocated
    const allocatedQuantities: Record<string, number> = {}
    boxAllocations.forEach(box => {
      box.parts.forEach(part => {
        allocatedQuantities[part.partId] = (allocatedQuantities[part.partId] || 0) + part.quantity
      })
    })

    // Create unallocated parts with remaining quantities
    const unallocated = selectedParts.map(sp => {
      const allocatedQty = allocatedQuantities[sp.partId] || 0
      const remainingQty = sp.quantity - allocatedQty
      return remainingQty > 0 ? { ...sp, quantity: remainingQty } : null
    }).filter(Boolean) as SelectedPart[]

    setUnallocatedParts(unallocated)
  }, [selectedParts, boxAllocations])

  // Notify parent component when allocations change
  useEffect(() => {
    onBoxAllocationsChange(boxAllocations)
  }, [boxAllocations, onBoxAllocationsChange])

  const createNewBox = () => {
    const newBoxNumber = boxAllocations.length + 1
    const newBox: BoxAllocation = {
      boxNumber: newBoxNumber,
      boxLabel: `Box ${String.fromCharCode(64 + newBoxNumber)}`, // A, B, C, etc.
      parts: [],
      totalWeight: 0,
      totalVolume: 0,
      dimensions: { ...newBoxDimensions },
      isManual: true
    }
    
    setBoxAllocations(prev => [...prev, newBox])
    toast({
      title: "New Box Created",
      description: `${newBox.boxLabel} is ready for part allocation`,
      variant: "default"
    })
  }

  const deleteBox = (boxNumber: number) => {
    const boxToDelete = boxAllocations.find(box => box.boxNumber === boxNumber)
    if (!boxToDelete) return

    // Move parts back to unallocated
    const partsToMove = boxToDelete.parts
    setUnallocatedParts(prev => [...prev, ...partsToMove])
    
    // Remove box and renumber remaining boxes
    const updatedBoxes = boxAllocations
      .filter(box => box.boxNumber !== boxNumber)
      .map((box, index) => ({
        ...box,
        boxNumber: index + 1,
        boxLabel: `Box ${String.fromCharCode(64 + index + 1)}`
      }))
    
    setBoxAllocations(updatedBoxes)
    toast({
      title: "Box Deleted",
      description: `${boxToDelete.boxLabel} deleted and parts moved to unallocated`,
      variant: "default"
    })
  }

  const addPartToBox = (partId: string, boxNumber: number, quantity: number = 1) => {
    const part = unallocatedParts.find(p => p.partId === partId)
    if (!part) return

    const availableQuantity = part.quantity
    const quantityToAdd = Math.min(quantity, availableQuantity)

    setBoxAllocations(prev => prev.map(box => {
      if (box.boxNumber === boxNumber) {
        const existingPart = box.parts.find(p => p.partId === partId)
        let updatedParts
        
        if (existingPart) {
          updatedParts = box.parts.map(p => 
            p.partId === partId 
              ? { ...p, quantity: p.quantity + quantityToAdd, boxNumber }
              : p
          )
        } else {
          updatedParts = [...box.parts, { ...part, quantity: quantityToAdd, boxNumber }]
        }

        const totalWeight = updatedParts.reduce((sum, p) => sum + (p.part.weight || 0.5) * p.quantity, 0)
        const totalVolume = updatedParts.reduce((sum, p) => {
          const volume = p.part.length && p.part.breadth && p.part.height 
            ? (p.part.length * p.part.breadth * p.part.height / 1000000) * p.quantity
            : 0.001 * p.quantity
          return sum + volume
        }, 0)

        return {
          ...box,
          parts: updatedParts,
          totalWeight,
          totalVolume
        }
      }
      return box
    }))

    // Update unallocated parts
    setUnallocatedParts(prev => prev.map(p => {
      if (p.partId === partId) {
        const newQuantity = p.quantity - quantityToAdd
        return newQuantity > 0 ? { ...p, quantity: newQuantity } : null
      }
      return p
    }).filter(Boolean) as SelectedPart[])

    toast({
      title: "Part Added to Box",
      description: `${quantityToAdd} unit(s) of ${part.part.name} added`,
      variant: "default"
    })
  }

  const removePartFromBox = (partId: string, boxNumber: number, quantity: number = 1) => {
    const box = boxAllocations.find(b => b.boxNumber === boxNumber)
    const part = box?.parts.find(p => p.partId === partId)
    if (!box || !part) return

    const quantityToRemove = Math.min(quantity, part.quantity)

    setBoxAllocations(prev => prev.map(b => {
      if (b.boxNumber === boxNumber) {
        const updatedParts = b.parts.map(p => {
          if (p.partId === partId) {
            const newQuantity = p.quantity - quantityToRemove
            return newQuantity > 0 ? { ...p, quantity: newQuantity } : null
          }
          return p
        }).filter(Boolean) as SelectedPart[]

        const totalWeight = updatedParts.reduce((sum, p) => sum + (p.part.weight || 0.5) * p.quantity, 0)
        const totalVolume = updatedParts.reduce((sum, p) => {
          const volume = p.part.length && p.part.breadth && p.part.height 
            ? (p.part.length * p.part.breadth * p.part.height / 1000000) * p.quantity
            : 0.001 * p.quantity
          return sum + volume
        }, 0)

        return {
          ...b,
          parts: updatedParts,
          totalWeight,
          totalVolume
        }
      }
      return b
    }))

    // Add back to unallocated
    setUnallocatedParts(prev => {
      const existingPart = prev.find(p => p.partId === partId)
      if (existingPart) {
        return prev.map(p => 
          p.partId === partId 
            ? { ...p, quantity: p.quantity + quantityToRemove }
            : p
        )
      } else {
        return [...prev, { ...part, quantity: quantityToRemove, boxNumber: undefined }]
      }
    })

    toast({
      title: "Part Removed from Box",
      description: `${quantityToRemove} unit(s) removed from ${box.boxLabel}`,
      variant: "default"
    })
  }

  const movePartBetweenBoxes = (partId: string, fromBox: number, toBox: number, quantity: number = 1) => {
    const sourceBox = boxAllocations.find(b => b.boxNumber === fromBox)
    const part = sourceBox?.parts.find(p => p.partId === partId)
    if (!sourceBox || !part) return

    const quantityToMove = Math.min(quantity, part.quantity)

    // Remove from source box
    removePartFromBox(partId, fromBox, quantityToMove)
    
    // Add to destination box (we need to get the part from selectedParts since it's not in unallocated)
    const originalPart = selectedParts.find(p => p.partId === partId)
    if (originalPart) {
      setBoxAllocations(prev => prev.map(box => {
        if (box.boxNumber === toBox) {
          const existingPart = box.parts.find(p => p.partId === partId)
          let updatedParts
          
          if (existingPart) {
            updatedParts = box.parts.map(p => 
              p.partId === partId 
                ? { ...p, quantity: p.quantity + quantityToMove }
                : p
            )
          } else {
            updatedParts = [...box.parts, { ...originalPart, quantity: quantityToMove, boxNumber: toBox }]
          }

          const totalWeight = updatedParts.reduce((sum, p) => sum + (p.part.weight || 0.5) * p.quantity, 0)
          const totalVolume = updatedParts.reduce((sum, p) => {
            const volume = p.part.length && p.part.breadth && p.part.height 
              ? (p.part.length * p.part.breadth * p.part.height / 1000000) * p.quantity
              : 0.001 * p.quantity
            return sum + volume
          }, 0)

          return {
            ...box,
            parts: updatedParts,
            totalWeight,
            totalVolume
          }
        }
        return box
      }))
    }

    toast({
      title: "Part Moved",
      description: `${quantityToMove} unit(s) moved between boxes`,
      variant: "default"
    })
  }

  const updateBoxDimensions = (boxNumber: number, dimensions: { length: number, breadth: number, height: number }) => {
    setBoxAllocations(prev => prev.map(box => 
      box.boxNumber === boxNumber 
        ? { ...box, dimensions }
        : box
    ))
  }

  const updateBoxNotes = (boxNumber: number, notes: string) => {
    setBoxAllocations(prev => prev.map(box => 
      box.boxNumber === boxNumber 
        ? { ...box, customNotes: notes }
        : box
    ))
  }

  const generateBoxLabels = () => {
    if (boxAllocations.length === 0) {
      toast({
        title: "No Boxes to Label",
        description: "Please create and allocate parts to boxes first",
        variant: "destructive"
      })
      return
    }

    const labels: BoxLabel[] = boxAllocations.map(box => {
      // Calculate actual weight from parts
      const calculatedWeight = box.parts.reduce((sum, part) => {
        const partWeight = part.part.weight || 0.5 // Default 500g if no weight
        return sum + (partWeight * part.quantity)
      }, 0)

      return {
        boxNumber: box.boxNumber,
        boxLabel: box.boxLabel,
        contents: box.parts.map(p => ({
          partCode: p.part.code,
          partName: p.part.name,
          quantity: p.quantity
        })),
        totalWeight: calculatedWeight > 0 ? calculatedWeight : box.totalWeight,
        dimensions: `${box.dimensions.length}×${box.dimensions.breadth}×${box.dimensions.height}cm`,
        recipientName,
        recipientAddress,
        customNotes: box.customNotes,
        qrCode: `BOX-${box.boxNumber}-${Date.now()}`,
        barcode: `${box.boxNumber}${Date.now().toString().slice(-6)}`
      }
    })

    console.log('Generated labels:', labels)
    
    setPreviewLabels(labels)
    setShowLabelPreview(true)
    
    if (onLabelsGenerated) {
      onLabelsGenerated(labels)
    }

    toast({
      title: "Labels Generated",
      description: `${labels.length} box label(s) ready for printing`,
      variant: "default"
    })
  }

  const printLabels = async () => {
    try {
      console.log('Sending labels to API:', previewLabels)
      
      const response = await fetch('/api/labels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: previewLabels })
      })

      console.log('API Response status:', response.status)

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        console.log('Response content type:', contentType)
        
        if (contentType && contentType.includes('application/pdf')) {
          // Handle PDF response
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `box-labels-${Date.now()}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)

          toast({
            title: "Labels Downloaded",
            description: "Box labels PDF downloaded successfully",
            variant: "default"
          })
        } else {
          // Handle JSON response (error case)
          const result = await response.json()
          console.log('API Response:', result)
          
          if (result.error) {
            throw new Error(result.error)
          } else {
            toast({
              title: "Labels Generated",
              description: result.message || "Labels generated successfully",
              variant: "default"
            })
          }
        }
      } else {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`Server error: ${response.status}`)
      }
    } catch (error) {
      console.error('Error printing labels:', error)
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Failed to generate printable labels",
        variant: "destructive"
      })
    }
  }

  const autoAllocateRemaining = () => {
    if (unallocatedParts.length === 0) return

    // Create a new box if none exist
    if (boxAllocations.length === 0) {
      createNewBox()
    }

    // Simple auto-allocation: distribute remaining parts across existing boxes
    const maxBoxWeight = 25 // kg
    let currentBoxIndex = 0

    unallocatedParts.forEach(part => {
      const partWeight = (part.part.weight || 0.5) * part.quantity
      
      // Find a box that can accommodate this part
      let targetBox = boxAllocations[currentBoxIndex]
      
      if (!targetBox || targetBox.totalWeight + partWeight > maxBoxWeight) {
        // Create new box if needed
        createNewBox()
        currentBoxIndex = boxAllocations.length
        targetBox = boxAllocations[currentBoxIndex]
      }

      if (targetBox) {
        addPartToBox(part.partId, targetBox.boxNumber, part.quantity)
      }
    })

    toast({
      title: "Auto-Allocation Complete",
      description: "Remaining parts allocated automatically",
      variant: "default"
    })
  }

  const isAllPartsAllocated = unallocatedParts.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-600" />
            Manual Box Allocation & Label Generation
          </h3>
          <p className="text-sm text-muted-foreground">
            Manually assign parts to boxes and generate printable labels for easy identification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isAllPartsAllocated ? "default" : "secondary"}>
            {unallocatedParts.length} unallocated
          </Badge>
          <Button onClick={generateBoxLabels} disabled={boxAllocations.length === 0}>
            <Printer className="w-4 h-4 mr-2" />
            Generate Labels
          </Button>
        </div>
      </div>

      <Tabs defaultValue="allocation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="allocation">Box Allocation</TabsTrigger>
          <TabsTrigger value="unallocated">Unallocated Parts ({unallocatedParts.length})</TabsTrigger>
          <TabsTrigger value="labels" disabled={!showLabelPreview}>Label Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="allocation" className="space-y-4">
          {/* Box Creation Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Box Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div>
                    <Label className="text-xs">Length (cm)</Label>
                    <Input
                      type="number"
                      value={newBoxDimensions.length}
                      onChange={(e) => setNewBoxDimensions(prev => ({ ...prev, length: parseInt(e.target.value) || 30 }))}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Breadth (cm)</Label>
                    <Input
                      type="number"
                      value={newBoxDimensions.breadth}
                      onChange={(e) => setNewBoxDimensions(prev => ({ ...prev, breadth: parseInt(e.target.value) || 20 }))}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height (cm)</Label>
                    <Input
                      type="number"
                      value={newBoxDimensions.height}
                      onChange={(e) => setNewBoxDimensions(prev => ({ ...prev, height: parseInt(e.target.value) || 15 }))}
                      min="1"
                    />
                  </div>
                </div>
                <Button onClick={createNewBox}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Box
                </Button>
                {unallocatedParts.length > 0 && (
                  <Button onClick={autoAllocateRemaining} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Auto-Allocate Remaining
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Box Allocations */}
          {boxAllocations.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Create your first box to start manual allocation. You can customize box dimensions and manually assign parts.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {boxAllocations.map((box) => (
                <Card key={box.boxNumber} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        {box.boxLabel}
                        <Badge variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          Manual
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBox(editingBox === box.boxNumber ? null : box.boxNumber)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteBox(box.boxNumber)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Box Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-gray-500">Dimensions (cm)</Label>
                        {editingBox === box.boxNumber ? (
                          <div className="grid grid-cols-3 gap-1">
                            <Input
                              type="number"
                              value={box.dimensions.length}
                              onChange={(e) => updateBoxDimensions(box.boxNumber, {
                                ...box.dimensions,
                                length: parseInt(e.target.value) || 30
                              })}
                              className="text-xs"
                            />
                            <Input
                              type="number"
                              value={box.dimensions.breadth}
                              onChange={(e) => updateBoxDimensions(box.boxNumber, {
                                ...box.dimensions,
                                breadth: parseInt(e.target.value) || 20
                              })}
                              className="text-xs"
                            />
                            <Input
                              type="number"
                              value={box.dimensions.height}
                              onChange={(e) => updateBoxDimensions(box.boxNumber, {
                                ...box.dimensions,
                                height: parseInt(e.target.value) || 15
                              })}
                              className="text-xs"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Ruler className="w-3 h-3" />
                            <span>{box.dimensions.length} × {box.dimensions.breadth} × {box.dimensions.height}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Total Weight</Label>
                        <div className="flex items-center gap-1">
                          <Weight className="w-3 h-3" />
                          <span>{box.totalWeight.toFixed(2)} kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Custom Notes */}
                    {editingBox === box.boxNumber && (
                      <div>
                        <Label className="text-xs">Custom Notes</Label>
                        <Input
                          placeholder="Add special instructions for this box..."
                          value={box.customNotes || ''}
                          onChange={(e) => updateBoxNotes(box.boxNumber, e.target.value)}
                        />
                      </div>
                    )}

                    {/* Box Contents */}
                    <div>
                      <Label className="text-sm font-medium">Contents ({box.parts.length} items):</Label>
                      {box.parts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded">
                          No parts allocated to this box
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                          {box.parts.map((part) => (
                            <div key={part.partId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <span className="font-medium text-sm">{part.part.name}</span>
                                <span className="text-xs text-gray-600 ml-2">({part.part.code})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {part.quantity} unit{part.quantity !== 1 ? 's' : ''}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removePartFromBox(part.partId, box.boxNumber, 1)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const unallocatedPart = unallocatedParts.find(p => p.partId === part.partId)
                                      if (unallocatedPart && unallocatedPart.quantity > 0) {
                                        addPartToBox(part.partId, box.boxNumber, 1)
                                      }
                                    }}
                                    className="h-6 w-6 p-0"
                                    disabled={!unallocatedParts.find(p => p.partId === part.partId)?.quantity}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedPartForMove({ partId: part.partId, fromBox: box.boxNumber })}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Move className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Add from Unallocated */}
                    {unallocatedParts.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500">Quick Add:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {unallocatedParts.slice(0, 3).map((part) => (
                            <Button
                              key={part.partId}
                              size="sm"
                              variant="outline"
                              onClick={() => addPartToBox(part.partId, box.boxNumber, 1)}
                              className="text-xs h-6"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              {part.part.code} ({part.quantity})
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Move Part Dialog */}
          {selectedPartForMove && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Move className="h-4 w-4 text-orange-600" />
                  Move Part Between Boxes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Move to Box:</Label>
                    <Select onValueChange={(value) => {
                      const toBox = parseInt(value)
                      movePartBetweenBoxes(selectedPartForMove.partId, selectedPartForMove.fromBox, toBox, 1)
                      setSelectedPartForMove(null)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination box" />
                      </SelectTrigger>
                      <SelectContent>
                        {boxAllocations
                          .filter(box => box.boxNumber !== selectedPartForMove.fromBox)
                          .map(box => (
                            <SelectItem key={box.boxNumber} value={box.boxNumber.toString()}>
                              {box.boxLabel}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPartForMove(null)}
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unallocated" className="space-y-4">
          {unallocatedParts.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All parts have been allocated to boxes! You can now generate labels.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {unallocatedParts.length} part{unallocatedParts.length !== 1 ? 's' : ''} still need to be allocated to boxes.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unallocatedParts.map((part) => (
                  <Card key={part.partId}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {part.part.imageUrl && (
                          <img 
                            src={part.part.imageUrl} 
                            alt={part.part.name}
                            className="w-full h-24 object-cover rounded"
                          />
                        )}
                        <div>
                          <h4 className="font-medium text-sm">{part.part.name}</h4>
                          <p className="text-xs text-gray-600">{part.part.code}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {part.quantity} unit{part.quantity !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {boxAllocations.length > 0 && (
                          <div>
                            <Label className="text-xs">Add to Box:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {boxAllocations.map((box) => (
                                <Button
                                  key={box.boxNumber}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addPartToBox(part.partId, box.boxNumber, 1)}
                                  className="text-xs h-6"
                                >
                                  {box.boxLabel}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="labels" className="space-y-4">
          {!showLabelPreview ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Generate labels first to preview them here.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Box Labels Preview</h4>
                <div className="flex items-center gap-2">
                  <Button onClick={printLabels} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Labels
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewLabels.map((label) => (
                  <Card key={label.boxNumber} className="border-2 border-dashed border-gray-300 print:border-solid print:border-black">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="text-center border-b pb-2">
                        <h3 className="text-lg font-bold">{label.boxLabel}</h3>
                        <p className="text-sm text-gray-600">SpareFlow Shipment</p>
                      </div>

                      {/* Recipient Info */}
                      <div>
                        <Label className="text-xs font-semibold">TO:</Label>
                        <p className="text-sm font-medium">{label.recipientName}</p>
                        <p className="text-xs text-gray-600">{label.recipientAddress}</p>
                      </div>

                      {/* Box Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <Label className="font-semibold">Weight:</Label>
                          <p>{label.totalWeight.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <Label className="font-semibold">Dimensions:</Label>
                          <p>{label.dimensions}</p>
                        </div>
                      </div>

                      {/* Contents */}
                      <div>
                        <Label className="text-xs font-semibold">CONTENTS:</Label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {label.contents.map((item, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{item.partName} ({item.partCode})</span>
                              <span className="font-medium">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Custom Notes */}
                      {label.customNotes && (
                        <div>
                          <Label className="text-xs font-semibold">NOTES:</Label>
                          <p className="text-xs">{label.customNotes}</p>
                        </div>
                      )}

                      {/* Codes */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="text-xs">
                          <div className="flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            <span className="font-mono">{label.qrCode}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Barcode className="w-3 h-3" />
                            <span className="font-mono">{label.barcode}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(`${label.boxLabel}: ${label.contents.map(c => `${c.partName} (${c.quantity})`).join(', ')}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}