import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  Video, 
  CheckCircle, 
  Plus, 
  Upload, 
  ArrowRight, 
  ArrowLeft,
  Box,
  ShoppingCart,
  Save,
  Check,
  AlertCircle,
  Eye,
  FileText,
  Download,
  Loader2,
  QrCode,
  MapPin,
  RotateCcw,
  Clock,
  XCircle,
  Brain,
  BarChart3,
  Zap,
  Bell,
  AlertTriangle,
  TrendingUp,
  Search,
  Wallet,
  DollarSign,
  Activity,
  Users,
  Settings,
  RefreshCw,
  Send,
  CreditCard,
  History,
  TrendingDown,
  Printer,
  ExternalLink,
  Calendar,
  Target,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Info,
  Shield,
  Lock
} from 'lucide-react';
import { TrackingDashboard } from '@/components/TrackingDashboard';
import { RestockAlertsManager } from '@/components/RestockAlertsManager';
import BulkShipmentManagerSecure from '@/components/BulkShipmentManagerSecure';
import EnhancedPartCatalog from '@/components/EnhancedPartCatalog';
import SimplePartCatalog from '@/components/SimplePartCatalog';
import BrandWalletManager from '@/components/BrandWalletManager';
import { NotificationCenter } from '@/components/NotificationCenter';
import AuthorizedNetworkManager from '@/components/AuthorizedNetworkManager';
import EnhancedBrandOverview from '@/components/EnhancedBrandOverview';
import { useToast } from '@/components/ui/use-toast';

// Interfaces
interface DashboardStats {
  walletBalance: number;
  totalShipments: number;
  pendingShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  totalParts: number;
  lowStockParts: number;
  totalRevenue: number;
  monthlyGrowth: number;
  totalReturns: number;
  pendingReturns: number;
}

interface MSLAlert {
  id: string;
  partName: string;
  partCode: string;
  currentStock: number;
  msl: number;
  serviceCenterName: string;
  urgency: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface RecentActivity {
  id: string;
  type: 'shipment' | 'return' | 'wallet' | 'part' | 'order';
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  amount?: number;
}

interface ServiceCenter {
  id: string;
  name: string;
  address: string;
  pincode: string;
  phone: string;
  email: string;
}

interface Part {
  id: string;
  name: string;
  code: string;
  price: number;
  weight: number;
  msl: number;
  description?: string;
  diyVideoUrl?: string;
}

interface ShipmentForm {
  serviceCenterId: string;
  parts: Array<{ partId: string; quantity: number }>;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  numBoxes: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
}

interface ReturnRequest {
  id: string;
  serviceCenterName: string;
  partName: string;
  partCode: string;
  reason: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'picked' | 'received';
  createdAt: string;
  awbNumber?: string;
  estimatedValue: number;
}

// Enhanced Shipment Booking Component with Security Features
const ShipmentBookingModule: React.FC = () => {
  const [step, setStep] = useState(1);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [form, setForm] = useState<ShipmentForm>({
    serviceCenterId: '',
    parts: [],
    dimensions: { length: 0, breadth: 0, height: 0 },
    numBoxes: 1,
    priority: 'MEDIUM',
    notes: ''
  });
  const [courierPrice, setCourierPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchServiceCenters();
    fetchParts();
  }, []);

  const fetchServiceCenters = async () => {
    try {
      const response = await fetch('/api/brand/authorized-service-centers');
      if (response.ok) {
        const data = await response.json();
        setServiceCenters(data.serviceCenters || []);
      }
    } catch (error) {
      console.error('Error fetching authorized service centers:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/parts');
      if (response.ok) {
        const data = await response.json();
        setParts(data.parts || []);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const calculateCourierPrice = async () => {
    try {
      const response = await fetch('/api/dtdc/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCenterId: form.serviceCenterId,
          dimensions: form.dimensions,
          numBoxes: form.numBoxes,
          priority: form.priority
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourierPrice(data.totalCost || 0);
        setEstimatedDelivery(data.estimatedDelivery || '2-3 business days');
      }
    } catch (error) {
      console.error('Error calculating courier price:', error);
    }
  };

  const createShipment = async () => {
    try {
      setLoading(true);
      
      // Enhanced validation before submission
      if (!serviceCenters.some(sc => sc.id === form.serviceCenterId)) {
        toast({
          title: "Security Error",
          description: "Selected service center is not authorized. Only pre-approved service centers are allowed.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          generateAWB: true,
          autoDeductWallet: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Shipment Created Successfully!",
          description: `Shipment ID: ${data.shipmentId}. AWB will be generated shortly.`
        });
        
        // Reset form
        setStep(1);
        setForm({
          serviceCenterId: '',
          parts: [],
          dimensions: { length: 0, breadth: 0, height: 0 },
          numBoxes: 1,
          priority: 'MEDIUM',
          notes: ''
        });
        setCourierPrice(0);
      } else {
        const error = await response.json();
        toast({
          title: "Shipment Creation Failed",
          description: error.message || 'Please try again',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Error",
        description: 'Network error. Please check your connection.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPartToShipment = () => {
    setForm(prev => ({
      ...prev,
      parts: [...prev.parts, { partId: '', quantity: 1 }]
    }));
  };

  const removePartFromShipment = (index: number) => {
    setForm(prev => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index)
    }));
  };

  // Enhanced updatePart with validation
  const updatePart = (index: number, field: 'partId' | 'quantity', value: string | number) => {
    // Validate part selection against authorized parts
    if (field === 'partId' && value) {
      const isValidPart = parts.some(p => p.id === value);
      if (!isValidPart) {
        toast({
          title: "Invalid Part Selection",
          description: "Selected part is not available in your catalog. Only authorized parts can be selected.",
          variant: "destructive"
        });
        return;
      }
    }

    setForm(prev => ({
      ...prev,
      parts: prev.parts.map((part, i) => 
        i === index ? { ...part, [field]: value } : part
      )
    }));
  };

  // Enhanced form update with validation
  const updateForm = (field: keyof ShipmentForm, value: any) => {
    // Validate service center selection
    if (field === 'serviceCenterId' && value) {
      const isAuthorized = serviceCenters.some(sc => sc.id === value);
      if (!isAuthorized) {
        toast({
          title: "Unauthorized Service Center",
          description: "Selected service center is not in your authorized list. Only pre-approved service centers can be selected.",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate priority selection
    if (field === 'priority' && value && !['LOW', 'MEDIUM', 'HIGH'].includes(value)) {
      toast({
        title: "Invalid Priority",
        description: "Only LOW, MEDIUM, or HIGH priority levels are allowed.",
        variant: "destructive"
      });
      return;
    }

    setForm(prev => ({ ...prev, [field]: value }));
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return form.serviceCenterId && form.numBoxes > 0;
      case 2:
        return form.parts.length > 0 && form.parts.every(p => p.partId && p.quantity > 0);
      case 3:
        return form.dimensions.length > 0 && form.dimensions.breadth > 0 && form.dimensions.height > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const selectedServiceCenter = serviceCenters.find(sc => sc.id === form.serviceCenterId);
  const totalWeight = form.parts.reduce((sum, part) => {
    const partData = parts.find(p => p.id === part.partId);
    return sum + (partData?.weight || 0) * part.quantity;
  }, 0);

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-600" />
          <Send className="h-5 w-5" />
          <span>Create New Shipment (Secure)</span>
        </CardTitle>
        <CardDescription>
          Step-by-step shipment booking with enhanced security validation. Only authorized recipients allowed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Notice */}
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Active:</strong> Manual entry override protection is enabled. 
            Only authorized service centers and parts can be selected.
          </AlertDescription>
        </Alert>

        {/* Progress Indicator */}
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4, 5].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step >= stepNum ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > stepNum ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              {stepNum < 5 && (
                <div className={`w-12 h-1 transition-all ${step > stepNum ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Select Authorized Service Center & Boxes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-green-600" />
                    Authorized Service Center
                  </Label>
                  {serviceCenters.length === 0 ? (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800 font-medium">
                          You have no authorized Service Centers. Please add one first.
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Go to the "Network" tab to manage your authorized partners.
                      </p>
                    </div>
                  ) : (
                    <Select value={form.serviceCenterId} onValueChange={(value) => updateForm('serviceCenterId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose authorized service center" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCenters.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-green-600" />
                              <div className="flex flex-col">
                                <span className="font-medium">{center.name}</span>
                                <span className="text-sm text-gray-500">{center.pincode} - {center.address}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Number of Boxes</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={form.numBoxes}
                    onChange={(e) => updateForm('numBoxes', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => updateForm('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low Priority</SelectItem>
                    <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                    <SelectItem value="HIGH">High Priority (Express)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedServiceCenter && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Authorized Service Center Details
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Address:</strong> {selectedServiceCenter.address}</p>
                    <p><strong>Pincode:</strong> {selectedServiceCenter.pincode}</p>
                    <p><strong>Contact:</strong> {selectedServiceCenter.phone}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Select Authorized Spare Parts
                </h3>
                <Button onClick={addPartToShipment} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part
                </Button>
              </div>
              
              <div className="space-y-3">
                {form.parts.map((part, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                    <Select
                      value={part.partId}
                      onValueChange={(value) => updatePart(index, 'partId', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select authorized part" />
                      </SelectTrigger>
                      <SelectContent>
                        {parts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-green-600" />
                              <div className="flex flex-col">
                                <span className="font-medium">{p.name}</span>
                                <span className="text-sm text-gray-500">{p.code} - ₹{p.price} - {p.weight}kg</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={part.quantity}
                      onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      className="w-20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePartFromShipment(index)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {form.parts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No parts selected. Click "Add Part" to get started.</p>
                </div>
              )}

              {totalWeight > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700">
                    <strong>Total Weight:</strong> {totalWeight.toFixed(2)} kg
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Package Dimensions</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Length (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.dimensions.length}
                    onChange={(e) => updateForm('dimensions', {
                      ...form.dimensions, 
                      length: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label>Breadth (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.dimensions.breadth}
                    onChange={(e) => updateForm('dimensions', {
                      ...form.dimensions, 
                      breadth: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.dimensions.height}
                    onChange={(e) => updateForm('dimensions', {
                      ...form.dimensions, 
                      height: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div>
                <Label>Special Instructions (Optional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  placeholder="Any special handling instructions..."
                  rows={3}
                />
              </div>

              {form.dimensions.length > 0 && form.dimensions.breadth > 0 && form.dimensions.height > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Package Information</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Dimensions:</strong> {form.dimensions.length} × {form.dimensions.breadth} × {form.dimensions.height} cm</p>
                    <p><strong>Volume:</strong> {((form.dimensions.length * form.dimensions.breadth * form.dimensions.height) / 1000000).toFixed(3)} m³</p>
                    <p><strong>Total Weight:</strong> {totalWeight.toFixed(2)} kg</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Review & Get Pricing</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Authorized Service Center</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Shield className="h-3 w-3 text-green-600" />
                      {selectedServiceCenter?.name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedServiceCenter?.pincode}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Priority</Label>
                    <Badge variant={form.priority === 'HIGH' ? 'destructive' : form.priority === 'MEDIUM' ? 'default' : 'secondary'}>
                      {form.priority}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Authorized Parts ({form.parts.length})</Label>
                  <div className="space-y-1">
                    {form.parts.map((part, index) => {
                      const partData = parts.find(p => p.id === part.partId);
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-green-600" />
                            {partData?.name} ({partData?.code})
                          </span>
                          <span>{part.quantity} × ₹{partData?.price} = ₹{(part.quantity * (partData?.price || 0)).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <Button
                    onClick={calculateCourierPrice}
                    variant="outline"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Calculate Shipping Cost
                  </Button>
                  
                  {courierPrice > 0 && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">₹{courierPrice.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Estimated delivery: {estimatedDelivery}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Confirm & Create Secure Shipment</h3>
              <div className="text-center space-y-4">
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Shield className="h-8 w-8 text-green-500" />
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <p className="text-lg font-semibold">Ready to Create Secure Shipment</p>
                  <p className="text-gray-600">Shipping cost: ₹{courierPrice.toFixed(2)} will be deducted from your wallet</p>
                  <p className="text-sm text-gray-500 mt-2">AWB will be generated automatically after creation</p>
                  <div className="mt-3 text-xs text-green-700 bg-green-100 p-2 rounded">
                    ✓ All recipients verified against authorized list
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {step < 5 ? (
            <Button
              onClick={() => {
                if (step === 3) {
                  calculateCourierPrice();
                }
                setStep(step + 1);
              }}
              disabled={!canProceedToNextStep()}
              className="bg-green-600 hover:bg-green-700"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={createShipment}
              disabled={loading || courierPrice === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  <Send className="w-4 h-4 mr-2" />
                  Create Secure Shipment
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Return Management Component
const ReturnManagementModule: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/reverse-requests');
      if (response.ok) {
        const data = await response.json();
        setReturns(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnAction = async (returnId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/reverse-requests/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        toast({
          title: `Return ${action}d successfully`,
          description: `The return request has been ${action}d and the service center will be notified.`
        });
        fetchReturns();
      } else {
        toast({
          title: `Failed to ${action} return`,
          description: 'Please try again later.',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing return:`, error);
      toast({
        title: "Error",
        description: `Network error while ${action}ing return.`,
        variant: "destructive"
      });
    }
  };

  const generateReturnLabel = async (returnId: string) => {
    try {
      const response = await fetch(`/api/reverse-labels/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reverseRequestId: returnId })
      });

      if (response.ok) {
        const data = await response.json();
        // Open label in new window
        const labelWindow = window.open('', '_blank');
        if (labelWindow) {
          labelWindow.document.write(data.labelHTML);
          labelWindow.document.close();
          labelWindow.focus();
        }
        toast({
          title: "Return label generated",
          description: "The return label has been opened in a new window for printing."
        });
      }
    } catch (error) {
      console.error('Error generating return label:', error);
      toast({
        title: "Error generating label",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const filteredReturns = returns.filter(returnReq => {
    if (filter === 'all') return true;
    return returnReq.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'picked': return 'outline';
      case 'received': return 'default';
      default: return 'secondary';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5" />
              <span>Return Management</span>
            </CardTitle>
            <CardDescription>Manage return requests from service centers</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Returns</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="picked">In Transit</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchReturns} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading returns...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No return requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReturns.map((returnReq) => (
              <motion.div
                key={returnReq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-semibold">{returnReq.partName}</h4>
                      <p className="text-sm text-gray-600">{returnReq.partCode}</p>
                    </div>
                    <Badge variant={getStatusColor(returnReq.status)}>
                      {returnReq.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{returnReq.estimatedValue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{new Date(returnReq.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-xs text-gray-500">Service Center</Label>
                    <p className="text-sm font-medium">{returnReq.serviceCenterName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Quantity</Label>
                    <p className="text-sm font-medium">{returnReq.quantity} units</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Reason</Label>
                    <p className="text-sm font-medium">{returnReq.reason.replace('_', ' ')}</p>
                  </div>
                </div>

                {returnReq.awbNumber && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">Return AWB Generated</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {returnReq.awbNumber}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {returnReq.status === 'pending' && 'Awaiting your approval'}
                      {returnReq.status === 'approved' && 'Approved - Ready for pickup'}
                      {returnReq.status === 'picked' && 'In transit to your facility'}
                      {returnReq.status === 'received' && 'Received and processed'}
                      {returnReq.status === 'rejected' && 'Request was rejected'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {returnReq.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReturnAction(returnReq.id, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReturnAction(returnReq.id, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </>
                    )}
                    
                    {returnReq.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateReturnLabel(returnReq.id)}
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Print Label
                      </Button>
                    )}

                    {returnReq.awbNumber && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://www.dtdc.in/tracking/track.asp?strAWBNo=${returnReq.awbNumber}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Track
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Notifications Panel Component
const NotificationsPanel: React.FC<{ notifications: any[] }> = ({ notifications }) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{notification.timestamp}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                  )}
                </div>
              </div>
            ))}
            {notifications.length > 5 && (
              <Button variant="outline" size="sm" className="w-full">
                View All Notifications ({notifications.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Error boundary wrapper for part catalog
function PartCatalogWrapper({ brandId, onPartCreated, onPartUpdated }: {
  brandId: string;
  onPartCreated?: (part: any) => void;
  onPartUpdated?: (part: any) => void;
}) {
  const [useSimple, setUseSimple] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
    setUseSimple(false);
    
    // Reset loading state after component mounts
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [brandId]);

  const handleError = (error: Error) => {
    console.error('Error in PartCatalogWrapper:', error);
    setHasError(true);
    setErrorMessage(error.message || 'An unexpected error occurred');
    setUseSimple(true);
    
    toast({
      title: "Part Catalog Error",
      description: "Switching to simple catalog mode due to technical issues",
      variant: "destructive"
    });
  };

  const resetError = () => {
    setHasError(false);
    setErrorMessage('');
    setUseSimple(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading inventory...</span>
      </div>
    );
  }

  if (useSimple || hasError) {
    return (
      <div className="space-y-4">
        {hasError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Enhanced catalog error: {errorMessage}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetError}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Enhanced Again
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => setUseSimple(true)}
                  >
                    Continue with Simple Version
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-700 text-sm">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Using simplified inventory view. Some advanced features may not be available.
          </p>
        </div>
        
        <SimplePartCatalog 
          brandId={brandId}
          onPartCreated={onPartCreated}
          onPartUpdated={onPartUpdated}
        />
      </div>
    );
  }

  // Wrap EnhancedPartCatalog in a try-catch to handle runtime errors
  try {
    return (
      <ErrorBoundary onError={handleError}>
        <EnhancedPartCatalog 
          brandId={brandId}
          onPartCreated={onPartCreated}
          onPartUpdated={onPartUpdated}
        />
      </ErrorBoundary>
    );
  } catch (error) {
    handleError(error as Error);
    return (
      <SimplePartCatalog 
        brandId={brandId}
        onPartCreated={onPartCreated}
        onPartUpdated={onPartUpdated}
      />
    );
  }
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="text-yellow-800 font-semibold">Component Error</h3>
            </div>
            <p className="text-yellow-700 text-sm">
              The enhanced inventory system encountered an error. Please try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Brand Dashboard Component
function BrandDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    walletBalance: 0,
    totalShipments: 0,
    pendingShipments: 0,
    inTransitShipments: 0,
    deliveredShipments: 0,
    totalParts: 0,
    lowStockParts: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    totalReturns: 0,
    pendingReturns: 0
  });
  const [mslAlerts, setMslAlerts] = useState<MSLAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/admin/dashboard');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(prev => ({ ...prev, ...statsData }));
      }

      // Fetch MSL alerts
      const alertsResponse = await fetch('/api/ai-forecasting/restock-alerts');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setMslAlerts(alertsData.alerts || []);
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/auth/activity');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      }

      // Fetch notifications
      const notificationsResponse = await fetch('/api/ai-forecasting/notifications?brandId=brand-1');
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.notifications || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Brand Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedRoute allowedRoles={['BRAND']}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="h-8 w-8 text-green-600" />
                  Brand Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Welcome back, {user.name} - Manual Entry Override Protection Active</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                  <Lock className="h-4 w-4" />
                  <span>Security Enhanced</span>
                </div>
                <NotificationCenter />
                <Button 
                  onClick={fetchDashboardData}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Enhanced Security Active:</strong> All recipient details are restricted to your authorized service centers and distributors. 
              Manual entry of custom recipients is prevented to ensure compliance and security.
            </AlertDescription>
          </Alert>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:grid-cols-9">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="shipments" className="flex items-center space-x-2">
                <Truck className="h-4 w-4" />
                <span>Shipments</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Inventory</span>
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex items-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span>Wallet</span>
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex items-center space-x-2">
                <RotateCcw className="h-4 w-4" />
                <span>Returns</span>
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Network</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <EnhancedBrandOverview onNavigate={setActiveTab} />
            </TabsContent>

            {/* Shipments Tab */}
            <TabsContent value="shipments" className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ShipmentBookingModule />
                <div className="space-y-6">
                  <BulkShipmentManagerSecure brandId={user?.id || 'brand-1'} />
                  <TrackingDashboard
                    userId={user?.id || 'brand-1'}
                    userRole="BRAND"
                    title="Recent Shipments"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-6">
              <PartCatalogWrapper 
                brandId={user?.id || 'brand-1'}
                onPartCreated={(part) => {
                  console.log('New part created:', part);
                  fetchDashboardData(); // Refresh stats
                  toast({
                    title: "Success",
                    description: `Part "${part.code}" created successfully!`
                  });
                }}
                onPartUpdated={(part) => {
                  console.log('Part updated:', part);
                  fetchDashboardData(); // Refresh stats
                  toast({
                    title: "Success", 
                    description: `Part "${part.code}" updated successfully!`
                  });
                }}
              />
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              <BrandWalletManager brandId={user?.id || 'brand-1'} />
            </TabsContent>

            {/* Returns Tab */}
            <TabsContent value="returns" className="space-y-6">
              <ReturnManagementModule />
            </TabsContent>

            {/* Authorized Network Tab */}
            <TabsContent value="network" className="space-y-6">
              <AuthorizedNetworkManager />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Performance Metrics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Shipment Success Rate</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={95} className="w-20" />
                        <span className="text-sm font-medium">95%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>On-Time Delivery</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={88} className="w-20" />
                        <span className="text-sm font-medium">88%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Customer Satisfaction</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={92} className="w-20" />
                        <span className="text-sm font-medium">92%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5" />
                      <span>Critical Alerts</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Low Stock Alert</p>
                          <p className="text-xs text-gray-600">{stats.lowStockParts} parts below MSL</p>
                        </div>
                        <Badge variant="destructive">Critical</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Pending Returns</p>
                          <p className="text-xs text-gray-600">{stats.pendingReturns} return requests awaiting approval</p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <RestockAlertsManager 
                brandId={user?.id || 'brand-1'} 
                userRole="BRAND" 
              />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <NotificationsPanel notifications={notifications} />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Brand Profile</CardTitle>
                    <CardDescription>Update your brand information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Brand Name</Label>
                      <Input value={user.name} readOnly />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user.email} readOnly />
                    </div>
                    <div>
                      <Label>Contact Number</Label>
                      <Input placeholder="Enter contact number" />
                    </div>
                    <Button>Update Profile</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Configure security and notification preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span>Manual Entry Override Protection</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Email Notifications</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SMS Alerts</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Low Stock Alerts</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <Button>Save Preferences</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default BrandDashboard;

// Force SSR to prevent hydration mismatch issues
export async function getServerSideProps() {
  return {
    props: {}
  };
}