import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search, 
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
  DollarSign,
  Users,
  MapPin,
  QrCode,
  Building,
  Shield,
  Database,
  Activity,
  PieChart,
  RotateCcw,
  ArrowUpDown,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Bell,
  FileCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ERPInventoryData {
  summary: {
    totalParts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalLocations: number;
    totalSuppliers: number;
    avgTurnoverRate: number;
    totalMovements: number;
  };
  inventory: InventoryItem[];
  locations: Location[];
  suppliers: Supplier[];
  movements: MovementRecord[];
  alerts: Alert[];
  analytics: AnalyticsData;
  forecasting: ForecastingData;
  qualityControl: QualityData;
  compliance: ComplianceData;
}

interface InventoryItem {
  id: string;
  partId: string;
  locationId: string;
  supplierId?: string;
  onHandQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  allocatedQuantity: number;
  inTransitQuantity: number;
  defectiveQuantity: number;
  quarantineQuantity: number;
  lastRestocked: string | null;
  lastIssued: string | null;
  lastCounted: string | null;
  averageCost: number | null;
  lastCost: number | null;
  standardCost: number | null;
  fifoValue: number | null;
  lifoValue: number | null;
  weightedAvgCost: number | null;
  part: {
    id: string;
    code: string;
    name: string;
    partNumber: string | null;
    minStockLevel: number;
    maxStockLevel: number | null;
    reorderPoint: number | null;
    reorderQty: number | null;
    category: string | null;
    subCategory: string | null;
    price: number;
    weight: number | null;
    dimensions: string | null;
    serialized: boolean;
    batchTracked: boolean;
    expiryTracked: boolean;
    hazardous: boolean;
    controlled: boolean;
    abc_classification: string | null;
    xyz_classification: string | null;
    leadTime: number | null;
    shelfLife: number | null;
    storageConditions: string | null;
  };
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
  supplier?: {
    id: string;
    code: string;
    name: string;
    rating: number | null;
    leadTime: number | null;
    reliability: number | null;
  };
  batches?: Batch[];
  serials?: Serial[];
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
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'QUALITY_ISSUE' | 'COMPLIANCE_VIOLATION' | 'CYCLE_COUNT_DUE';
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
  turnoverAnalysis: {
    partId: string;
    partCode: string;
    partName: string;
    turnoverRate: number;
    classification: 'FAST' | 'MEDIUM' | 'SLOW' | 'DEAD';
    daysOnHand: number;
    lastMovement: string;
  }[];
  abcAnalysis: {
    partId: string;
    partCode: string;
    partName: string;
    annualValue: number;
    classification: 'A' | 'B' | 'C';
    percentage: number;
    cumulativePercentage: number;
  }[];
  xyzAnalysis: {
    partId: string;
    partCode: string;
    partName: string;
    demandVariability: number;
    classification: 'X' | 'Y' | 'Z';
    forecastAccuracy: number;
  }[];
  locationUtilization: {
    locationId: string;
    locationCode: string;
    locationName: string;
    capacity: number;
    utilized: number;
    utilizationPercentage: number;
    efficiency: number;
  }[];
  supplierPerformance: {
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    onTimeDelivery: number;
    qualityRating: number;
    priceVariance: number;
    totalOrders: number;
    totalValue: number;
  }[];
}

interface ForecastingData {
  demandForecast: {
    partId: string;
    partCode: string;
    partName: string;
    currentStock: number;
    forecastedDemand: number;
    recommendedOrder: number;
    confidence: number;
    method: string;
    seasonality: boolean;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  }[];
  reorderRecommendations: {
    partId: string;
    partCode: string;
    partName: string;
    currentStock: number;
    reorderPoint: number;
    recommendedQty: number;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimatedStockout: string;
    preferredSupplier: string;
  }[];
  seasonalPatterns: {
    partId: string;
    partCode: string;
    partName: string;
    seasonalIndex: number[];
    peakMonth: number;
    lowMonth: number;
    volatility: number;
  }[];
}

interface QualityData {
  qualityMetrics: {
    totalInspections: number;
    passRate: number;
    defectRate: number;
    quarantineRate: number;
    reworkRate: number;
    scrapRate: number;
  };
  defectAnalysis: {
    partId: string;
    partCode: string;
    partName: string;
    defectCount: number;
    defectRate: number;
    defectTypes: string[];
    rootCauses: string[];
    corrective_actions: string[];
  }[];
  supplierQuality: {
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    qualityScore: number;
    defectRate: number;
    rejectionRate: number;
    certificationStatus: string;
    lastAudit: string;
  }[];
}

interface ComplianceData {
  regulations: {
    id: string;
    name: string;
    type: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'EXPIRED';
    lastReview: string;
    nextReview: string;
    responsible: string;
  }[];
  certifications: {
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    status: 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
    scope: string;
    attachments: string[];
  }[];
  auditTrail: {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    performedBy: string;
    timestamp: string;
    changes: string;
    reason: string;
  }[];
}

const ERPGradeInventoryManager: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ERPInventoryData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: 'all',
    category: 'all',
    status: 'all',
    supplier: 'all',
    classification: 'all'
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showSerialDialog, setShowSerialDialog] = useState(false);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showForecastDialog, setShowForecastDialog] = useState(false);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);

  // Form states
  const [locationForm, setLocationForm] = useState<Partial<Location>>({});
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({});
  const [movementForm, setMovementForm] = useState<Partial<MovementRecord>>({});

  // Fetch ERP inventory data
  const fetchERPData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/brand/inventory/erp-dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        throw new Error('Failed to fetch ERP data');
      }
    } catch (error) {
      console.error('Error fetching ERP data:', error);
      toast({
        title: "Error",
        description: "Failed to load ERP inventory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchERPData();
  }, [fetchERPData]);

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

  // Get quality status
  const getQualityStatus = useCallback((item: InventoryItem) => {
    const { onHandQuantity, defectiveQuantity, quarantineQuantity } = item;
    const goodQty = onHandQuantity - defectiveQuantity - quarantineQuantity;
    const qualityRate = onHandQuantity > 0 ? (goodQty / onHandQuantity) * 100 : 100;
    
    if (qualityRate >= 95) {
      return { status: 'excellent', color: 'default', text: 'Excellent', percentage: qualityRate };
    } else if (qualityRate >= 85) {
      return { status: 'good', color: 'secondary', text: 'Good', percentage: qualityRate };
    } else if (qualityRate >= 70) {
      return { status: 'fair', color: 'destructive', text: 'Fair', percentage: qualityRate };
    } else {
      return { status: 'poor', color: 'destructive', text: 'Poor', percentage: qualityRate };
    }
  }, []);

  // Handle location management
  const handleLocationSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/brand/inventory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationForm)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Location created successfully"
        });
        setShowLocationDialog(false);
        setLocationForm({});
        fetchERPData();
      } else {
        throw new Error('Failed to create location');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create location",
        variant: "destructive"
      });
    }
  }, [locationForm, toast, fetchERPData]);

  // Handle supplier management
  const handleSupplierSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/brand/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Supplier created successfully"
        });
        setShowSupplierDialog(false);
        setSupplierForm({});
        fetchERPData();
      } else {
        throw new Error('Failed to create supplier');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive"
      });
    }
  }, [supplierForm, toast, fetchERPData]);

  // Handle movement recording
  const handleMovementSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/brand/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementForm)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Movement recorded successfully"
        });
        setShowMovementDialog(false);
        setMovementForm({});
        fetchERPData();
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
  }, [movementForm, toast, fetchERPData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ERP Inventory System...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load ERP inventory data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            ERP-Grade Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Enterprise Resource Planning level inventory control with complete traceability
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowLocationDialog(true)} variant="outline">
            <Building className="h-4 w-4 mr-2" />
            Manage Locations
          </Button>
          <Button onClick={() => setShowSupplierDialog(true)} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Manage Suppliers
          </Button>
          <Button onClick={() => setShowMovementDialog(true)} variant="outline">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Record Movement
          </Button>
          <Button onClick={fetchERPData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.summary.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Inventory worth</p>
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
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">Critical items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movements</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Locations</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4" />
            <span>Movements</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <PieChart className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Forecasting</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Quality</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            <FileCheck className="h-4 w-4" />
            <span>Compliance</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ABC Analysis Chart */}
            <Card>
              <CardHeader>
                <CardTitle>ABC Analysis</CardTitle>
                <CardDescription>Parts classification by value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.analytics.abcAnalysis.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          item.classification === 'A' ? 'default' :
                          item.classification === 'B' ? 'secondary' : 'outline'
                        }>
                          {item.classification}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{item.partName}</p>
                          <p className="text-xs text-muted-foreground">{item.partCode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{item.annualValue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Location Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>Location Utilization</CardTitle>
                <CardDescription>Storage capacity usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.analytics.locationUtilization.map((location, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{location.locationName}</span>
                        <span className="text-sm">{location.utilizationPercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={location.utilizationPercentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{location.utilized} / {location.capacity}</span>
                        <span>Efficiency: {location.efficiency.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Supplier Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Supplier Performance</CardTitle>
                <CardDescription>Top performing suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.analytics.supplierPerformance.slice(0, 5).map((supplier, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{supplier.supplierName}</p>
                        <p className="text-xs text-muted-foreground">{supplier.supplierCode}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{supplier.onTimeDelivery.toFixed(0)}% OTD</Badge>
                          <Badge variant="outline">{supplier.qualityRating.toFixed(1)} Quality</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {supplier.totalOrders} orders • ₹{supplier.totalValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Turnover Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover</CardTitle>
                <CardDescription>Movement velocity analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.analytics.turnoverAnalysis.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          item.classification === 'FAST' ? 'default' :
                          item.classification === 'MEDIUM' ? 'secondary' :
                          item.classification === 'SLOW' ? 'destructive' : 'outline'
                        }>
                          {item.classification}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{item.partName}</p>
                          <p className="text-xs text-muted-foreground">{item.partCode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.turnoverRate.toFixed(1)}x</p>
                        <p className="text-xs text-muted-foreground">{item.daysOnHand} days</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
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

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="value">Value</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                >
                  {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table/Grid */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Inventory Items ({filteredInventory.length})</CardTitle>
                  <CardDescription>Complete inventory with location and quality tracking</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'list' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          checked={selectedItems.length === filteredInventory.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems(filteredInventory.map(item => item.id));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Part Info</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Stock Status</TableHead>
                      <TableHead>Quality Status</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => {
                      const stockStatus = getStockStatus(item);
                      const qualityStatus = getQualityStatus(item);
                      const StockIcon = stockStatus.icon;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedItems(prev => [...prev, item.id]);
                                } else {
                                  setSelectedItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                            />
                          </TableCell>
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
                                {item.part.serialized && <Badge variant="outline" className="text-xs">Serialized</Badge>}
                                {item.part.batchTracked && <Badge variant="outline" className="text-xs">Batch Tracked</Badge>}
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
                                  {item.location.rack && ` • Rack: ${item.location.rack}`}
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
                            <div className="space-y-2">
                              <Badge variant={qualityStatus.color as any}>
                                {qualityStatus.text} ({qualityStatus.percentage.toFixed(1)}%)
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
                              {item.lastRestocked && (
                                <div>
                                  <span className="text-muted-foreground">Restocked:</span>
                                  <br />
                                  {new Date(item.lastRestocked).toLocaleDateString()}
                                </div>
                              )}
                              {item.lastIssued && (
                                <div>
                                  <span className="text-muted-foreground">Issued:</span>
                                  <br />
                                  {new Date(item.lastIssued).toLocaleDateString()}
                                </div>
                              )}
                              {item.lastCounted && (
                                <div>
                                  <span className="text-muted-foreground">Counted:</span>
                                  <br />
                                  {new Date(item.lastCounted).toLocaleDateString()}
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
                              <Button variant="ghost" size="sm">
                                <ArrowUpDown className="w-4 h-4" />
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item);
                    const qualityStatus = getQualityStatus(item);
                    
                    return (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{item.part.name}</CardTitle>
                              <CardDescription>{item.part.code}</CardDescription>
                            </div>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedItems(prev => [...prev, item.id]);
                                } else {
                                  setSelectedItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant={stockStatus.color as any}>
                              {stockStatus.text}
                            </Badge>
                            <Badge variant={qualityStatus.color as any}>
                              {qualityStatus.text}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>On Hand:</span>
                              <span className="font-medium">{item.onHandQuantity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Available:</span>
                              <span className="font-medium">{item.availableQuantity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Location:</span>
                              <span className="font-medium">{item.location.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Value:</span>
                              <span className="font-medium">₹{(item.onHandQuantity * item.part.price).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <ArrowUpDown className="w-4 h-4" />
                            </Button>
                            {item.part.serialized && (
                              <Button variant="ghost" size="sm">
                                <QrCode className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs would be implemented similarly with their respective content */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Location Management</CardTitle>
              <CardDescription>Manage storage locations and their configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Location management interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Movements</CardTitle>
              <CardDescription>Track all inventory transactions and movements</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Movement tracking interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>Deep insights into inventory performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Analytics dashboard would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting">
          <Card>
            <CardHeader>
              <CardTitle>Demand Forecasting</CardTitle>
              <CardDescription>AI-powered demand prediction and reorder recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Forecasting interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control</CardTitle>
              <CardDescription>Quality management and defect tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Quality control interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Management</CardTitle>
              <CardDescription>Regulatory compliance and audit trails</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Compliance management interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Location Management Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Create a new storage location with detailed configuration
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLocationSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-code">Location Code *</Label>
                <Input
                  id="location-code"
                  value={locationForm.code || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="LOC001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location-name">Location Name *</Label>
                <Input
                  id="location-name"
                  value={locationForm.name || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Main Warehouse"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location-type">Location Type</Label>
              <Select value={locationForm.type || ''} onValueChange={(value) => setLocationForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="STORE">Store</SelectItem>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                  <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                  <SelectItem value="TRANSIT">Transit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="zone">Zone</Label>
                <Input
                  id="zone"
                  value={locationForm.zone || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, zone: e.target.value }))}
                  placeholder="A"
                />
              </div>
              <div>
                <Label htmlFor="aisle">Aisle</Label>
                <Input
                  id="aisle"
                  value={locationForm.aisle || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, aisle: e.target.value }))}
                  placeholder="01"
                />
              </div>
              <div>
                <Label htmlFor="rack">Rack</Label>
                <Input
                  id="rack"
                  value={locationForm.rack || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, rack: e.target.value }))}
                  placeholder="R1"
                />
              </div>
              <div>
                <Label htmlFor="shelf">Shelf</Label>
                <Input
                  id="shelf"
                  value={locationForm.shelf || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, shelf: e.target.value }))}
                  placeholder="S1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={locationForm.capacity || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  value={locationForm.temperature || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                  placeholder="25"
                />
              </div>
              <div>
                <Label htmlFor="humidity">Humidity (%)</Label>
                <Input
                  id="humidity"
                  type="number"
                  value={locationForm.humidity || ''}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, humidity: parseFloat(e.target.value) || 0 }))}
                  placeholder="60"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={locationForm.address || ''}
                onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address of the location"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowLocationDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Create Location
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Similar dialogs for Supplier, Movement, etc. would be implemented */}
    </div>
  );
};

export default ERPGradeInventoryManager;