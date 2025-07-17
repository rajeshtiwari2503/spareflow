import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText,
  Truck,
  Send,
  Building,
  Factory,
  Loader2,
  RefreshCw,
  Eye,
  Download,
  ExternalLink
} from 'lucide-react';

interface Distributor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  gstNumber?: string;
  contactPerson?: string;
  isActive: boolean;
}

interface Part {
  id: string;
  code: string;
  name: string;
  price: number;
  weight?: number;
  length?: number;
  breadth?: number;
  height?: number;
  description?: string;
  imageUrl?: string;
  category?: string;
  stockQuantity: number;
  minStockLevel: number;
}

interface SelectedPart {
  partId: string;
  part: Part;
  quantity: number;
  boxNumber?: number;
}

interface BoxAllocation {
  boxNumber: number;
  parts: SelectedPart[];
  totalWeight: number;
  totalVolume: number;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  autoCalculated: boolean;
}

interface ShipmentCost {
  baseRate: number;
  weightCharges: number;
  remoteAreaSurcharge: number;
  platformMarkup: number;
  subtotal: number;
  finalTotal: number;
}

interface BrandToDistributorShipmentManagerProps {
  brandId: string;
  onShipmentCreated?: (result: any) => void;
}

export default function BrandToDistributorShipmentManager({ 
  brandId, 
  onShipmentCreated 
}: BrandToDistributorShipmentManagerProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Step 1: Distributor Selection
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  
  // Step 2: Parts Selection
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Step 3: Box Allocation
  const [boxAllocations, setBoxAllocations] = useState<BoxAllocation[]>([]);
  const [allocationMode, setAllocationMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  
  // Step 4: Cost & Shipping
  const [shippingCost, setShippingCost] = useState<ShipmentCost | null>(null);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [notes, setNotes] = useState('');
  
  const { toast } = useToast();

  const steps = [
    { number: 1, title: 'Select Distributor', icon: Building },
    { number: 2, title: 'Select Parts & Quantity', icon: Package },
    { number: 3, title: 'Allocate to Boxes', icon: Box },
    { number: 4, title: 'Review & Ship', icon: Truck }
  ];

  // Load initial data
  useEffect(() => {
    loadDistributors();
    loadParts();
    loadWalletBalance();
  }, []);

  const loadDistributors = async () => {
    try {
      // Mock distributors for now - in real system, fetch from API
      const mockDistributors: Distributor[] = [
        {
          id: 'dist-001',
          name: 'Mumbai Electronics Distributors',
          email: 'orders@mumbaielectronics.com',
          phone: '+91 98765 43210',
          address: '123 Industrial Estate, Andheri East',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra',
          gstNumber: '27ABCDE1234F1Z5',
          contactPerson: 'Rajesh Kumar',
          isActive: true
        },
        {
          id: 'dist-002',
          name: 'Delhi Auto Parts Hub',
          email: 'procurement@delhiautoparts.com',
          phone: '+91 98765 43211',
          address: '456 Karol Bagh Market',
          pincode: '110005',
          city: 'New Delhi',
          state: 'Delhi',
          gstNumber: '07ABCDE1234F1Z6',
          contactPerson: 'Priya Sharma',
          isActive: true
        },
        {
          id: 'dist-003',
          name: 'Bangalore Tech Distributors',
          email: 'orders@bangaloretech.com',
          phone: '+91 98765 43212',
          address: '789 Electronic City Phase 1',
          pincode: '560100',
          city: 'Bangalore',
          state: 'Karnataka',
          gstNumber: '29ABCDE1234F1Z7',
          contactPerson: 'Suresh Reddy',
          isActive: true
        }
      ];
      setDistributors(mockDistributors);
    } catch (error) {
      console.error('Error loading distributors:', error);
      toast({
        title: "Error",
        description: "Failed to load distributors",
        variant: "destructive"
      });
    }
  };

  const loadParts = async () => {
    try {
      const response = await fetch(`/api/parts?brandId=${brandId}`);
      if (response.ok) {
        const data = await response.json();
        const partsData = Array.isArray(data) ? data : (data.data || data.parts || []);
        setParts(partsData);
      }
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  const loadWalletBalance = async () => {
    try {
      const response = await fetch(`/api/brand/wallet`);
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.wallet?.balance || 0);
      }
    } catch (error) {
      console.error('Error loading wallet balance:', error);
    }
  };

  // Step 1: Distributor Selection
  const handleDistributorSelect = (distributorId: string) => {
    const distributor = distributors.find(d => d.id === distributorId);
    if (distributor) {
      setSelectedDistributor(distributor);
    }
  };

  // Step 2: Parts Selection
  const addPartToSelection = (part: Part) => {
    const existingPart = selectedParts.find(sp => sp.partId === part.id);
    if (existingPart) {
      setSelectedParts(prev => 
        prev.map(sp => 
          sp.partId === part.id 
            ? { ...sp, quantity: sp.quantity + 1 }
            : sp
        )
      );
    } else {
      setSelectedParts(prev => [...prev, {
        partId: part.id,
        part,
        quantity: 1
      }]);
    }
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedParts(prev => prev.filter(sp => sp.partId !== partId));
    } else {
      setSelectedParts(prev => 
        prev.map(sp => 
          sp.partId === partId 
            ? { ...sp, quantity }
            : sp
        )
      );
    }
  };

  const removePartFromSelection = (partId: string) => {
    setSelectedParts(prev => prev.filter(sp => sp.partId !== partId));
  };

  // Step 3: Auto Box Allocation
  const autoAllocateToBoxes = () => {
    if (selectedParts.length === 0) return;

    // Calculate total volume and weight
    let totalWeight = 0;
    let totalVolume = 0;
    
    selectedParts.forEach(sp => {
      const partWeight = (sp.part.weight || 0.5) * sp.quantity;
      const partVolume = sp.part.length && sp.part.breadth && sp.part.height 
        ? (sp.part.length * sp.part.breadth * sp.part.height / 1000000) * sp.quantity
        : 0.001 * sp.quantity;
      
      totalWeight += partWeight;
      totalVolume += partVolume;
    });

    // AI-based box allocation logic
    const maxBoxWeight = 25; // kg
    const maxBoxVolume = 0.1; // m³
    
    let boxes: BoxAllocation[] = [];
    let currentBox: BoxAllocation = {
      boxNumber: 1,
      parts: [],
      totalWeight: 0,
      totalVolume: 0,
      dimensions: { length: 0, breadth: 0, height: 0 },
      autoCalculated: true
    };

    // Sort parts by size (largest first)
    const sortedParts = [...selectedParts].sort((a, b) => {
      const volumeA = a.part.length && a.part.breadth && a.part.height 
        ? a.part.length * a.part.breadth * a.part.height 
        : 1000;
      const volumeB = b.part.length && b.part.breadth && b.part.height 
        ? b.part.length * b.part.breadth * b.part.height 
        : 1000;
      return volumeB - volumeA;
    });

    sortedParts.forEach(selectedPart => {
      const partWeight = (selectedPart.part.weight || 0.5) * selectedPart.quantity;
      const partVolume = selectedPart.part.length && selectedPart.part.breadth && selectedPart.part.height 
        ? (selectedPart.part.length * selectedPart.part.breadth * selectedPart.part.height / 1000000) * selectedPart.quantity
        : 0.001 * selectedPart.quantity;

      if (currentBox.totalWeight + partWeight <= maxBoxWeight && 
          currentBox.totalVolume + partVolume <= maxBoxVolume) {
        currentBox.parts.push({ ...selectedPart, boxNumber: currentBox.boxNumber });
        currentBox.totalWeight += partWeight;
        currentBox.totalVolume += partVolume;
      } else {
        if (currentBox.parts.length > 0) {
          boxes.push(currentBox);
        }
        currentBox = {
          boxNumber: boxes.length + 1,
          parts: [{ ...selectedPart, boxNumber: boxes.length + 1 }],
          totalWeight: partWeight,
          totalVolume: partVolume,
          dimensions: { length: 0, breadth: 0, height: 0 },
          autoCalculated: true
        };
      }
    });

    if (currentBox.parts.length > 0) {
      boxes.push(currentBox);
    }

    // Auto-calculate box dimensions
    boxes = boxes.map(box => {
      let maxLength = 30, maxBreadth = 20, maxHeight = 15;
      
      box.parts.forEach(sp => {
        if (sp.part.length && sp.part.breadth && sp.part.height) {
          maxLength = Math.max(maxLength, sp.part.length);
          maxBreadth = Math.max(maxBreadth, sp.part.breadth);
          maxHeight = Math.max(maxHeight, sp.part.height * sp.quantity);
        }
      });

      maxLength += 5;
      maxBreadth += 5;
      maxHeight += 5;

      return {
        ...box,
        dimensions: {
          length: maxLength,
          breadth: maxBreadth,
          height: maxHeight
        }
      };
    });

    setBoxAllocations(boxes);
    
    toast({
      title: "AI Auto-Allocation Complete!",
      description: `${boxes.length} box${boxes.length > 1 ? 'es' : ''} optimized for distributor shipping`,
      variant: "default"
    });
  };

  // Step 4: Calculate Shipping Cost
  const calculateShippingCost = async () => {
    if (!selectedDistributor || boxAllocations.length === 0) return;

    setLoading(true);
    try {
      const totalWeight = boxAllocations.reduce((sum, box) => sum + box.totalWeight, 0);
      
      // Mock cost calculation for brand-to-distributor shipping
      const baseRate = 150; // Base rate for distributor shipping
      const weightCharges = totalWeight * 25; // ₹25 per kg
      const remoteAreaSurcharge = selectedDistributor.pincode.startsWith('1') ? 0 : 50; // Remote area check
      const platformMarkup = (baseRate + weightCharges) * 0.15; // 15% markup
      const subtotal = baseRate + weightCharges + remoteAreaSurcharge + platformMarkup;
      
      const cost: ShipmentCost = {
        baseRate,
        weightCharges,
        remoteAreaSurcharge,
        platformMarkup,
        subtotal,
        finalTotal: subtotal
      };
      
      setShippingCost(cost);
    } catch (error) {
      console.error('Error calculating cost:', error);
      toast({
        title: "Error calculating shipping cost",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create Shipment
  const createShipment = async () => {
    if (!selectedDistributor || !shippingCost) return;

    setLoading(true);
    try {
      const shipmentData = {
        brandId,
        distributorId: selectedDistributor.id,
        distributorName: selectedDistributor.name,
        distributorAddress: selectedDistributor.address,
        distributorPincode: selectedDistributor.pincode,
        distributorPhone: selectedDistributor.phone,
        distributorEmail: selectedDistributor.email,
        numBoxes: boxAllocations.length,
        estimatedWeight: boxAllocations.reduce((sum, box) => sum + box.totalWeight, 0),
        priority,
        notes,
        parts: selectedParts.map(sp => ({
          partId: sp.partId,
          quantity: sp.quantity,
          boxNumber: sp.boxNumber || 1
        })),
        boxes: boxAllocations.map(box => ({
          boxNumber: box.boxNumber,
          weight: box.totalWeight,
          dimensions: box.dimensions,
          parts: box.parts.map(p => ({
            partId: p.partId,
            quantity: p.quantity
          }))
        })),
        shippingCost: shippingCost.finalTotal,
        generateAWB: true,
        autoDeductWallet: true,
        shipmentType: 'BRAND_TO_DISTRIBUTOR'
      };

      // Create the shipment via API
      const response = await fetch('/api/brand/distributor-shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentData)
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Distributor Shipment Created Successfully!",
          description: `AWB: ${result.awbNumber || 'Will be generated shortly'}`,
          variant: "default"
        });
        
        // Reset form
        setCurrentStep(1);
        setSelectedDistributor(null);
        setSelectedParts([]);
        setBoxAllocations([]);
        setShippingCost(null);
        setNotes('');
        
        // Refresh wallet balance
        loadWalletBalance();
        
        if (onShipmentCreated) {
          onShipmentCreated(result);
        }
      } else {
        throw new Error(result.error || 'Failed to create shipment');
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Error creating shipment",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: return selectedDistributor !== null;
      case 2: return selectedParts.length > 0;
      case 3: return boxAllocations.length > 0;
      case 4: return shippingCost !== null;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep === 3 && boxAllocations.length === 0) {
      autoAllocateToBoxes();
    }
    if (currentStep === 3) {
      calculateShippingCost();
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const filteredParts = parts.filter(part => 
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" />
            Brand to Distributor Shipment
          </h2>
          <p className="text-muted-foreground">Send spare parts directly to your authorized distributors</p>
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
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
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
              );
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
            {currentStep === 1 && "Choose an authorized distributor to send parts to"}
            {currentStep === 2 && "Select parts and specify quantities for distributor shipment"}
            {currentStep === 3 && "AI will optimize box allocation for distributor delivery"}
            {currentStep === 4 && "Review all details and create your distributor shipment"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Distributor Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {distributors.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You have no authorized distributors. Please add distributors in your network settings first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {distributors.map((distributor) => (
                    <Card 
                      key={distributor.id} 
                      className={`cursor-pointer transition-all ${
                        selectedDistributor?.id === distributor.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleDistributorSelect(distributor.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Factory className="h-4 w-4 text-blue-600" />
                              {distributor.name}
                            </h3>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                {distributor.address}, {distributor.city}
                              </div>
                              <div className="flex items-center gap-2">
                                <Target className="h-3 w-3" />
                                Pincode: {distributor.pincode}
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                {distributor.phone}
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                {distributor.email}
                              </div>
                              {distributor.contactPerson && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  Contact: {distributor.contactPerson}
                                </div>
                              )}
                              {distributor.gstNumber && (
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3" />
                                  GST: {distributor.gstNumber}
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedDistributor?.id === distributor.id && (
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
                    <CardTitle className="text-base">Selected Parts for Distributor</CardTitle>
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
                            <p className="text-xs text-gray-500">Stock: {sp.part.stockQuantity}</p>
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
                            disabled={sp.quantity >= sp.part.stockQuantity}
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
                          <p className="text-xs text-gray-500">Stock: {part.stockQuantity}</p>
                          {part.weight && (
                            <p className="text-xs text-gray-500">Weight: {part.weight}kg</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addPartToSelection(part)}
                          className="w-full"
                          disabled={part.stockQuantity === 0}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {part.stockQuantity === 0 ? 'Out of Stock' : 'Add to Shipment'}
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Optimized Box Allocation for Distributor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Distributor Shipping:</strong> AI automatically optimizes packaging for bulk distributor shipments, 
                      considering weight limits and shipping efficiency for business-to-business delivery.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {boxAllocations.length === 0 ? (
                <div className="text-center py-8">
                  <Button onClick={autoAllocateToBoxes} size="lg">
                    <Brain className="w-5 h-5 mr-2" />
                    Auto-Allocate Parts to Boxes
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    AI will optimize packaging for distributor delivery
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Optimized Box Allocation</h3>
                    <Button onClick={autoAllocateToBoxes} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-optimize
                    </Button>
                  </div>

                  {boxAllocations.map((box) => (
                    <Card key={box.boxNumber} className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Box className="h-4 w-4" />
                          Box {box.boxNumber}
                          <Badge variant="outline" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            AI Optimized
                          </Badge>
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

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="mt-4">Calculating shipping costs...</p>
                </div>
              ) : shippingCost ? (
                <div className="space-y-4">
                  {/* Shipment Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distributor Shipment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-gray-500">Distributor</Label>
                          <p className="font-medium">{selectedDistributor?.name}</p>
                          <p className="text-gray-600">{selectedDistributor?.address}</p>
                          <p className="text-gray-600">{selectedDistributor?.city}, {selectedDistributor?.state} - {selectedDistributor?.pincode}</p>
                          <p className="text-gray-600">Contact: {selectedDistributor?.contactPerson}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Shipment Details</Label>
                          <p>{boxAllocations.length} box{boxAllocations.length !== 1 ? 'es' : ''}</p>
                          <p>{selectedParts.reduce((sum, sp) => sum + sp.quantity, 0)} parts</p>
                          <p>Priority: {priority}</p>
                          <p>Type: Business Delivery</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cost Breakdown */}
                  <Card className="border-2 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-green-600" />
                        Distributor Shipping Cost Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Base Rate (B2B):</span>
                            <span>₹{(shippingCost.baseRate || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Weight Charges:</span>
                            <span>₹{(shippingCost.weightCharges || 0).toFixed(2)}</span>
                          </div>
                          {(shippingCost.remoteAreaSurcharge || 0) > 0 && (
                            <div className="flex justify-between">
                              <span>Remote Area:</span>
                              <span>₹{(shippingCost.remoteAreaSurcharge || 0).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Platform Markup:</span>
                            <span>₹{(shippingCost.platformMarkup || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{(shippingCost.subtotal || 0).toFixed(2)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold text-green-600 text-base">
                            <span>Total Cost:</span>
                            <span>₹{(shippingCost.finalTotal || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center">
                        {(walletBalance || 0) >= (shippingCost.finalTotal || 0) ? (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Ready to Ship to Distributor!</strong> 
                              ₹{(shippingCost.finalTotal || 0).toFixed(2)} will be deducted from your wallet.
                              AWB will be generated for distributor tracking.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Insufficient Balance!</strong> 
                              You need ₹{((shippingCost.finalTotal || 0) - (walletBalance || 0)).toFixed(2)} more in your wallet.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Additional Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="priority">Shipping Priority</Label>
                        <Select value={priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => setPriority(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Standard (3-5 days)</SelectItem>
                            <SelectItem value="MEDIUM">Express (2-3 days)</SelectItem>
                            <SelectItem value="HIGH">Priority (1-2 days)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="notes">Special Instructions</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Special delivery instructions for distributor..."
                          rows={3}
                        />
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

            {currentStep < 4 ? (
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
                disabled={!shippingCost || (walletBalance || 0) < (shippingCost?.finalTotal || 0) || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Ship to Distributor
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}