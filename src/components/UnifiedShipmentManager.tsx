import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  Search,
  Plus, 
  Minus,
  Users,
  Building,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  Box,
  Calculator,
  Send,
  Eye,
  Download,
  RefreshCw,
  Filter,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Shield,
  Copy,
  Trash2,
  Edit3,
  Info,
  Wallet,
  Settings,
  Printer
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatWeight as formatWeightUtil, getCalculationWeight } from '@/lib/weight-formatter';
import ManualBoxAllocationManager from '@/components/ManualBoxAllocationManager';

// Types
interface Recipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'SERVICE_CENTER' | 'DISTRIBUTOR';
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

interface Part {
  id: string;
  name: string;
  code: string;
  price: number;
  weight: number;
  stock: number;
  msl: number;
  description?: string;
  // Additional fields from enhanced inventory
  stockQuantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  reorderQty?: number;
  costPrice?: number;
  sellingPrice?: number;
  partNumber?: string;
  brandModel?: string;
  category?: string;
  subCategory?: string;
  material?: string;
  compatibility?: string;
  status?: string;
}

interface SelectedPart {
  partId: string;
  part: Part;
  quantity: number;
}

interface BoxAllocation {
  id: string;
  parts: Array<{
    partId: string;
    quantity: number;
    part: Part;
  }>;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  weight: number;
  value: number;
  insurance?: {
    type: 'NONE' | 'CARRIER_RISK' | 'DECLARED_VALUE' | 'COMPREHENSIVE';
    declaredValue?: number;
    premium?: number;
  };
}

interface InsuranceOption {
  type: 'NONE' | 'CARRIER_RISK' | 'DECLARED_VALUE' | 'COMPREHENSIVE';
  name: string;
  description: string;
  coverage: string;
  premium: number; // Percentage of declared value
  minValue?: number;
  maxValue?: number;
}

interface ShipmentForm {
  recipientId: string;
  recipientType: 'SERVICE_CENTER' | 'DISTRIBUTOR';
  parts: SelectedPart[];
  boxes: BoxAllocation[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  currentBalance: number;
}

const UnifiedShipmentManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Insurance options configuration
  const insuranceOptions: InsuranceOption[] = [
    {
      type: 'NONE',
      name: 'No Insurance',
      description: 'Basic carrier liability only',
      coverage: 'Limited carrier liability (₹100 per kg)',
      premium: 0,
      maxValue: 5000
    },
    {
      type: 'CARRIER_RISK',
      name: 'Carrier Risk',
      description: 'Standard carrier insurance',
      coverage: 'Up to ₹25,000 coverage',
      premium: 0.5,
      minValue: 5000,
      maxValue: 25000
    },
    {
      type: 'DECLARED_VALUE',
      name: 'Declared Value',
      description: 'Insurance based on declared value',
      coverage: 'Full declared value coverage',
      premium: 1.0,
      minValue: 25000,
      maxValue: 100000
    },
    {
      type: 'COMPREHENSIVE',
      name: 'Comprehensive',
      description: 'Full comprehensive coverage',
      coverage: 'Complete protection including theft, damage, loss',
      premium: 2.0,
      minValue: 100000
    }
  ];

  // State management
  const [activeTab, setActiveTab] = useState<'SERVICE_CENTER' | 'DISTRIBUTOR'>('SERVICE_CENTER');
  const [currentStep, setCurrentStep] = useState(1); // Step navigation
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBoxAllocation, setShowBoxAllocation] = useState(false);

  // State for success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [shipmentResult, setShipmentResult] = useState<any>(null);

  // Wallet state
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [fetchingWallet, setFetchingWallet] = useState(false);
  const [fetchingCostEstimate, setFetchingCostEstimate] = useState(false);

  // Box allocation mode state
  const [boxAllocationMode, setBoxAllocationMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualBoxLabels, setManualBoxLabels] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState<ShipmentForm>({
    recipientId: '',
    recipientType: 'SERVICE_CENTER',
    parts: [],
    boxes: [],
    priority: 'MEDIUM',
    notes: ''
  });

  // Calculate derived values first
  const selectedRecipient = recipients.find(r => r.id === form.recipientId);
  const totalWeight = form.parts.reduce((sum, p) => sum + (getCalculationWeight(p.part.weight || 0) * p.quantity), 0);
  const totalValue = form.parts.reduce((sum, p) => sum + (p.part.price * p.quantity), 0);

  // Fetch recipients based on type
  const fetchRecipients = useCallback(async (type: 'SERVICE_CENTER' | 'DISTRIBUTOR', search = '') => {
    try {
      setLoading(true);
      const endpoint = type === 'SERVICE_CENTER' 
        ? '/api/brand/authorized-service-centers'
        : '/api/brand/authorized-distributors';
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '50');
      
      const response = await fetch(`${endpoint}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecipients(data.recipients || []);
      } else {
        throw new Error('Failed to fetch recipients');
      }
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast({
        title: "Error",
        description: `Failed to load ${type === 'SERVICE_CENTER' ? 'service centers' : 'distributors'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch parts
  const fetchParts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.id) {
        params.append('brandId', user.id);
      }
      params.append('limit', '100');
      
      const response = await fetch(`/api/parts?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both possible response structures
        const partsArray = data.parts || data.data || [];
        setParts(partsArray);
      } else {
        throw new Error('Failed to fetch parts');
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast({
        title: "Error",
        description: "Failed to load parts inventory",
        variant: "destructive"
      });
    }
  }, [user?.id, toast]);

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    try {
      setFetchingWallet(true);
      const response = await fetch('/api/brand/wallet');
      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
      } else {
        console.error('Failed to fetch wallet data');
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setFetchingWallet(false);
    }
  }, []);

  // Get cost estimate
  const getCostEstimate = useCallback(async () => {
    if (!form.recipientId || form.parts.length === 0 || !selectedRecipient) {
      setEstimatedCost(0);
      setFetchingCostEstimate(false);
      return;
    }

    try {
      setFetchingCostEstimate(true);
      const estimateData = {
        brandId: user?.id,
        shipments: [{
          recipientId: form.recipientId,
          recipientType: form.recipientType,
          recipientPincode: selectedRecipient.address.pincode,
          numBoxes: Math.max(form.boxes.length, 1),
          estimatedWeight: Math.max(totalWeight / 1000, 0.1), // Convert to kg, minimum 0.1kg
          priority: form.priority,
          insurance: {
            type: 'NONE',
            declaredValue: totalValue > 10000 ? totalValue : undefined
          }
        }]
      };

      console.log('Cost estimate request:', estimateData); // Debug log

      const response = await fetch('/api/shipments/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimateData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Cost estimate response:', result); // Debug log
        const estimate = result.estimates?.[0];
        // Use finalTotal instead of totalCost based on API response structure
        const estimatedPrice = estimate?.finalTotal || estimate?.totalCost || estimate?.subtotal || 0;
        setEstimatedCost(estimatedPrice);
      } else {
        console.error('Cost estimate API error:', response.status, await response.text());
        setEstimatedCost(0);
      }
    } catch (error) {
      console.error('Error getting cost estimate:', error);
      setEstimatedCost(0);
    } finally {
      setFetchingCostEstimate(false);
    }
  }, [form.recipientId, form.parts.length, form.recipientType, form.priority, form.boxes.length, selectedRecipient, totalWeight, totalValue, user?.id]);



  // Initialize data
  useEffect(() => {
    fetchRecipients(activeTab, searchTerm);
    fetchParts();
    fetchWalletData();
  }, [activeTab, fetchRecipients, fetchParts, fetchWalletData]);

  // Update cost estimate when form changes
  useEffect(() => {
    getCostEstimate();
  }, [getCostEstimate]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecipients(activeTab, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab, fetchRecipients]);

  // Handle tab change
  const handleTabChange = (tab: 'SERVICE_CENTER' | 'DISTRIBUTOR') => {
    setActiveTab(tab);
    setCurrentStep(1); // Reset to step 1
    setForm(prev => ({
      ...prev,
      recipientType: tab,
      recipientId: '',
      parts: [],
      boxes: []
    }));
    setSearchTerm('');
  };

  // Step navigation functions
  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step validation
  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2: return form.recipientId !== '';
      case 3: return form.parts.length > 0;
      case 4: return form.boxes.length > 0;
      default: return true;
    }
  };

  // Handle recipient selection
  const handleRecipientSelect = (recipientId: string) => {
    setForm(prev => ({
      ...prev,
      recipientId,
      recipientType: activeTab
    }));
  };

  // Handle part addition
  const handleAddPart = (part: Part, quantity: number) => {
    const availableStock = part.stockQuantity ?? part.stock ?? 0;
    
    if (quantity <= 0 || quantity > availableStock) {
      toast({
        title: "Invalid Quantity",
        description: `Please enter a valid quantity (1-${availableStock})`,
        variant: "destructive"
      });
      return;
    }

    setForm(prev => {
      const existingIndex = prev.parts.findIndex(p => p.partId === part.id);
      if (existingIndex >= 0) {
        // Update existing part
        const updatedParts = [...prev.parts];
        updatedParts[existingIndex].quantity = quantity;
        return { ...prev, parts: updatedParts };
      } else {
        // Add new part
        return {
          ...prev,
          parts: [...prev.parts, { partId: part.id, part, quantity }]
        };
      }
    });
  };

  // Handle part removal
  const handleRemovePart = (partId: string) => {
    setForm(prev => ({
      ...prev,
      parts: prev.parts.filter(p => p.partId !== partId)
    }));
  };

  // Get recommended insurance based on value
  const getRecommendedInsurance = (value: number) => {
    const option = insuranceOptions.find(opt => {
      if (opt.maxValue && value <= opt.maxValue && (!opt.minValue || value >= opt.minValue)) {
        return true;
      }
      if (!opt.maxValue && opt.minValue && value >= opt.minValue) {
        return true;
      }
      return false;
    }) || insuranceOptions[0];

    return {
      type: option.type,
      declaredValue: value,
      premium: (value * option.premium) / 100
    };
  };

  // Generate automatic box allocation
  const generateBoxAllocation = () => {
    if (form.parts.length === 0) {
      toast({
        title: "No Parts Selected",
        description: "Please select parts before generating box allocation",
        variant: "destructive"
      });
      return;
    }

    // Enhanced box allocation logic
    const boxes: BoxAllocation[] = [];
    let currentBox: BoxAllocation = {
      id: `box-${Date.now()}`,
      parts: [],
      dimensions: { length: 30, breadth: 20, height: 15 },
      weight: 0,
      value: 0
    };

    form.parts.forEach(selectedPart => {
      const partWeight = getCalculationWeight(selectedPart.part.weight || 0) * selectedPart.quantity;
      const partValue = selectedPart.part.price * selectedPart.quantity;

      // If adding this part would exceed weight limit, start new box
      if (currentBox.weight + partWeight > 10000) { // 10kg limit (10000g)
        // Set insurance for current box before pushing
        currentBox.insurance = getRecommendedInsurance(currentBox.value);
        boxes.push(currentBox);
        currentBox = {
          id: `box-${Date.now()}-${boxes.length}`,
          parts: [],
          dimensions: { length: 30, breadth: 20, height: 15 },
          weight: 0,
          value: 0
        };
      }

      currentBox.parts.push({
        partId: selectedPart.partId,
        quantity: selectedPart.quantity,
        part: selectedPart.part
      });
      currentBox.weight += partWeight;
      currentBox.value += partValue;
    });

    if (currentBox.parts.length > 0) {
      // Set insurance for the last box
      currentBox.insurance = getRecommendedInsurance(currentBox.value);
      boxes.push(currentBox);
    }

    setForm(prev => ({ ...prev, boxes }));
    setShowBoxAllocation(true);
  };

  // Add new box
  const addNewBox = () => {
    const newBox: BoxAllocation = {
      id: `box-${Date.now()}-${form.boxes.length}`,
      parts: [],
      dimensions: { length: 30, breadth: 20, height: 15 },
      weight: 0,
      value: 0,
      insurance: getRecommendedInsurance(0)
    };

    setForm(prev => ({ ...prev, boxes: [...prev.boxes, newBox] }));
  };

  // Remove box
  const removeBox = (boxId: string) => {
    if (form.boxes.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one box is required",
        variant: "destructive"
      });
      return;
    }

    setForm(prev => ({
      ...prev,
      boxes: prev.boxes.filter(box => box.id !== boxId)
    }));
  };

  // Duplicate box
  const duplicateBox = (boxId: string) => {
    const boxToDuplicate = form.boxes.find(box => box.id === boxId);
    if (!boxToDuplicate) return;

    const duplicatedBox: BoxAllocation = {
      ...boxToDuplicate,
      id: `box-${Date.now()}-duplicate`,
      parts: [...boxToDuplicate.parts]
    };

    setForm(prev => ({ ...prev, boxes: [...prev.boxes, duplicatedBox] }));
  };

  // Handle box dimension update
  const updateBoxDimensions = (boxId: string, dimensions: { length: number; breadth: number; height: number }) => {
    setForm(prev => ({
      ...prev,
      boxes: prev.boxes.map(box => 
        box.id === boxId ? { ...box, dimensions } : box
      )
    }));
  };

  // Submit shipment
  const handleSubmit = async () => {
    if (!form.recipientId) {
      toast({
        title: "Recipient Required",
        description: "Please select a recipient",
        variant: "destructive"
      });
      return;
    }

    if (form.parts.length === 0) {
      toast({
        title: "Parts Required",
        description: "Please select at least one part",
        variant: "destructive"
      });
      return;
    }

    if (form.boxes.length === 0) {
      generateBoxAllocation();
      return;
    }

    try {
      setSubmitting(true);

      // Get cost estimate first to show accurate pricing
      const estimateData = {
        brandId: user?.id,
        shipments: [{
          recipientId: form.recipientId,
          recipientType: form.recipientType,
          recipientPincode: selectedRecipient?.address?.pincode || '400001',
          numBoxes: form.boxes.length,
          estimatedWeight: totalWeight / 1000, // Convert to kg
          priority: form.priority,
          insurance: {
            type: 'NONE',
            declaredValue: totalValue > 10000 ? totalValue : undefined
          }
        }]
      };

      const estimateResponse = await fetch('/api/shipments/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimateData)
      });

      let costEstimate = null;
      if (estimateResponse.ok) {
        const estimateResult = await estimateResponse.json();
        costEstimate = estimateResult.estimates?.[0];
      }

      const shipmentData = {
        recipientId: form.recipientId,
        recipientType: form.recipientType,
        parts: form.parts.map(p => ({
          partId: p.partId,
          quantity: p.quantity
        })),
        boxes: form.boxes.map(box => ({
          parts: box.parts.map(p => ({
            partId: p.partId,
            quantity: p.quantity
          })),
          dimensions: box.dimensions
        })),
        priority: form.priority,
        notes: form.notes,
        // Include cost estimate data for proper pricing
        estimatedWeight: totalWeight / 1000,
        serviceCenterPincode: selectedRecipient?.address?.pincode,
        numBoxes: form.boxes.length,
        // Add insurance for high-value shipments
        insurance: {
          type: totalValue > 10000 ? 'CARRIER_RISK' : 'NONE',
          declaredValue: totalValue > 10000 ? totalValue : undefined
        }
      };

      const response = await fetch('/api/shipments/create-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store result for success dialog
        setShipmentResult({
          ...result,
          costEstimate,
          recipientName: selectedRecipient?.name,
          recipientType: form.recipientType,
          totalValue,
          totalWeight: totalWeight / 1000,
          boxCount: form.boxes.length
        });

        // Reset form
        setForm({
          recipientId: '',
          recipientType: activeTab,
          parts: [],
          boxes: [],
          priority: 'MEDIUM',
          notes: ''
        });
        setCurrentStep(1);
        setShowBoxAllocation(false);

        // Show success dialog
        setShowSuccessDialog(true);

        // Send real-time notification via WebSocket
        if (typeof window !== 'undefined' && (window as any).socket) {
          (window as any).socket.emit('shipment_created', {
            recipientId: form.recipientId,
            recipientType: form.recipientType,
            shipmentId: result.shipmentId || result.shipment?.id,
            awbNumber: result.awbNumber
          });
        }

      } else {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to create shipment');
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Shipment Creation Failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle navigation to shipments view
  const handleViewShipments = () => {
    setShowSuccessDialog(false);
    // Navigate to shipments tab in the parent dashboard
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('navigateToShipments', { 
        detail: { tab: 'shipment-dashboard' } 
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Shipment Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your shipment has been created and is being processed.
            </DialogDescription>
          </DialogHeader>
          
          {shipmentResult && (
            <div className="space-y-4">
              {/* Shipment Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Shipment Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Recipient:</span>
                    <p className="font-medium">{shipmentResult.recipientName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <p className="font-medium">
                      {shipmentResult.recipientType === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">AWB Number:</span>
                    <p className="font-mono font-medium">
                      {shipmentResult.awbNumber || shipmentResult.trackingNumber || 'Generating...'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Boxes:</span>
                    <p className="font-medium">{shipmentResult.boxCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Weight:</span>
                    <p className="font-medium">{shipmentResult.totalWeight?.toFixed(2)} kg</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Value:</span>
                    <p className="font-medium">₹{shipmentResult.totalValue?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleViewShipments} className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  View Shipments
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSuccessDialog(false)}
                  className="flex-1"
                >
                  Create Another Shipment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Unified Shipment Manager
          </CardTitle>
          <CardDescription>
            Create shipments to service centers and distributors with step-by-step guidance
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Recipient Type Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'SERVICE_CENTER' | 'DISTRIBUTOR')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="SERVICE_CENTER" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Service Centers
          </TabsTrigger>
          <TabsTrigger value="DISTRIBUTOR" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Distributors
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Step Progress Indicator */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep === step 
                          ? 'bg-blue-600 text-white' 
                          : currentStep > step 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                      </div>
                      {step < 4 && (
                        <div className={`w-12 h-0.5 mx-2 ${
                          currentStep > step ? 'bg-green-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  Step {currentStep} of 4
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>Select Recipient</span>
                <span>Choose Parts</span>
                <span>Box Allocation</span>
                <span>Review & Submit</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Search and Recipient Selection */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Step 1: Search & Select {activeTab === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={`Search ${activeTab === 'SERVICE_CENTER' ? 'service centers' : 'distributors'} by name, email, phone, or location...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Recipients List */}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading {activeTab === 'SERVICE_CENTER' ? 'service centers' : 'distributors'}...</span>
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No {activeTab === 'SERVICE_CENTER' ? 'service centers' : 'distributors'} found</p>
                    {searchTerm && (
                      <p className="text-sm">Try adjusting your search terms</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {recipients.map((recipient) => (
                      <motion.div
                        key={recipient.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          form.recipientId === recipient.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleRecipientSelect(recipient.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{recipient.name}</h4>
                          <Badge variant={recipient.type === 'SERVICE_CENTER' ? 'default' : 'secondary'}>
                            {recipient.type === 'SERVICE_CENTER' ? 'SC' : 'DIST'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{recipient.email}</span>
                          </div>
                          {recipient.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{recipient.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {recipient.address.city}, {recipient.address.state} - {recipient.address.pincode}
                            </span>
                          </div>
                        </div>
                        
                        {form.recipientId === recipient.id && (
                          <div className="mt-2 flex items-center gap-1 text-blue-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Selected</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Next Button for Step 1 */}
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={goToNextStep}
                    disabled={!canProceedToStep(2)}
                    className="min-w-32"
                  >
                    Next: Select Parts
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Parts Selection */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Step 2: Select Parts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Recipient Info */}
                {selectedRecipient && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Selected: {selectedRecipient.name}</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {selectedRecipient.address.city}, {selectedRecipient.address.state} - {selectedRecipient.address.pincode}
                    </p>
                  </div>
                )}

                {/* Parts Table */}
                {parts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No parts available in inventory</p>
                    <p className="text-sm">Please add parts to your inventory first</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parts.map((part) => {
                          const selectedPart = form.parts.find(p => p.partId === part.id);
                          // Use stockQuantity if available, fallback to stock, then 0
                          const availableStock = part.stockQuantity ?? part.stock ?? 0;
                          const minStockLevel = part.minStockLevel ?? part.msl ?? 5;
                          
                          return (
                            <TableRow key={part.id}>
                              <TableCell className="font-mono text-sm">{part.code}</TableCell>
                              <TableCell>{part.name}</TableCell>
                              <TableCell>
                                <Badge variant={availableStock > minStockLevel ? 'default' : 'destructive'}>
                                  {availableStock}
                                </Badge>
                              </TableCell>
                              <TableCell>₹{part.price.toFixed(2)}</TableCell>
                              <TableCell>
                                {formatWeightUtil(part.weight || 0)}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max={availableStock}
                                  value={selectedPart?.quantity || ''}
                                  onChange={(e) => {
                                    const quantity = parseInt(e.target.value) || 0;
                                    if (quantity > 0) {
                                      handleAddPart({
                                        ...part,
                                        stock: availableStock
                                      }, quantity);
                                    } else {
                                      handleRemovePart(part.id);
                                    }
                                  }}
                                  className="w-20"
                                  placeholder="0"
                                  disabled={availableStock === 0}
                                />
                              </TableCell>
                              <TableCell>
                                {selectedPart ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRemovePart(part.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddPart({
                                      ...part,
                                      stock: availableStock
                                    }, 1)}
                                    disabled={availableStock === 0}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Selected Parts Summary */}
                {form.parts.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Selected Parts Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label className="text-sm">Total Parts</Label>
                        <p className="font-semibold">{form.parts.length} types</p>
                      </div>
                      <div>
                        <Label className="text-sm">Total Weight</Label>
                        <p className="font-semibold">{formatWeightUtil(totalWeight)}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Total Value</Label>
                        <p className="font-semibold">₹{totalValue.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {form.parts.map((selectedPart) => (
                        <div key={selectedPart.partId} className="flex items-center justify-between text-sm">
                          <span>{selectedPart.part.code} - {selectedPart.part.name}</span>
                          <span className="font-medium">
                            {selectedPart.quantity} × ₹{selectedPart.part.price} = ₹{(selectedPart.quantity * selectedPart.part.price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep}
                    disabled={!canProceedToStep(3)}
                  >
                    Next: Box Allocation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Box Allocation */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Step 3: Box Allocation & Insurance
                </CardTitle>
                <CardDescription>
                  Configure how parts will be packed into boxes and select insurance coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Box Allocation Mode Selection */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Box Allocation Method</h4>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={boxAllocationMode === 'AUTO' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBoxAllocationMode('AUTO')}
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Auto Allocation
                      </Button>
                      <Button
                        variant={boxAllocationMode === 'MANUAL' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBoxAllocationMode('MANUAL')}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manual Allocation
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {boxAllocationMode === 'AUTO' ? (
                      <p>Automatically distribute parts across boxes based on weight and value optimization.</p>
                    ) : (
                      <p>Manually assign parts to specific boxes with full control over allocation and labeling.</p>
                    )}
                  </div>
                </div>

                {/* Auto Allocation Mode */}
                {boxAllocationMode === 'AUTO' && (
                  <>
                    {form.boxes.length === 0 ? (
                      <div className="text-center py-8">
                        <Box className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 mb-4">No box allocation configured</p>
                        <Button onClick={generateBoxAllocation}>
                          <Calculator className="h-4 w-4 mr-2" />
                          Generate Auto Box Allocation
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Box Management Actions */}
                        <div className="flex gap-2 mb-4">
                          <Button 
                            variant="outline" 
                            onClick={addNewBox}
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Box
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={generateBoxAllocation}
                            size="sm"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </Button>
                        </div>

                        {form.boxes.map((box, index) => (
                          <div key={box.id} className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">Box {index + 1}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {(box.weight / 1000).toFixed(2)}kg | ₹{box.value.toFixed(2)}
                                </Badge>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => duplicateBox(box.id)}
                                    title="Duplicate Box"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeBox(box.id)}
                                    title="Remove Box"
                                    disabled={form.boxes.length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Box Dimensions */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm">Length (cm)</Label>
                                <Input
                                  type="number"
                                  value={box.dimensions.length}
                                  onChange={(e) => updateBoxDimensions(box.id, {
                                    ...box.dimensions,
                                    length: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Breadth (cm)</Label>
                                <Input
                                  type="number"
                                  value={box.dimensions.breadth}
                                  onChange={(e) => updateBoxDimensions(box.id, {
                                    ...box.dimensions,
                                    breadth: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Height (cm)</Label>
                                <Input
                                  type="number"
                                  value={box.dimensions.height}
                                  onChange={(e) => updateBoxDimensions(box.id, {
                                    ...box.dimensions,
                                    height: parseFloat(e.target.value) || 0
                                  })}
                                />
                              </div>
                            </div>
                            
                            {/* Insurance Selection */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-3">
                                <Shield className="h-4 w-4 text-blue-600" />
                                <Label className="text-sm font-medium">Insurance Coverage</Label>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {insuranceOptions.map((option) => {
                                  const isRecommended = box.insurance?.type === option.type;
                                  const isAvailable = (!option.minValue || box.value >= option.minValue) && 
                                                    (!option.maxValue || box.value <= option.maxValue);
                                  
                                  return (
                                    <div
                                      key={option.type}
                                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                        isRecommended
                                          ? 'border-blue-500 bg-blue-50'
                                          : isAvailable
                                            ? 'border-gray-200 hover:border-gray-300'
                                            : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                      }`}
                                      onClick={() => {
                                        if (isAvailable) {
                                          setForm(prev => ({
                                            ...prev,
                                            boxes: prev.boxes.map(b => 
                                              b.id === box.id 
                                                ? { 
                                                    ...b, 
                                                    insurance: {
                                                      type: option.type,
                                                      declaredValue: box.value,
                                                      premium: (box.value * option.premium) / 100
                                                    }
                                                  }
                                                : b
                                            )
                                          }));
                                        }
                                      }}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <h5 className="font-medium text-sm">{option.name}</h5>
                                        {isRecommended && (
                                          <Badge variant="default" className="text-xs">
                                            Selected
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600 mb-2">{option.description}</p>
                                      <p className="text-xs text-gray-500">{option.coverage}</p>
                                      {option.premium > 0 && (
                                        <p className="text-xs font-medium text-blue-600 mt-1">
                                          Premium: ₹{((box.value * option.premium) / 100).toFixed(2)} ({option.premium}%)
                                        </p>
                                      )}
                                      {!isAvailable && (
                                        <p className="text-xs text-red-500 mt-1">
                                          {option.minValue && box.value < option.minValue 
                                            ? `Minimum value: ₹${option.minValue}`
                                            : `Maximum value: ₹${option.maxValue}`
                                          }
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Box Contents */}
                            <div>
                              <Label className="text-sm font-medium">Contents</Label>
                              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                                {box.parts.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">No parts allocated to this box</p>
                                ) : (
                                  box.parts.map((part) => {
                                    const partWeight = getCalculationWeight(part.part.weight || 0) * part.quantity;
                                    const partValue = part.part.price * part.quantity;
                                    return (
                                      <div key={part.partId} className="bg-gray-50 rounded px-3 py-2">
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="font-medium">{part.part.code} - {part.part.name}</span>
                                          <span className="text-gray-600">Qty: {part.quantity}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-1 text-xs text-gray-600">
                                          <div>
                                            <span className="text-gray-500">Weight:</span>
                                            <p className="font-medium">{formatWeightUtil(partWeight)}</p>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Value:</span>
                                            <p className="font-medium">₹{partValue.toFixed(2)}</p>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Volume:</span>
                                            <p className="font-medium">
                                              {(box.dimensions.length * box.dimensions.breadth * box.dimensions.height / 1000).toFixed(2)} L
                                            </p>
                                          </div>
                                        </div>
                                        <div className="mt-1 text-xs text-gray-600">
                                          <span className="text-gray-500">Insurance:</span>
                                          <span className="font-medium ml-1">
                                            {box.insurance?.premium ? `₹${box.insurance.premium.toFixed(2)}` : 'None'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* Box Summary */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Weight:</span>
                                  <p className="font-medium">
                                    {formatWeightUtil(box.parts.reduce((sum, part) => sum + (getCalculationWeight(part.part.weight || 0) * part.quantity), 0))}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Value:</span>
                                  <p className="font-medium">
                                    ₹{box.parts.reduce((sum, part) => sum + (part.part.price * part.quantity), 0).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Volume:</span>
                                  <p className="font-medium">
                                    {(box.dimensions.length * box.dimensions.breadth * box.dimensions.height / 1000).toFixed(2)} L
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Insurance:</span>
                                  <p className="font-medium">
                                    {box.insurance?.premium ? `₹${box.insurance.premium.toFixed(2)}` : 'None'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Total Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold mb-3">Shipment Summary</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Total Boxes:</span>
                              <p className="font-semibold">{form.boxes.length}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Total Weight:</span>
                              <p className="font-semibold">
                                {formatWeightUtil(form.boxes.reduce((sum, box) => 
                                  sum + box.parts.reduce((boxSum, part) => 
                                    boxSum + (getCalculationWeight(part.part.weight || 0) * part.quantity), 0
                                  ), 0
                                ))}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Total Value:</span>
                              <p className="font-semibold">
                                ₹{form.boxes.reduce((sum, box) => 
                                  sum + box.parts.reduce((boxSum, part) => 
                                    boxSum + (part.part.price * part.quantity), 0
                                  ), 0
                                ).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Total Insurance:</span>
                              <p className="font-semibold">
                                ₹{form.boxes.reduce((sum, box) => sum + (box.insurance?.premium || 0), 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Manual Allocation Mode */}
                {boxAllocationMode === 'MANUAL' && (
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Manual allocation mode provides complete control over how parts are distributed across boxes, 
                        including custom labeling and detailed box management.
                      </AlertDescription>
                    </Alert>

                    <ManualBoxAllocationManager
                      selectedParts={form.parts}
                      recipientName={selectedRecipient?.name || 'Unknown Recipient'}
                      recipientAddress={selectedRecipient ? 
                        `${selectedRecipient.address.street}, ${selectedRecipient.address.city}, ${selectedRecipient.address.state} - ${selectedRecipient.address.pincode}` 
                        : 'Unknown Address'
                      }
                      onBoxAllocationsChange={(allocations) => {
                        // Convert manual allocations to our box format
                        const convertedBoxes: BoxAllocation[] = allocations.map((allocation, index) => ({
                          id: `manual-box-${allocation.boxNumber}`,
                          parts: allocation.parts.map(part => ({
                            partId: part.partId,
                            quantity: part.quantity,
                            part: part.part
                          })),
                          dimensions: allocation.dimensions,
                          weight: allocation.totalWeight,
                          value: allocation.parts.reduce((sum, part) => sum + (part.part.price * part.quantity), 0),
                          insurance: getRecommendedInsurance(allocation.parts.reduce((sum, part) => sum + (part.part.price * part.quantity), 0))
                        }));
                        
                        setForm(prev => ({ ...prev, boxes: convertedBoxes }));
                      }}
                      onLabelsGenerated={(labels) => {
                        setManualBoxLabels(labels);
                        toast({
                          title: "Box Labels Generated",
                          description: `${labels.length} printable box labels are ready`,
                          variant: "default"
                        });
                      }}
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep}
                    disabled={!canProceedToStep(4)}
                  >
                    Next: Review & Submit
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Step 4: Review & Submit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Shipment Summary */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Shipment Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">Recipient</Label>
                      <p className="font-medium">{selectedRecipient?.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Type</Label>
                      <p className="font-medium">
                        {activeTab === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total Parts</Label>
                      <p className="font-medium">{form.parts.length} types</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total Boxes</Label>
                      <p className="font-medium">{form.boxes.length}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total Weight</Label>
                      <p className="font-medium">{formatWeightUtil(totalWeight)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total Value</Label>
                      <p className="font-medium">₹{totalValue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Cost Estimation & Wallet Balance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cost Estimation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-800">Estimated Cost</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping Cost:</span>
                        <span className="font-medium flex items-center gap-1">
                          {fetchingCostEstimate ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Calculating...
                            </>
                          ) : estimatedCost > 0 ? (
                            `₹${estimatedCost.toFixed(2)}`
                          ) : (
                            'Calculating...'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Insurance:</span>
                        <span className="font-medium">
                          ₹{form.boxes.reduce((sum, box) => sum + (box.insurance?.premium || 0), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total Estimated:</span>
                        <span className="text-blue-600">
                          ₹{(estimatedCost + form.boxes.reduce((sum, box) => sum + (box.insurance?.premium || 0), 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Balance */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-green-800">Wallet Balance</h4>
                      {fetchingWallet && <Loader2 className="h-3 w-3 animate-spin" />}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Balance:</span>
                        <span className="font-medium">
                          {walletData ? `₹${(walletData.currentBalance || walletData.balance || 0).toFixed(2)}` : 'Loading...'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">After Shipment:</span>
                        <span className={`font-medium ${
                          walletData && (walletData.currentBalance || walletData.balance || 0) >= (estimatedCost + form.boxes.reduce((sum, box) => sum + (box.insurance?.premium || 0), 0))
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {walletData 
                            ? `₹${((walletData.currentBalance || walletData.balance || 0) - (estimatedCost + form.boxes.reduce((sum, box) => sum + (box.insurance?.premium || 0), 0))).toFixed(2)}`
                            : 'Calculating...'
                          }
                        </span>
                      </div>
                      {walletData && (walletData.currentBalance || walletData.balance || 0) < (estimatedCost + form.boxes.reduce((sum, box) => sum + (box.insurance?.premium || 0), 0)) && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Insufficient wallet balance. Please recharge your wallet before creating this shipment.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipment Details Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={form.priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => 
                      setForm(prev => ({ ...prev, priority: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low Priority</SelectItem>
                        <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                        <SelectItem value="HIGH">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special instructions or notes for this shipment..."
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="min-w-32"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Create Shipment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedShipmentManager;