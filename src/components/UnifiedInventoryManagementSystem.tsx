import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  MapPin,
  Users,
  Building,
  Truck,
  Search, 
  Filter, 
  Edit, 
  Eye, 
  Download, 
  Upload, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Minus,
  ArrowUpDown,
  Clock,
  Target,
  Activity,
  Database,
  Shield,
  FileCheck,
  Brain,
  Zap,
  Bell,
  Settings,
  History,
  QrCode,
  Printer,
  ExternalLink,
  Copy,
  Info,
  Star,
  Archive,
  Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Comprehensive interfaces for the unified system
interface UnifiedInventoryData {
  // Core inventory data
  inventory: InventoryItem[];
  movements: MovementRecord[];
  locations: Location[];
  suppliers: Supplier[];
  
  // Analytics and insights
  analytics: AnalyticsData;
  forecasting: ForecastingData;
  alerts: Alert[];
  
  // Summary metrics
  summary: InventorySummary;
  
  // Flow tracking
  forwardFlow: FlowRecord[];
  reverseFlow: FlowRecord[];
  
  // AI insights
  aiInsights: AIInsights;
}

interface InventoryItem {
  id: string;
  partId: string;
  locationId: string;
  supplierId?: string;
  
  // Stock quantities with complete breakdown
  onHandQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  allocatedQuantity: number;
  inTransitQuantity: number;
  defectiveQuantity: number;
  quarantineQuantity: number;
  
  // Timestamps for traceability
  lastRestocked: string | null;
  lastIssued: string | null;
  lastCounted: string | null;
  lastMovement: string | null;
  
  // Cost tracking
  averageCost: number | null;
  lastCost: number | null;
  standardCost: number | null;
  fifoValue: number | null;
  lifoValue: number | null;
  weightedAvgCost: number | null;
  
  // Part details with enhanced attributes
  part: {
    id: string;
    code: string;
    name: string;
    partNumber: string | null;
    category: string | null;
    subCategory: string | null;
    price: number;
    weight: number | null;
    dimensions: string | null;
    
    // Stock control parameters
    minStockLevel: number;
    maxStockLevel: number | null;
    reorderPoint: number | null;
    reorderQty: number | null;
    
    // Classification and tracking
    serialized: boolean;
    batchTracked: boolean;
    expiryTracked: boolean;
    hazardous: boolean;
    controlled: boolean;
    abc_classification: string | null;
    xyz_classification: string | null;
    
    // Lifecycle management
    leadTime: number | null;
    shelfLife: number | null;
    storageConditions: string | null;
  };
  
  // Location details
  location: {
    id: string;
    code: string;
    name: string;
    type: string;
    zone: string | null;
    aisle: string | null;
    rack: string | null;
    shelf: string | null;
    bin: string | null;
    capacity: number | null;
    temperature: number | null;
    humidity: number | null;
  };
  
  // Supplier information
  supplier?: {
    id: string;
    code: string;
    name: string;
    rating: number | null;
    leadTime: number | null;
    reliability: number | null;
  };
  
  // Batch and serial tracking
  batches?: Batch[];
  serials?: Serial[];
}

interface MovementRecord {
  id: string;
  type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'SCRAP' | 'CYCLE_COUNT';
  subType?: string;
  partId: string;
  fromLocationId?: string;
  toLocationId?: string;
  quantity: number;
  unitCost?: number;
  totalValue?: number;
  reason: string;
  reference?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  expiryDate?: string;
  qualityStatus: 'GOOD' | 'DEFECTIVE' | 'QUARANTINE' | 'EXPIRED' | 'DAMAGED';
  approvedBy?: string;
  performedBy: string;
  timestamp: string;
  notes?: string;
  attachments?: string[];
  
  // Flow tracking
  flowDirection: 'FORWARD' | 'REVERSE';
  flowStage: string; // Brand→Distributor, Distributor→ServiceCenter, etc.
  chainOfCustody: string[]; // Array of custody transfers
}

interface FlowRecord {
  id: string;
  type: 'FORWARD' | 'REVERSE';
  stage: string;
  partId: string;
  quantity: number;
  fromEntity: string;
  toEntity: string;
  shipmentId?: string;
  awbNumber?: string;
  status: 'INITIATED' | 'IN_TRANSIT' | 'DELIVERED' | 'RECEIVED' | 'CONSUMED' | 'RETURNED';
  timestamp: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  reason?: string;
  notes?: string;
}

interface AIInsights {
  demandPrediction: {
    partId: string;
    predictedDemand: number;
    confidence: number;
    timeframe: string;
    factors: string[];
  }[];
  
  stockOptimization: {
    partId: string;
    currentStock: number;
    optimalStock: number;
    potentialSavings: number;
    recommendation: string;
  }[];
  
  flowOptimization: {
    route: string;
    currentEfficiency: number;
    optimizedEfficiency: number;
    recommendations: string[];
  }[];
  
  anomalyDetection: {
    type: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedParts: string[];
    recommendation: string;
  }[];
}

interface Location {
  id: string;
  code: string;
  name: string;
  type: 'WAREHOUSE' | 'STORE' | 'PRODUCTION' | 'QUARANTINE' | 'TRANSIT' | 'CUSTOMER' | 'SUPPLIER';
  parentId?: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  currentUtilization?: number;
  temperature?: number;
  humidity?: number;
  securityLevel?: string;
  accessRestricted?: boolean;
  active: boolean;
  address?: string;
  coordinates?: string;
  manager?: string;
  contact?: string;
  notes?: string;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  type: 'MANUFACTURER' | 'DISTRIBUTOR' | 'WHOLESALER' | 'RETAILER' | 'SERVICE_PROVIDER';
  rating: number;
  reliability: number;
  leadTime: number;
  paymentTerms: string;
  currency: string;
  taxId?: string;
  contact: {
    person: string;
    email: string;
    phone: string;
    address: string;
  };
  performance: {
    onTimeDelivery: number;
    qualityRating: number;
    priceCompetitiveness: number;
    responsiveness: number;
  };
  certifications: string[];
  active: boolean;
}

interface Batch {
  id: string;
  batchNumber: string;
  partId: string;
  locationId: string;
  quantity: number;
  manufactureDate?: string;
  expiryDate?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  qualityStatus: 'GOOD' | 'DEFECTIVE' | 'QUARANTINE' | 'EXPIRED' | 'DAMAGED';
  certifications?: string[];
  testResults?: string;
  notes?: string;
}

interface Serial {
  id: string;
  serialNumber: string;
  partId: string;
  locationId: string;
  status: 'AVAILABLE' | 'ALLOCATED' | 'ISSUED' | 'RETURNED' | 'SCRAPPED' | 'LOST';
  batchId?: string;
  manufactureDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  serviceHistory?: string;
  currentCustomer?: string;
  notes?: string;
}

interface Alert {
  id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'QUALITY_ISSUE' | 'COMPLIANCE_VIOLATION' | 'CYCLE_COUNT_DUE' | 'FLOW_DISRUPTION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  partId?: string;
  locationId?: string;
  batchId?: string;
  title: string;
  description: string;
  actionRequired: boolean;
  assignedTo?: string;
  dueDate?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

interface AnalyticsData {
  turnoverAnalysis: any[];
  abcAnalysis: any[];
  xyzAnalysis: any[];
  locationUtilization: any[];
  supplierPerformance: any[];
  flowEfficiency: {
    forwardFlowEfficiency: number;
    reverseFlowEfficiency: number;
    averageTransitTime: number;
    onTimeDeliveryRate: number;
  };
}

interface ForecastingData {
  demandForecast: any[];
  reorderRecommendations: any[];
  seasonalPatterns: any[];
  flowPredictions: {
    expectedForwardVolume: number;
    expectedReverseVolume: number;
    peakPeriods: string[];
    bottlenecks: string[];
  };
}

interface InventorySummary {
  totalParts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalLocations: number;
  totalSuppliers: number;
  avgTurnoverRate: number;
  totalMovements: number;
  forwardFlowVolume: number;
  reverseFlowVolume: number;
  flowEfficiency: number;
}

interface UnifiedInventoryManagementSystemProps {
  brandId: string;
  onNavigate?: (tab: string) => void;
}

const UnifiedInventoryManagementSystem: React.FC<UnifiedInventoryManagementSystemProps> = ({
  brandId,
  onNavigate
}) => {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UnifiedInventoryData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: 'all',
    category: 'all',
    status: 'all',
    supplier: 'all',
    classification: 'all',
    flowType: 'all'
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showAIInsightsDialog, setShowAIInsightsDialog] = useState(false);
  const [selectedFlowRecord, setSelectedFlowRecord] = useState<FlowRecord | null>(null);

  // Fetch unified inventory data
  const fetchUnifiedData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/brand/inventory/unified-system?brandId=${brandId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        throw new Error('Failed to fetch unified inventory data');
      }
    } catch (error) {
      console.error('Error fetching unified data:', error);
      toast({
        title: "Error",
        description: "Failed to load unified inventory system",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [brandId, toast]);

  useEffect(() => {
    fetchUnifiedData();
  }, [fetchUnifiedData]);

  // Filtered and sorted inventory
  const filteredInventory = useMemo(() => {
    if (!data?.inventory) return [];
    
    return data.inventory
      .filter(item => {
        const matchesSearch = !searchTerm || 
          item.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesLocation = filters.location === 'all' || item.locationId === filters.location;
        const matchesCategory = filters.category === 'all' || item.part.category === filters.category;
        const matchesSupplier = filters.supplier === 'all' || item.supplierId === filters.supplier;
        
        let matchesStatus = true;
        if (filters.status === 'low_stock') {
          matchesStatus = item.onHandQuantity <= item.part.minStockLevel;
        } else if (filters.status === 'out_of_stock') {
          matchesStatus = item.onHandQuantity === 0;
        } else if (filters.status === 'overstock') {
          matchesStatus = item.part.maxStockLevel ? item.onHandQuantity > item.part.maxStockLevel : false;
        }

        return matchesSearch && matchesLocation && matchesCategory && matchesSupplier && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'name':
            aValue = a.part.name;
            bValue = b.part.name;
            break;
          case 'code':
            aValue = a.part.code;
            bValue = b.part.code;
            break;
          case 'quantity':
            aValue = a.onHandQuantity;
            bValue = b.onHandQuantity;
            break;
          case 'value':
            aValue = a.onHandQuantity * a.part.price;
            bValue = b.onHandQuantity * b.part.price;
            break;
          case 'location':
            aValue = a.location.name;
            bValue = b.location.name;
            break;
          default:
            aValue = a.part.name;
            bValue = b.part.name;
        }

        if (typeof aValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return sortOrder === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }
      });
  }, [data?.inventory, searchTerm, filters, sortBy, sortOrder]);

  // Get stock status with enhanced logic
  const getStockStatus = useCallback((item: InventoryItem) => {
    const { onHandQuantity, part, defectiveQuantity, quarantineQuantity } = item;
    const availableQty = onHandQuantity - defectiveQuantity - quarantineQuantity;
    
    if (availableQty <= 0) {
      return { status: 'out-of-stock', color: 'destructive', text: 'Out of Stock', icon: AlertTriangle };
    } else if (availableQty <= part.minStockLevel) {
      return { status: 'low-stock', color: 'destructive', text: 'Low Stock', icon: TrendingDown };
    } else if (part.maxStockLevel && availableQty >= part.maxStockLevel) {
      return { status: 'overstock', color: 'secondary', text: 'Overstock', icon: TrendingUp };
    } else {
      return { status: 'in-stock', color: 'default', text: 'In Stock', icon: CheckCircle };
    }
  }, []);

  // Handle flow tracking
  const handleTrackFlow = useCallback((partId: string) => {
    if (!data) return;
    
    const forwardFlow = data.forwardFlow.filter(f => f.partId === partId);
    const reverseFlow = data.reverseFlow.filter(f => f.partId === partId);
    
    // Show flow tracking dialog
    setShowFlowDialog(true);
  }, [data]);

  // Handle movement recording
  const handleRecordMovement = useCallback(async (movementData: any) => {
    try {
      const response = await fetch('/api/brand/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...movementData,
          brandId,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Movement recorded successfully"
        });
        fetchUnifiedData();
      } else {
        throw new Error('Failed to record movement');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record movement",
        variant: "destructive"
      });
    }
  }, [brandId, toast, fetchUnifiedData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Unified Inventory System...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load unified inventory data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Flow Visualization */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Database className="h-6 w-6" />
                <span>Unified Inventory Management System</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Complete spare parts flow tracking with forward & reverse logistics, AI insights, and real-time traceability
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowAIInsightsDialog(true)} variant="outline" className="border-blue-300">
                <Brain className="h-4 w-4 mr-2" />
                AI Insights
              </Button>
              <Button onClick={fetchUnifiedData} variant="outline" className="border-blue-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Flow Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-900 flex items-center">
                <ArrowRight className="h-4 w-4 mr-2" />
                Forward Logistics Flow
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span>Brand</span>
                </div>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <span>Distributor</span>
                </div>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <span>Service Center</span>
                </div>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <div className="flex items-center space-x-1">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span>Customer</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Forward Volume (30 days)</span>
                  <span className="font-semibold text-green-600">{data.summary.forwardFlowVolume}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-900 flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Reverse Logistics Flow
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span>Customer</span>
                </div>
                <ArrowLeft className="h-3 w-3 text-gray-400" />
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <span>Service Center</span>
                </div>
                <ArrowLeft className="h-3 w-3 text-gray-400" />
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <span>Distributor</span>
                </div>
                <ArrowLeft className="h-3 w-3 text-gray-400" />
                <div className="flex items-center space-x-1">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span>Brand</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reverse Volume (30 days)</span>
                  <span className="font-semibold text-orange-600">{data.summary.reverseFlowVolume}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalParts}</div>
            <p className="text-xs text-muted-foreground">Active SKUs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.summary.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Inventory worth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flow Efficiency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.flowEfficiency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Overall efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalLocations}</div>
            <p className="text-xs text-muted-foreground">Storage locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">Active suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgTurnoverRate.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground">Annual average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.summary.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movements</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalMovements}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-500" />
              Critical Alerts ({data.alerts.filter(a => a.severity === 'CRITICAL').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.slice(0, 5).map((alert, index) => (
                <Alert key={index} className={
                  alert.severity === 'CRITICAL' ? 'border-red-500' : 
                  alert.severity === 'HIGH' ? 'border-orange-500' : 
                  'border-yellow-500'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <strong>{alert.title}</strong>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                      <Badge variant={
                        alert.severity === 'CRITICAL' ? 'destructive' :
                        alert.severity === 'HIGH' ? 'destructive' :
                        'secondary'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Live Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="flow-tracking" className="flex items-center space-x-2">
            <Truck className="h-4 w-4" />
            <span>Flow Tracking</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4" />
            <span>Movements</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Management</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flow Efficiency Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Flow Efficiency Analysis</CardTitle>
                <CardDescription>Forward vs Reverse logistics performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Forward Flow Efficiency</span>
                    <span className="font-medium">{data.analytics.flowEfficiency.forwardFlowEfficiency.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.analytics.flowEfficiency.forwardFlowEfficiency} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Reverse Flow Efficiency</span>
                    <span className="font-medium">{data.analytics.flowEfficiency.reverseFlowEfficiency.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.analytics.flowEfficiency.reverseFlowEfficiency} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>On-Time Delivery Rate</span>
                    <span className="font-medium">{data.analytics.flowEfficiency.onTimeDeliveryRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.analytics.flowEfficiency.onTimeDeliveryRate} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Average Transit Time</span>
                    <span className="font-medium">{data.analytics.flowEfficiency.averageTransitTime.toFixed(1)} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Flow Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Flow Activities</CardTitle>
                <CardDescription>Latest forward and reverse movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...data.forwardFlow, ...data.reverseFlow]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 5)
                    .map((flow, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {flow.type === 'FORWARD' ? (
                            <ArrowRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowLeft className="h-4 w-4 text-orange-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{flow.stage}</p>
                            <p className="text-xs text-muted-foreground">
                              {flow.fromEntity} → {flow.toEntity}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            flow.status === 'DELIVERED' ? 'default' :
                            flow.status === 'IN_TRANSIT' ? 'secondary' :
                            'outline'
                          }>
                            {flow.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(flow.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search parts by name, code, or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {data.locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="overstock">Overstock</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                >
                  {viewMode === 'list' ? <Package className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Live Inventory ({filteredInventory.length})</CardTitle>
                  <CardDescription>Real-time inventory with complete traceability</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowMovementDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Movement
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Info</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Flow Status</TableHead>
                    <TableHead>Quality Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item);
                    const StockIcon = stockStatus.icon;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{item.part.name}</p>
                              <p className="text-sm text-muted-foreground">{item.part.code}</p>
                              {item.part.partNumber && (
                                <p className="text-xs text-muted-foreground">SKU: {item.part.partNumber}</p>
                              )}
                              <div className="flex gap-1 mt-1">
                                {item.part.serialized && <Badge variant="outline" className="text-xs">Serialized</Badge>}
                                {item.part.batchTracked && <Badge variant="outline" className="text-xs">Batch Tracked</Badge>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.location.name}</p>
                            <p className="text-sm text-muted-foreground">{item.location.code}</p>
                            {item.location.zone && (
                              <p className="text-xs text-muted-foreground">
                                Zone: {item.location.zone}
                                {item.location.aisle && ` • Aisle: ${item.location.aisle}`}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <StockIcon className="w-4 h-4" />
                              <Badge variant={stockStatus.color as any}>
                                {stockStatus.text}
                              </Badge>
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>On Hand:</span>
                                <span className="font-medium">{item.onHandQuantity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Available:</span>
                                <span className="font-medium">{item.availableQuantity}</span>
                              </div>
                              {item.reservedQuantity > 0 && (
                                <div className="flex justify-between">
                                  <span>Reserved:</span>
                                  <span className="font-medium text-orange-600">{item.reservedQuantity}</span>
                                </div>
                              )}
                              {item.inTransitQuantity > 0 && (
                                <div className="flex justify-between">
                                  <span>In Transit:</span>
                                  <span className="font-medium text-blue-600">{item.inTransitQuantity}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              Forward: {data.forwardFlow.filter(f => f.partId === item.partId).length}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Reverse: {data.reverseFlow.filter(f => f.partId === item.partId).length}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTrackFlow(item.partId)}
                              className="text-xs p-1 h-auto"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Track Flow
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Badge variant="default" className="text-xs">
                              Good: {item.onHandQuantity - (item.defectiveQuantity + item.quarantineQuantity)}
                            </Badge>
                            {item.defectiveQuantity > 0 && (
                              <div className="text-sm text-red-600">
                                Defective: {item.defectiveQuantity}
                              </div>
                            )}
                            {item.quarantineQuantity > 0 && (
                              <div className="text-sm text-yellow-600">
                                Quarantine: {item.quarantineQuantity}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              ₹{(item.onHandQuantity * item.part.price).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @ ₹{item.part.price.toFixed(2)}
                            </p>
                            {item.averageCost && (
                              <p className="text-xs text-muted-foreground">
                                Avg Cost: ₹{item.averageCost.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {item.lastMovement && (
                              <div>
                                <span className="text-muted-foreground">Last Movement:</span>
                                <br />
                                {new Date(item.lastMovement).toLocaleDateString()}
                              </div>
                            )}
                            {item.lastRestocked && (
                              <div>
                                <span className="text-muted-foreground">Restocked:</span>
                                <br />
                                {new Date(item.lastRestocked).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleTrackFlow(item.partId)}>
                              <Truck className="w-4 h-4" />
                            </Button>
                            {item.part.serialized && (
                              <Button variant="ghost" size="sm">
                                <QrCode className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow Tracking Tab */}
        <TabsContent value="flow-tracking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forward Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                  <span>Forward Flow Tracking</span>
                </CardTitle>
                <CardDescription>Brand → Distributor → Service Center → Customer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.forwardFlow.slice(0, 10).map((flow, index) => (
                    <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {flow.stage}
                          </Badge>
                          <span className="text-sm font-medium">Qty: {flow.quantity}</span>
                        </div>
                        <Badge variant={
                          flow.status === 'DELIVERED' ? 'default' :
                          flow.status === 'IN_TRANSIT' ? 'secondary' :
                          'outline'
                        }>
                          {flow.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{flow.fromEntity} → {flow.toEntity}</p>
                        {flow.awbNumber && (
                          <p className="font-mono">AWB: {flow.awbNumber}</p>
                        )}
                        <p>{new Date(flow.timestamp).toLocaleString()}</p>
                      </div>
                      {flow.awbNumber && (
                        <div className="mt-2 flex gap-2">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Track
                          </Button>
                          <Button variant="outline" size="sm">
                            <Printer className="w-3 h-3 mr-1" />
                            Label
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reverse Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowLeft className="h-5 w-5 text-orange-600" />
                  <span>Reverse Flow Tracking</span>
                </CardTitle>
                <CardDescription>Customer → Service Center → Distributor → Brand</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.reverseFlow.slice(0, 10).map((flow, index) => (
                    <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {flow.stage}
                          </Badge>
                          <span className="text-sm font-medium">Qty: {flow.quantity}</span>
                        </div>
                        <Badge variant={
                          flow.status === 'RECEIVED' ? 'default' :
                          flow.status === 'IN_TRANSIT' ? 'secondary' :
                          'outline'
                        }>
                          {flow.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{flow.fromEntity} → {flow.toEntity}</p>
                        {flow.reason && (
                          <p>Reason: {flow.reason}</p>
                        )}
                        {flow.awbNumber && (
                          <p className="font-mono">AWB: {flow.awbNumber}</p>
                        )}
                        <p>{new Date(flow.timestamp).toLocaleString()}</p>
                      </div>
                      {flow.awbNumber && (
                        <div className="mt-2 flex gap-2">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Track
                          </Button>
                          <Button variant="outline" size="sm">
                            <Printer className="w-3 h-3 mr-1" />
                            Label
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Movements</CardTitle>
              <CardDescription>Complete audit trail of all inventory transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.movements.slice(0, 20).map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm">
                        {new Date(movement.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          movement.type === 'RECEIPT' ? 'default' :
                          movement.type === 'ISSUE' ? 'secondary' :
                          movement.type === 'RETURN' ? 'outline' :
                          'destructive'
                        }>
                          {movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{movement.partId}</p>
                          {movement.batchNumber && (
                            <p className="text-xs text-muted-foreground">Batch: {movement.batchNumber}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.quantity}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {movement.fromLocationId && (
                            <span>{movement.fromLocationId}</span>
                          )}
                          {movement.fromLocationId && movement.toLocationId && (
                            <ArrowRight className="h-3 w-3 inline mx-1" />
                          )}
                          {movement.toLocationId && (
                            <span>{movement.toLocationId}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          movement.qualityStatus === 'GOOD' ? 'default' :
                          movement.qualityStatus === 'DEFECTIVE' ? 'destructive' :
                          'secondary'
                        }>
                          {movement.qualityStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {movement.reference || movement.reason}
                      </TableCell>
                      <TableCell className="text-sm">
                        {movement.performedBy}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Demand Prediction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span>AI Demand Prediction</span>
                </CardTitle>
                <CardDescription>Machine learning powered demand forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.aiInsights.demandPrediction.slice(0, 5).map((prediction, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{prediction.partId}</p>
                          <p className="text-xs text-muted-foreground">{prediction.timeframe}</p>
                        </div>
                        <Badge variant="outline">
                          {prediction.confidence.toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Predicted Demand:</span>
                        <span className="font-medium">{prediction.predictedDemand}</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Factors: {prediction.factors.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stock Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span>Stock Optimization</span>
                </CardTitle>
                <CardDescription>AI-powered inventory optimization recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.aiInsights.stockOptimization.slice(0, 5).map((optimization, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{optimization.partId}</p>
                        <Badge variant={
                          optimization.potentialSavings > 0 ? 'default' : 'secondary'
                        }>
                          ₹{optimization.potentialSavings.toFixed(0)} savings
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-medium ml-1">{optimization.currentStock}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Optimal:</span>
                          <span className="font-medium ml-1">{optimization.optimalStock}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {optimization.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Flow Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <span>Flow Optimization</span>
                </CardTitle>
                <CardDescription>Logistics flow efficiency improvements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.aiInsights.flowOptimization.map((flow, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{flow.route}</p>
                        <Badge variant="outline">
                          +{(flow.optimizedEfficiency - flow.currentEfficiency).toFixed(1)}% improvement
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-medium ml-1">{flow.currentEfficiency.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Optimized:</span>
                          <span className="font-medium ml-1">{flow.optimizedEfficiency.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {flow.recommendations.map((rec, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {rec}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Anomaly Detection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span>Anomaly Detection</span>
                </CardTitle>
                <CardDescription>AI-powered anomaly and risk detection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.aiInsights.anomalyDetection.map((anomaly, index) => (
                    <div key={index} className={`border rounded-lg p-3 ${
                      anomaly.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                      anomaly.severity === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                      'border-yellow-500 bg-yellow-50'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{anomaly.type}</p>
                        <Badge variant={
                          anomaly.severity === 'CRITICAL' ? 'destructive' :
                          anomaly.severity === 'HIGH' ? 'destructive' :
                          'secondary'
                        }>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{anomaly.description}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Affected Parts: {anomaly.affectedParts.join(', ')}
                      </p>
                      <p className="text-xs font-medium">
                        Recommendation: {anomaly.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common inventory management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full" variant="outline" onClick={() => setShowMovementDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record Movement
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button className="w-full" variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Inventory system status and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Data Accuracy</span>
                    <span className="font-medium text-green-600">99.8%</span>
                  </div>
                  <Progress value={99.8} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Flow Tracking</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                  <Progress value={100} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>AI Insights</span>
                    <span className="font-medium text-blue-600">Learning</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Sync Status</span>
                    <span className="font-medium text-green-600">Real-time</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest system notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.alerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 bg-muted/50 rounded">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                        alert.severity === 'CRITICAL' ? 'text-red-500' :
                        alert.severity === 'HIGH' ? 'text-orange-500' :
                        'text-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Movement Recording Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Inventory Movement</DialogTitle>
            <DialogDescription>
              Record a new inventory movement with complete traceability
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Movement Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIPT">Receipt</SelectItem>
                    <SelectItem value="ISSUE">Issue</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    <SelectItem value="RETURN">Return</SelectItem>
                    <SelectItem value="SCRAP">Scrap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Part</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select part" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.inventory.slice(0, 10).map(item => (
                      <SelectItem key={item.id} value={item.partId}>
                        {item.part.code} - {item.part.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" placeholder="Enter quantity" />
              </div>
              <div>
                <Label>From Location</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Location</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason</Label>
              <Input placeholder="Enter reason for movement" />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes (optional)" rows={3} />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowMovementDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Handle movement recording
                setShowMovementDialog(false);
                toast({
                  title: "Success",
                  description: "Movement recorded successfully"
                });
              }}>
                <Save className="w-4 h-4 mr-2" />
                Record Movement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Insights Dialog */}
      <Dialog open={showAIInsightsDialog} onOpenChange={setShowAIInsightsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>AI Insights Dashboard</span>
            </DialogTitle>
            <DialogDescription>
              Comprehensive AI-powered insights for inventory optimization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* AI Insights content would go here */}
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-lg font-semibold mb-2">AI Insights Processing</h3>
              <p className="text-muted-foreground">
                Advanced analytics and recommendations are being generated based on your inventory data.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedInventoryManagementSystem;