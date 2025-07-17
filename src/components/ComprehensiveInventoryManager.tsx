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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Package, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2,
  MapPin,
  Users,
  Building,
  Truck,
  Settings,
  Database,
  BarChart3,
  TrendingUp,
  RefreshCw,
  FileText,
  ShoppingCart,
  Warehouse,
  UserPlus,
  MapPinPlus,
  PackagePlus,
  Copy,
  ExternalLink,
  QrCode,
  Calendar,
  DollarSign,
  Weight,
  Ruler,
  Tag,
  Star,
  Archive,
  Activity,
  Clock,
  Target,
  Zap,
  Brain,
  Shield,
  Bell,
  History,
  Info,
  X,
  Image,
  Video,
  FileImage,
  PlayCircle,
  ImagePlus,
  VideoIcon,
  Link,
  Trash
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Enhanced interfaces for comprehensive inventory management
interface InventoryItem {
  id: string;
  partId: string;
  locationId: string;
  supplierId?: string;
  onHandQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  defectiveQuantity: number;
  quarantineQuantity: number;
  inTransitQuantity: number;
  lastRestocked: string | null;
  lastIssued: string | null;
  lastCounted: string | null;
  averageCost: number | null;
  lastCost: number | null;
  part: Part;
  location: Location;
  supplier?: Supplier;
}

interface Part {
  id: string;
  code: string;
  name: string;
  partNumber: string | null;
  category: string | null;
  subCategory: string | null;
  price: number;
  costPrice: number | null;
  weight: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  minStockLevel: number;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  reorderQty: number | null;
  warranty: number | null;
  specifications: string | null;
  tags: string | null;
  status: string;
  isActive: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
  type: 'WAREHOUSE' | 'STORE' | 'PRODUCTION' | 'QUARANTINE' | 'TRANSIT';
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

interface ComprehensiveInventoryManagerProps {
  brandId: string;
  onNavigate?: (tab: string) => void;
}

const ComprehensiveInventoryManager: React.FC<ComprehensiveInventoryManagerProps> = ({
  brandId,
  onNavigate
}) => {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: 'all',
    category: 'all',
    status: 'all',
    supplier: 'all'
  });

  // Dialog states
  const [showAddPartDialog, setShowAddPartDialog] = useState(false);
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [showEditPartDialog, setShowEditPartDialog] = useState(false);
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false);
  const [showEditSupplierDialog, setShowEditSupplierDialog] = useState(false);
  const [showStockAdjustmentDialog, setShowStockAdjustmentDialog] = useState(false);
  
  // Selected items for editing
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  // Form states
  const [partForm, setPartForm] = useState({
    code: '',
    name: '',
    partNumber: '',
    category: '',
    subCategory: '',
    price: '',
    costPrice: '',
    weight: '',
    length: '',
    breadth: '',
    height: '',
    minStockLevel: '',
    maxStockLevel: '',
    reorderPoint: '',
    reorderQty: '',
    warranty: '',
    specifications: '',
    tags: '',
    featured: false,
    isActive: true,
    // Enhanced AI-optimized fields
    problemKeywords: '',
    symptoms: '',
    compatibleAppliances: '',
    installationDifficulty: 'MEDIUM',
    commonFailureReasons: '',
    troubleshootingSteps: '',
    relatedParts: '',
    seasonalDemand: '',
    urgencyLevel: 'MEDIUM',
    customerDescription: '',
    technicalSpecs: '',
    safetyWarnings: '',
    maintenanceInterval: '',
    lifespan: '',
    environmentalConditions: '',
    // Media fields
    imageUrl: '',
    imageUrls: [] as string[],
    diyVideoUrl: '',
    installationVideos: [] as string[],
    technicalDrawings: [] as string[]
  });

  const [locationForm, setLocationForm] = useState({
    code: '',
    name: '',
    type: 'WAREHOUSE',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
    capacity: '',
    temperature: '',
    humidity: '',
    securityLevel: '',
    accessRestricted: false,
    address: '',
    coordinates: '',
    manager: '',
    contact: '',
    notes: ''
  });

  const [supplierForm, setSupplierForm] = useState({
    code: '',
    name: '',
    type: 'MANUFACTURER',
    rating: '',
    reliability: '',
    leadTime: '',
    paymentTerms: '',
    currency: 'INR',
    taxId: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    certifications: ''
  });

  const [stockAdjustmentForm, setStockAdjustmentForm] = useState({
    adjustmentType: 'ADD',
    quantity: '',
    reason: '',
    notes: ''
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [inventoryRes, locationsRes, suppliersRes, partsRes] = await Promise.all([
        fetch(`/api/brand/inventory/unified-system?brandId=${brandId}`),
        fetch(`/api/brand/inventory/locations?brandId=${brandId}`),
        fetch(`/api/brand/inventory/suppliers?brandId=${brandId}`),
        fetch(`/api/parts?brandId=${brandId}`)
      ]);

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData.data?.inventory || []);
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setLocations(locationsData.data || []);
      }

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData.data || []);
      }

      if (partsRes.ok) {
        const partsData = await partsRes.json();
        setParts(partsData.data || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [brandId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset forms
  const resetPartForm = () => {
    setPartForm({
      code: '',
      name: '',
      partNumber: '',
      category: '',
      subCategory: '',
      price: '',
      costPrice: '',
      weight: '',
      length: '',
      breadth: '',
      height: '',
      minStockLevel: '',
      maxStockLevel: '',
      reorderPoint: '',
      reorderQty: '',
      warranty: '',
      specifications: '',
      tags: '',
      featured: false,
      isActive: true,
      // Enhanced AI-optimized fields
      problemKeywords: '',
      symptoms: '',
      compatibleAppliances: '',
      installationDifficulty: 'MEDIUM',
      commonFailureReasons: '',
      troubleshootingSteps: '',
      relatedParts: '',
      seasonalDemand: '',
      urgencyLevel: 'MEDIUM',
      customerDescription: '',
      technicalSpecs: '',
      safetyWarnings: '',
      maintenanceInterval: '',
      lifespan: '',
      environmentalConditions: '',
      // Media fields
      imageUrl: '',
      imageUrls: [],
      diyVideoUrl: '',
      installationVideos: [],
      technicalDrawings: []
    });
  };

  const resetLocationForm = () => {
    setLocationForm({
      code: '',
      name: '',
      type: 'WAREHOUSE',
      zone: '',
      aisle: '',
      rack: '',
      shelf: '',
      bin: '',
      capacity: '',
      temperature: '',
      humidity: '',
      securityLevel: '',
      accessRestricted: false,
      address: '',
      coordinates: '',
      manager: '',
      contact: '',
      notes: ''
    });
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      code: '',
      name: '',
      type: 'MANUFACTURER',
      rating: '',
      reliability: '',
      leadTime: '',
      paymentTerms: '',
      currency: 'INR',
      taxId: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: '',
      certifications: ''
    });
  };

  // Handle part operations
  const handleAddPart = async () => {
    try {
      const response = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...partForm,
          brandId,
          price: parseFloat(partForm.price) || 0,
          costPrice: parseFloat(partForm.costPrice) || null,
          weight: parseFloat(partForm.weight) || null,
          length: parseFloat(partForm.length) || null,
          breadth: parseFloat(partForm.breadth) || null,
          height: parseFloat(partForm.height) || null,
          minStockLevel: parseInt(partForm.minStockLevel) || 0,
          maxStockLevel: parseInt(partForm.maxStockLevel) || null,
          reorderPoint: parseInt(partForm.reorderPoint) || null,
          reorderQty: parseInt(partForm.reorderQty) || null,
          warranty: parseInt(partForm.warranty) || null
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Part added successfully"
        });
        setShowAddPartDialog(false);
        resetPartForm();
        fetchData();
      } else {
        throw new Error('Failed to add part');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add part",
        variant: "destructive"
      });
    }
  };

  const handleEditPart = async () => {
    if (!selectedPart) return;

    try {
      const response = await fetch(`/api/parts/${selectedPart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...partForm,
          price: parseFloat(partForm.price) || 0,
          costPrice: parseFloat(partForm.costPrice) || null,
          weight: parseFloat(partForm.weight) || null,
          length: parseFloat(partForm.length) || null,
          breadth: parseFloat(partForm.breadth) || null,
          height: parseFloat(partForm.height) || null,
          minStockLevel: parseInt(partForm.minStockLevel) || 0,
          maxStockLevel: parseInt(partForm.maxStockLevel) || null,
          reorderPoint: parseInt(partForm.reorderPoint) || null,
          reorderQty: parseInt(partForm.reorderQty) || null,
          warranty: parseInt(partForm.warranty) || null
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Part updated successfully"
        });
        setShowEditPartDialog(false);
        setSelectedPart(null);
        resetPartForm();
        fetchData();
      } else {
        throw new Error('Failed to update part');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update part",
        variant: "destructive"
      });
    }
  };

  // Handle location operations
  const handleAddLocation = async () => {
    try {
      const response = await fetch('/api/brand/inventory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...locationForm,
          brandId,
          capacity: parseInt(locationForm.capacity) || null,
          temperature: parseFloat(locationForm.temperature) || null,
          humidity: parseFloat(locationForm.humidity) || null,
          active: true
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Location added successfully"
        });
        setShowAddLocationDialog(false);
        resetLocationForm();
        fetchData();
      } else {
        throw new Error('Failed to add location');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add location",
        variant: "destructive"
      });
    }
  };

  const handleEditLocation = async () => {
    if (!selectedLocation) return;

    try {
      const response = await fetch(`/api/brand/inventory/locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...locationForm,
          capacity: parseInt(locationForm.capacity) || null,
          temperature: parseFloat(locationForm.temperature) || null,
          humidity: parseFloat(locationForm.humidity) || null
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Location updated successfully"
        });
        setShowEditLocationDialog(false);
        setSelectedLocation(null);
        resetLocationForm();
        fetchData();
      } else {
        throw new Error('Failed to update location');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive"
      });
    }
  };

  // Handle supplier operations
  const handleAddSupplier = async () => {
    try {
      const response = await fetch('/api/brand/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...supplierForm,
          brandId,
          rating: parseFloat(supplierForm.rating) || 0,
          reliability: parseFloat(supplierForm.reliability) || 0,
          leadTime: parseInt(supplierForm.leadTime) || 0,
          contact: {
            person: supplierForm.contactPerson,
            email: supplierForm.contactEmail,
            phone: supplierForm.contactPhone,
            address: supplierForm.contactAddress
          },
          performance: {
            onTimeDelivery: 0,
            qualityRating: 0,
            priceCompetitiveness: 0,
            responsiveness: 0
          },
          certifications: supplierForm.certifications.split(',').map(c => c.trim()).filter(Boolean),
          active: true
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Supplier added successfully"
        });
        setShowAddSupplierDialog(false);
        resetSupplierForm();
        fetchData();
      } else {
        throw new Error('Failed to add supplier');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive"
      });
    }
  };

  const handleEditSupplier = async () => {
    if (!selectedSupplier) return;

    try {
      const response = await fetch(`/api/brand/inventory/suppliers/${selectedSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...supplierForm,
          rating: parseFloat(supplierForm.rating) || 0,
          reliability: parseFloat(supplierForm.reliability) || 0,
          leadTime: parseInt(supplierForm.leadTime) || 0,
          contact: {
            person: supplierForm.contactPerson,
            email: supplierForm.contactEmail,
            phone: supplierForm.contactPhone,
            address: supplierForm.contactAddress
          },
          certifications: supplierForm.certifications.split(',').map(c => c.trim()).filter(Boolean)
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Supplier updated successfully"
        });
        setShowEditSupplierDialog(false);
        setSelectedSupplier(null);
        resetSupplierForm();
        fetchData();
      } else {
        throw new Error('Failed to update supplier');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive"
      });
    }
  };

  // Handle stock adjustment
  const handleStockAdjustment = async () => {
    if (!selectedInventoryItem) return;

    try {
      const response = await fetch(`/api/parts/${selectedInventoryItem.partId}/stock-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          locationId: selectedInventoryItem.locationId,
          adjustmentType: stockAdjustmentForm.adjustmentType,
          quantity: parseInt(stockAdjustmentForm.quantity) || 0,
          reason: stockAdjustmentForm.reason,
          notes: stockAdjustmentForm.notes
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Stock adjustment recorded successfully"
        });
        setShowStockAdjustmentDialog(false);
        setSelectedInventoryItem(null);
        setStockAdjustmentForm({
          adjustmentType: 'ADD',
          quantity: '',
          reason: '',
          notes: ''
        });
        fetchData();
      } else {
        throw new Error('Failed to record stock adjustment');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record stock adjustment",
        variant: "destructive"
      });
    }
  };

  // Prepare edit forms
  const prepareEditPart = async (part: Part) => {
    setSelectedPart(part);
    
    // Fetch complete part data including AI-optimized fields
    try {
      const response = await fetch(`/api/parts/${part.id}`);
      if (response.ok) {
        const fullPartData = await response.json();
        const partData = fullPartData.data || fullPartData;
        
        setPartForm({
          code: partData.code || part.code,
          name: partData.name || part.name,
          partNumber: partData.partNumber || part.partNumber || '',
          category: partData.category || part.category || '',
          subCategory: partData.subCategory || part.subCategory || '',
          price: (partData.price || part.price).toString(),
          costPrice: (partData.costPrice || part.costPrice)?.toString() || '',
          weight: (partData.weight || part.weight)?.toString() || '',
          length: (partData.length || part.length)?.toString() || '',
          breadth: (partData.breadth || part.breadth)?.toString() || '',
          height: (partData.height || part.height)?.toString() || '',
          minStockLevel: (partData.minStockLevel || part.minStockLevel).toString(),
          maxStockLevel: (partData.maxStockLevel || part.maxStockLevel)?.toString() || '',
          reorderPoint: (partData.reorderPoint || part.reorderPoint)?.toString() || '',
          reorderQty: (partData.reorderQty || part.reorderQty)?.toString() || '',
          warranty: (partData.warranty || part.warranty)?.toString() || '',
          specifications: partData.specifications || part.specifications || '',
          tags: partData.tags || part.tags || '',
          featured: partData.featured !== undefined ? partData.featured : part.featured,
          isActive: partData.isActive !== undefined ? partData.isActive : part.isActive,
          // Enhanced AI-optimized fields - populate from database if available
          problemKeywords: partData.problemKeywords || '',
          symptoms: partData.symptoms || '',
          compatibleAppliances: partData.compatibleAppliances || '',
          installationDifficulty: partData.installationDifficulty || 'MEDIUM',
          commonFailureReasons: partData.commonFailureReasons || '',
          troubleshootingSteps: partData.troubleshootingSteps || '',
          relatedParts: partData.relatedParts || '',
          seasonalDemand: partData.seasonalDemand || '',
          urgencyLevel: partData.urgencyLevel || 'MEDIUM',
          customerDescription: partData.customerDescription || '',
          technicalSpecs: partData.technicalSpecs || '',
          safetyWarnings: partData.safetyWarnings || '',
          maintenanceInterval: partData.maintenanceInterval || '',
          lifespan: partData.lifespan || '',
          environmentalConditions: partData.environmentalConditions || '',
          // Media fields - populate from database if available
          imageUrl: partData.imageUrl || '',
          imageUrls: Array.isArray(partData.imageUrls) ? partData.imageUrls : [],
          diyVideoUrl: partData.diyVideoUrl || '',
          installationVideos: Array.isArray(partData.installationVideos) ? partData.installationVideos : [],
          technicalDrawings: Array.isArray(partData.technicalDrawings) ? partData.technicalDrawings : []
        });
      } else {
        // Fallback to basic part data if API call fails
        setPartForm({
          code: part.code,
          name: part.name,
          partNumber: part.partNumber || '',
          category: part.category || '',
          subCategory: part.subCategory || '',
          price: part.price.toString(),
          costPrice: part.costPrice?.toString() || '',
          weight: part.weight?.toString() || '',
          length: part.length?.toString() || '',
          breadth: part.breadth?.toString() || '',
          height: part.height?.toString() || '',
          minStockLevel: part.minStockLevel.toString(),
          maxStockLevel: part.maxStockLevel?.toString() || '',
          reorderPoint: part.reorderPoint?.toString() || '',
          reorderQty: part.reorderQty?.toString() || '',
          warranty: part.warranty?.toString() || '',
          specifications: part.specifications || '',
          tags: part.tags || '',
          featured: part.featured,
          isActive: part.isActive,
          // Enhanced AI-optimized fields - defaults
          problemKeywords: '',
          symptoms: '',
          compatibleAppliances: '',
          installationDifficulty: 'MEDIUM',
          commonFailureReasons: '',
          troubleshootingSteps: '',
          relatedParts: '',
          seasonalDemand: '',
          urgencyLevel: 'MEDIUM',
          customerDescription: '',
          technicalSpecs: '',
          safetyWarnings: '',
          maintenanceInterval: '',
          lifespan: '',
          environmentalConditions: '',
          // Media fields - defaults
          imageUrl: '',
          imageUrls: [],
          diyVideoUrl: '',
          installationVideos: [],
          technicalDrawings: []
        });
      }
    } catch (error) {
      console.error('Error fetching part details:', error);
      toast({
        title: "Warning",
        description: "Could not load all part details. Some fields may be empty.",
        variant: "destructive"
      });
      
      // Fallback to basic part data
      setPartForm({
        code: part.code,
        name: part.name,
        partNumber: part.partNumber || '',
        category: part.category || '',
        subCategory: part.subCategory || '',
        price: part.price.toString(),
        costPrice: part.costPrice?.toString() || '',
        weight: part.weight?.toString() || '',
        length: part.length?.toString() || '',
        breadth: part.breadth?.toString() || '',
        height: part.height?.toString() || '',
        minStockLevel: part.minStockLevel.toString(),
        maxStockLevel: part.maxStockLevel?.toString() || '',
        reorderPoint: part.reorderPoint?.toString() || '',
        reorderQty: part.reorderQty?.toString() || '',
        warranty: part.warranty?.toString() || '',
        specifications: part.specifications || '',
        tags: part.tags || '',
        featured: part.featured,
        isActive: part.isActive,
        // Enhanced AI-optimized fields - defaults
        problemKeywords: '',
        symptoms: '',
        compatibleAppliances: '',
        installationDifficulty: 'MEDIUM',
        commonFailureReasons: '',
        troubleshootingSteps: '',
        relatedParts: '',
        seasonalDemand: '',
        urgencyLevel: 'MEDIUM',
        customerDescription: '',
        technicalSpecs: '',
        safetyWarnings: '',
        maintenanceInterval: '',
        lifespan: '',
        environmentalConditions: '',
        // Media fields - defaults
        imageUrl: '',
        imageUrls: [],
        diyVideoUrl: '',
        installationVideos: [],
        technicalDrawings: []
      });
    }
    
    setShowEditPartDialog(true);
  };

  const prepareEditLocation = (location: Location) => {
    setSelectedLocation(location);
    setLocationForm({
      code: location.code,
      name: location.name,
      type: location.type,
      zone: location.zone || '',
      aisle: location.aisle || '',
      rack: location.rack || '',
      shelf: location.shelf || '',
      bin: location.bin || '',
      capacity: location.capacity?.toString() || '',
      temperature: location.temperature?.toString() || '',
      humidity: location.humidity?.toString() || '',
      securityLevel: location.securityLevel || '',
      accessRestricted: location.accessRestricted || false,
      address: location.address || '',
      coordinates: location.coordinates || '',
      manager: location.manager || '',
      contact: location.contact || '',
      notes: location.notes || ''
    });
    setShowEditLocationDialog(true);
  };

  const prepareEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierForm({
      code: supplier.code,
      name: supplier.name,
      type: supplier.type,
      rating: supplier.rating.toString(),
      reliability: supplier.reliability.toString(),
      leadTime: supplier.leadTime.toString(),
      paymentTerms: supplier.paymentTerms,
      currency: supplier.currency,
      taxId: supplier.taxId || '',
      contactPerson: supplier.contact.person,
      contactEmail: supplier.contact.email,
      contactPhone: supplier.contact.phone,
      contactAddress: supplier.contact.address,
      certifications: supplier.certifications.join(', ')
    });
    setShowEditSupplierDialog(true);
  };

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    if (!inventory || inventory.length === 0) {
      return [];
    }

    return inventory.filter(item => {
      // Enhanced search functionality
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        item.part?.name?.toLowerCase().includes(searchLower) ||
        item.part?.code?.toLowerCase().includes(searchLower) ||
        item.part?.partNumber?.toLowerCase().includes(searchLower) ||
        item.part?.category?.toLowerCase().includes(searchLower) ||
        item.part?.subCategory?.toLowerCase().includes(searchLower) ||
        item.part?.tags?.toLowerCase().includes(searchLower) ||
        item.location?.name?.toLowerCase().includes(searchLower) ||
        item.location?.code?.toLowerCase().includes(searchLower) ||
        item.supplier?.name?.toLowerCase().includes(searchLower);

      const matchesLocation = filters.location === 'all' || item.locationId === filters.location;
      const matchesCategory = filters.category === 'all' || item.part?.category === filters.category;
      const matchesSupplier = filters.supplier === 'all' || item.supplierId === filters.supplier;
      
      let matchesStatus = true;
      if (filters.status === 'low_stock') {
        matchesStatus = item.onHandQuantity <= (item.part?.minStockLevel || 0);
      } else if (filters.status === 'out_of_stock') {
        matchesStatus = item.onHandQuantity === 0;
      } else if (filters.status === 'overstock') {
        matchesStatus = item.part?.maxStockLevel ? item.onHandQuantity > item.part.maxStockLevel : false;
      } else if (filters.status === 'in_stock') {
        matchesStatus = item.onHandQuantity > 0;
      }

      return matchesSearch && matchesLocation && matchesCategory && matchesSupplier && matchesStatus;
    });
  }, [inventory, searchTerm, filters]);

  // Get stock status
  const getStockStatus = (item: InventoryItem) => {
    if (item.onHandQuantity === 0) {
      return { status: 'out-of-stock', color: 'destructive', text: 'Out of Stock', icon: AlertTriangle };
    } else if (item.onHandQuantity <= item.part.minStockLevel) {
      return { status: 'low-stock', color: 'destructive', text: 'Low Stock', icon: TrendingUp };
    } else if (item.part.maxStockLevel && item.onHandQuantity >= item.part.maxStockLevel) {
      return { status: 'overstock', color: 'secondary', text: 'Overstock', icon: TrendingUp };
    } else {
      return { status: 'in-stock', color: 'default', text: 'In Stock', icon: CheckCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Inventory Management System...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Database className="h-6 w-6" />
                <span>Comprehensive Inventory Management</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Complete inventory management with parts catalog, locations, suppliers, and stock tracking
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={fetchData} variant="outline" className="border-blue-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Parts</p>
                  <p className="text-2xl font-bold text-blue-900">{parts.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Locations</p>
                  <p className="text-2xl font-bold text-blue-900">{locations.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Suppliers</p>
                  <p className="text-2xl font-bold text-blue-900">{suppliers.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ₹{inventory.reduce((sum, item) => sum + (item.onHandQuantity * item.part.price), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="parts" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Parts Catalog</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center space-x-2">
            <Warehouse className="h-4 w-4" />
            <span>Live Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Locations</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Suppliers</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common inventory management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setShowAddPartDialog(true)}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <PackagePlus className="h-6 w-6" />
                    <span>Add Part</span>
                  </Button>
                  <Button 
                    onClick={() => setShowAddLocationDialog(true)}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <MapPinPlus className="h-6 w-6" />
                    <span>Add Location</span>
                  </Button>
                  <Button 
                    onClick={() => setShowAddSupplierDialog(true)}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <UserPlus className="h-6 w-6" />
                    <span>Add Supplier</span>
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Upload className="h-6 w-6" />
                    <span>Bulk Import</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest inventory movements and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventory.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Package className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{item.part.name}</p>
                          <p className="text-xs text-muted-foreground">Stock: {item.onHandQuantity}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.location.name}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Stock Alerts</span>
              </CardTitle>
              <CardDescription>Items requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inventory
                  .filter(item => item.onHandQuantity <= item.part.minStockLevel)
                  .slice(0, 5)
                  .map((item, index) => (
                    <Alert key={index} className="border-red-200">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-center">
                          <div>
                            <strong>{item.part.name}</strong> is running low
                            <p className="text-sm text-muted-foreground">
                              Current: {item.onHandQuantity} | Min: {item.part.minStockLevel}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Reorder
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                {inventory.filter(item => item.onHandQuantity <= item.part.minStockLevel).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>All parts are adequately stocked!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parts Catalog Tab */}
        <TabsContent value="parts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Parts Catalog ({parts.length})</CardTitle>
                  <CardDescription>Manage your spare parts catalog</CardDescription>
                </div>
                <Button onClick={() => setShowAddPartDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Part
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search parts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(new Set(parts.map(p => p.category).filter(Boolean))).map(category => (
                      <SelectItem key={category} value={category!}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parts Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Info</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock Levels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts
                    .filter(part => 
                      !searchTerm || 
                      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      part.code.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .filter(part => filters.category === 'all' || part.category === filters.category)
                    .map((part) => (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{part.name}</p>
                              <p className="text-sm text-muted-foreground">{part.code}</p>
                              {part.partNumber && (
                                <p className="text-xs text-muted-foreground">SKU: {part.partNumber}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{part.category || 'Uncategorized'}</p>
                            {part.subCategory && (
                              <p className="text-sm text-muted-foreground">{part.subCategory}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">₹{part.price.toFixed(2)}</p>
                            {part.costPrice && (
                              <p className="text-sm text-muted-foreground">Cost: ₹{part.costPrice.toFixed(2)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>Min: {part.minStockLevel}</p>
                            {part.maxStockLevel && <p>Max: {part.maxStockLevel}</p>}
                            {part.reorderPoint && <p>Reorder: {part.reorderPoint}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={part.isActive ? 'default' : 'secondary'}>
                              {part.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {part.featured && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => prepareEditPart(part)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {parts.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Parts Found</h3>
                  <p className="text-muted-foreground mb-4">Start building your parts catalog by adding your first spare part.</p>
                  <Button onClick={() => setShowAddPartDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Part
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Live Inventory ({filteredInventory.length})</CardTitle>
                  <CardDescription>Real-time stock levels and locations</CardDescription>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/debug/comprehensive-tv-test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        if (response.ok) {
                          toast({
                            title: "Success",
                            description: "TV Power Supply Board test data created successfully"
                          });
                          fetchData(); // Refresh the data
                        } else {
                          throw new Error('Failed to create test data');
                        }
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to create test data",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Add TV Test Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search inventory..."
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
                    {locations.map(location => (
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
              </div>

              {/* Inventory Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Quantities</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Last Updated</TableHead>
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
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.location.name}</p>
                            <p className="text-sm text-muted-foreground">{item.location.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StockIcon className="w-4 h-4" />
                            <Badge variant={stockStatus.color as any}>
                              {stockStatus.text}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
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
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              ₹{(item.onHandQuantity * item.part.price).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @ ₹{item.part.price.toFixed(2)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.lastRestocked ? (
                              <p>{new Date(item.lastRestocked).toLocaleDateString()}</p>
                            ) : (
                              <p className="text-muted-foreground">Never</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedInventoryItem(item);
                                setShowStockAdjustmentDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <History className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredInventory.length === 0 && (
                <div className="text-center py-12">
                  <Warehouse className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Inventory Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {inventory.length === 0 
                      ? "Start by adding parts to your catalog and setting up locations."
                      : "No items match your current filters."
                    }
                  </p>
                  {inventory.length === 0 && (
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => setShowAddPartDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Parts
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddLocationDialog(true)}>
                        <MapPinPlus className="h-4 w-4 mr-2" />
                        Add Locations
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Storage Locations ({locations.length})</CardTitle>
                  <CardDescription>Manage your storage locations and warehouses</CardDescription>
                </div>
                <Button onClick={() => setShowAddLocationDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((location) => (
                  <Card key={location.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-lg">{location.name}</CardTitle>
                        </div>
                        <Badge variant={location.active ? 'default' : 'secondary'}>
                          {location.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <CardDescription>{location.code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium">Type</p>
                          <p className="text-sm text-muted-foreground">{location.type}</p>
                        </div>
                        
                        {location.zone && (
                          <div>
                            <p className="text-sm font-medium">Location Details</p>
                            <p className="text-sm text-muted-foreground">
                              Zone: {location.zone}
                              {location.aisle && ` • Aisle: ${location.aisle}`}
                              {location.rack && ` • Rack: ${location.rack}`}
                            </p>
                          </div>
                        )}

                        {location.capacity && (
                          <div>
                            <p className="text-sm font-medium">Capacity</p>
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={(location.currentUtilization || 0) / location.capacity * 100} 
                                className="flex-1 h-2" 
                              />
                              <span className="text-xs text-muted-foreground">
                                {location.currentUtilization || 0}/{location.capacity}
                              </span>
                            </div>
                          </div>
                        )}

                        {(location.temperature || location.humidity) && (
                          <div>
                            <p className="text-sm font-medium">Environment</p>
                            <p className="text-sm text-muted-foreground">
                              {location.temperature && `${location.temperature}°C`}
                              {location.temperature && location.humidity && ' • '}
                              {location.humidity && `${location.humidity}% RH`}
                            </p>
                          </div>
                        )}

                        {location.manager && (
                          <div>
                            <p className="text-sm font-medium">Manager</p>
                            <p className="text-sm text-muted-foreground">{location.manager}</p>
                            {location.contact && (
                              <p className="text-xs text-muted-foreground">{location.contact}</p>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => prepareEditLocation(location)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                          {location.accessRestricted && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Restricted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {locations.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Locations Found</h3>
                  <p className="text-muted-foreground mb-4">Set up your storage locations to start managing inventory.</p>
                  <Button onClick={() => setShowAddLocationDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Location
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Suppliers ({suppliers.length})</CardTitle>
                  <CardDescription>Manage your supplier network</CardDescription>
                </div>
                <Button onClick={() => setShowAddSupplierDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {suppliers.map((supplier) => (
                  <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-purple-600" />
                          <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        </div>
                        <Badge variant={supplier.active ? 'default' : 'secondary'}>
                          {supplier.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <CardDescription>{supplier.code} • {supplier.type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Rating</p>
                            <div className="flex items-center space-x-1">
                              <div className="flex">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-3 h-3 ${
                                      i < Math.floor(supplier.rating) 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`} 
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {supplier.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Lead Time</p>
                            <p className="text-sm text-muted-foreground">{supplier.leadTime} days</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium">Contact</p>
                          <p className="text-sm text-muted-foreground">{supplier.contact.person}</p>
                          <p className="text-xs text-muted-foreground">{supplier.contact.email}</p>
                          <p className="text-xs text-muted-foreground">{supplier.contact.phone}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium">Performance</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span>On-time:</span>
                              <span>{supplier.performance.onTimeDelivery}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Quality:</span>
                              <span>{supplier.performance.qualityRating.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Price:</span>
                              <span>{supplier.performance.priceCompetitiveness.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Response:</span>
                              <span>{supplier.performance.responsiveness.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>

                        {supplier.certifications.length > 0 && (
                          <div>
                            <p className="text-sm font-medium">Certifications</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {supplier.certifications.slice(0, 3).map((cert, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {cert}
                                </Badge>
                              ))}
                              {supplier.certifications.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{supplier.certifications.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => prepareEditSupplier(supplier)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reliability: {supplier.reliability}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {suppliers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Suppliers Found</h3>
                  <p className="text-muted-foreground mb-4">Build your supplier network to manage procurement efficiently.</p>
                  <Button onClick={() => setShowAddSupplierDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Supplier
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Add Part Dialog with AI-Optimized Fields */}
      <Dialog open={showAddPartDialog} onOpenChange={setShowAddPartDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span>Add New Part - AI-Enhanced</span>
            </DialogTitle>
            <DialogDescription>
              Create a new part with comprehensive details including technical specifications, pricing, and media. 
              Weight supports both kg and g units. Enhanced with AI-powered search optimization.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="media">Media & Videos</TabsTrigger>
              <TabsTrigger value="ai-search">AI Search Data</TabsTrigger>
              <TabsTrigger value="technical">Technical Specs</TabsTrigger>
              <TabsTrigger value="business">Business Info</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Basic Information</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="code">Part Code *</Label>
                      <Input
                        id="code"
                        value={partForm.code}
                        onChange={(e) => setPartForm(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="e.g., PART001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Part Name *</Label>
                      <Input
                        id="name"
                        value={partForm.name}
                        onChange={(e) => setPartForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., TV Power Supply Board"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partNumber">Part Number / SKU</Label>
                      <Input
                        id="partNumber"
                        value={partForm.partNumber}
                        onChange={(e) => setPartForm(prev => ({ ...prev, partNumber: e.target.value }))}
                        placeholder="e.g., SKU123456"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={partForm.category}
                          onChange={(e) => setPartForm(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="e.g., Electronics"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subCategory">Sub Category</Label>
                        <Input
                          id="subCategory"
                          value={partForm.subCategory}
                          onChange={(e) => setPartForm(prev => ({ ...prev, subCategory: e.target.value }))}
                          placeholder="e.g., Power Supply"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Pricing & Stock</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="price">Selling Price *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={partForm.price}
                          onChange={(e) => setPartForm(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="costPrice">Cost Price</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          step="0.01"
                          value={partForm.costPrice}
                          onChange={(e) => setPartForm(prev => ({ ...prev, costPrice: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="minStockLevel">Min Stock *</Label>
                        <Input
                          id="minStockLevel"
                          type="number"
                          value={partForm.minStockLevel}
                          onChange={(e) => setPartForm(prev => ({ ...prev, minStockLevel: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxStockLevel">Max Stock</Label>
                        <Input
                          id="maxStockLevel"
                          type="number"
                          value={partForm.maxStockLevel}
                          onChange={(e) => setPartForm(prev => ({ ...prev, maxStockLevel: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reorderPoint">Reorder Point</Label>
                        <Input
                          id="reorderPoint"
                          type="number"
                          value={partForm.reorderPoint}
                          onChange={(e) => setPartForm(prev => ({ ...prev, reorderPoint: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="warranty">Warranty (months)</Label>
                        <Input
                          id="warranty"
                          type="number"
                          value={partForm.warranty}
                          onChange={(e) => setPartForm(prev => ({ ...prev, warranty: e.target.value }))}
                          placeholder="12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lifespan">Expected Lifespan</Label>
                        <Input
                          id="lifespan"
                          value={partForm.lifespan}
                          onChange={(e) => setPartForm(prev => ({ ...prev, lifespan: e.target.value }))}
                          placeholder="e.g., 5-7 years"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Ruler className="h-4 w-4" />
                  <span>Physical Properties</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="weight">Weight (kg/g)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.001"
                      value={partForm.weight}
                      onChange={(e) => setPartForm(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="0.500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length">Length (cm)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.1"
                      value={partForm.length}
                      onChange={(e) => setPartForm(prev => ({ ...prev, length: e.target.value }))}
                      placeholder="15.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="breadth">Width (cm)</Label>
                    <Input
                      id="breadth"
                      type="number"
                      step="0.1"
                      value={partForm.breadth}
                      onChange={(e) => setPartForm(prev => ({ ...prev, breadth: e.target.value }))}
                      placeholder="10.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={partForm.height}
                      onChange={(e) => setPartForm(prev => ({ ...prev, height: e.target.value }))}
                      placeholder="3.0"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Media & Videos Tab */}
            <TabsContent value="media" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Image className="h-4 w-4 text-green-600" />
                    <span>Product Images</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="imageUrl">Main Product Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="imageUrl"
                          value={partForm.imageUrl}
                          onChange={(e) => setPartForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Primary image shown in search results and product listings
                      </p>
                    </div>

                    <div>
                      <Label>Additional Product Images</Label>
                      <div className="space-y-2">
                        {partForm.imageUrls.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...partForm.imageUrls];
                                newUrls[index] = e.target.value;
                                setPartForm(prev => ({ ...prev, imageUrls: newUrls }));
                              }}
                              placeholder="https://example.com/image.jpg"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newUrls = partForm.imageUrls.filter((_, i) => i !== index);
                                setPartForm(prev => ({ ...prev, imageUrls: newUrls }));
                              }}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }))}
                        >
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Add Image
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Multiple angles, close-ups, and detail shots
                      </p>
                    </div>

                    <div>
                      <Label>Technical Drawings & Diagrams</Label>
                      <div className="space-y-2">
                        {partForm.technicalDrawings.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...partForm.technicalDrawings];
                                newUrls[index] = e.target.value;
                                setPartForm(prev => ({ ...prev, technicalDrawings: newUrls }));
                              }}
                              placeholder="https://example.com/diagram.jpg"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newUrls = partForm.technicalDrawings.filter((_, i) => i !== index);
                                setPartForm(prev => ({ ...prev, technicalDrawings: newUrls }));
                              }}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartForm(prev => ({ ...prev, technicalDrawings: [...prev.technicalDrawings, ''] }))}
                        >
                          <FileImage className="w-4 h-4 mr-2" />
                          Add Drawing
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Wiring diagrams, schematics, and technical illustrations
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Video className="h-4 w-4 text-purple-600" />
                    <span>DIY & Installation Videos</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="diyVideoUrl">Main DIY Video URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="diyVideoUrl"
                          value={partForm.diyVideoUrl}
                          onChange={(e) => setPartForm(prev => ({ ...prev, diyVideoUrl: e.target.value }))}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        <Button variant="outline" size="sm">
                          <Link className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Primary DIY installation or repair video for customers
                      </p>
                    </div>

                    <div>
                      <Label>Additional Installation Videos</Label>
                      <div className="space-y-2">
                        {partForm.installationVideos.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...partForm.installationVideos];
                                newUrls[index] = e.target.value;
                                setPartForm(prev => ({ ...prev, installationVideos: newUrls }));
                              }}
                              placeholder="https://youtube.com/watch?v=..."
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newUrls = partForm.installationVideos.filter((_, i) => i !== index);
                                setPartForm(prev => ({ ...prev, installationVideos: newUrls }));
                              }}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartForm(prev => ({ ...prev, installationVideos: [...prev.installationVideos, ''] }))}
                        >
                          <VideoIcon className="w-4 h-4 mr-2" />
                          Add Video
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Step-by-step installation guides, troubleshooting videos
                      </p>
                    </div>

                    <Alert>
                      <PlayCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Video Guidelines:</strong>
                        <ul className="text-xs mt-2 space-y-1">
                          <li>• YouTube, Vimeo, or direct video file URLs supported</li>
                          <li>• Keep videos under 10 minutes for better engagement</li>
                          <li>• Include clear audio instructions</li>
                          <li>• Show safety precautions prominently</li>
                          <li>• Test videos on mobile devices</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span>Media Preview</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Main Image Preview */}
                  {partForm.imageUrl && (
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">Main Image</p>
                      <div className="aspect-square bg-muted rounded flex items-center justify-center">
                        <img 
                          src={partForm.imageUrl} 
                          alt="Main product" 
                          className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                        <div className="hidden items-center justify-center text-muted-foreground">
                          <Image className="w-8 h-8" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DIY Video Preview */}
                  {partForm.diyVideoUrl && (
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">DIY Video</p>
                      <div className="aspect-video bg-muted rounded flex items-center justify-center">
                        <div className="text-center">
                          <PlayCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Video Preview</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Images Count */}
                  {partForm.imageUrls.filter(url => url.trim()).length > 0 && (
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">Additional Media</p>
                      <div className="aspect-square bg-muted rounded flex items-center justify-center">
                        <div className="text-center">
                          <FileImage className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {partForm.imageUrls.filter(url => url.trim()).length} Images
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {partForm.installationVideos.filter(url => url.trim()).length} Videos
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {partForm.technicalDrawings.filter(url => url.trim()).length} Drawings
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* AI Search Data Tab */}
            <TabsContent value="ai-search" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span>AI Search Optimization</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="problemKeywords">Problem Keywords *</Label>
                      <Input
                        id="problemKeywords"
                        value={partForm.problemKeywords}
                        onChange={(e) => setPartForm(prev => ({ ...prev, problemKeywords: e.target.value }))}
                        placeholder="e.g., no power, not turning on, dead, blank screen"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Keywords customers use when describing problems this part solves
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="symptoms">Common Symptoms</Label>
                      <Textarea
                        id="symptoms"
                        value={partForm.symptoms}
                        onChange={(e) => setPartForm(prev => ({ ...prev, symptoms: e.target.value }))}
                        placeholder="e.g., TV won't turn on, no display, power LED not working, clicking sound from TV"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Detailed symptoms that indicate this part needs replacement
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="compatibleAppliances">Compatible Appliances</Label>
                      <Input
                        id="compatibleAppliances"
                        value={partForm.compatibleAppliances}
                        onChange={(e) => setPartForm(prev => ({ ...prev, compatibleAppliances: e.target.value }))}
                        placeholder="e.g., LED TV, LCD TV, Smart TV, 32-55 inch TVs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerDescription">Customer-Friendly Description</Label>
                      <Textarea
                        id="customerDescription"
                        value={partForm.customerDescription}
                        onChange={(e) => setPartForm(prev => ({ ...prev, customerDescription: e.target.value }))}
                        placeholder="e.g., This power supply board provides electricity to your TV. If your TV won't turn on or has power issues, this part likely needs replacement."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <span>Problem Resolution</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="commonFailureReasons">Common Failure Reasons</Label>
                      <Textarea
                        id="commonFailureReasons"
                        value={partForm.commonFailureReasons}
                        onChange={(e) => setPartForm(prev => ({ ...prev, commonFailureReasons: e.target.value }))}
                        placeholder="e.g., Power surges, age-related component failure, overheating, voltage fluctuations"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="troubleshootingSteps">Troubleshooting Steps</Label>
                      <Textarea
                        id="troubleshootingSteps"
                        value={partForm.troubleshootingSteps}
                        onChange={(e) => setPartForm(prev => ({ ...prev, troubleshootingSteps: e.target.value }))}
                        placeholder="e.g., 1. Check power cable, 2. Test with different outlet, 3. Look for burnt components on board, 4. Check fuses"
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="urgencyLevel">Urgency Level</Label>
                        <Select value={partForm.urgencyLevel} onValueChange={(value) => setPartForm(prev => ({ ...prev, urgencyLevel: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low - Cosmetic/Optional</SelectItem>
                            <SelectItem value="MEDIUM">Medium - Affects Function</SelectItem>
                            <SelectItem value="HIGH">High - Critical Component</SelectItem>
                            <SelectItem value="CRITICAL">Critical - Safety Issue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="installationDifficulty">Installation Difficulty</Label>
                        <Select value={partForm.installationDifficulty} onValueChange={(value) => setPartForm(prev => ({ ...prev, installationDifficulty: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EASY">Easy - DIY Friendly</SelectItem>
                            <SelectItem value="MEDIUM">Medium - Some Experience</SelectItem>
                            <SelectItem value="HARD">Hard - Professional Recommended</SelectItem>
                            <SelectItem value="EXPERT">Expert - Specialist Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Technical Specifications Tab */}
            <TabsContent value="technical" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Technical Specifications</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="technicalSpecs">Technical Specifications</Label>
                      <Textarea
                        id="technicalSpecs"
                        value={partForm.technicalSpecs}
                        onChange={(e) => setPartForm(prev => ({ ...prev, technicalSpecs: e.target.value }))}
                        placeholder="e.g., Input: AC 100-240V, Output: DC 12V 5A, Power: 60W, Efficiency: >85%"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="specifications">Detailed Specifications</Label>
                      <Textarea
                        id="specifications"
                        value={partForm.specifications}
                        onChange={(e) => setPartForm(prev => ({ ...prev, specifications: e.target.value }))}
                        placeholder="Comprehensive technical details, model compatibility, certifications..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="environmentalConditions">Environmental Conditions</Label>
                      <Textarea
                        id="environmentalConditions"
                        value={partForm.environmentalConditions}
                        onChange={(e) => setPartForm(prev => ({ ...prev, environmentalConditions: e.target.value }))}
                        placeholder="e.g., Operating temp: 0-40°C, Humidity: 10-90% RH, Storage: -20 to 60°C"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    <span>Safety & Maintenance</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="safetyWarnings">Safety Warnings</Label>
                      <Textarea
                        id="safetyWarnings"
                        value={partForm.safetyWarnings}
                        onChange={(e) => setPartForm(prev => ({ ...prev, safetyWarnings: e.target.value }))}
                        placeholder="e.g., Disconnect power before installation, Handle with anti-static precautions, Professional installation recommended"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenanceInterval">Maintenance Interval</Label>
                      <Input
                        id="maintenanceInterval"
                        value={partForm.maintenanceInterval}
                        onChange={(e) => setPartForm(prev => ({ ...prev, maintenanceInterval: e.target.value }))}
                        placeholder="e.g., Check annually, Clean every 6 months"
                      />
                    </div>
                    <div>
                      <Label htmlFor="relatedParts">Related Parts</Label>
                      <Input
                        id="relatedParts"
                        value={partForm.relatedParts}
                        onChange={(e) => setPartForm(prev => ({ ...prev, relatedParts: e.target.value }))}
                        placeholder="e.g., Main board, T-con board, Backlight strips"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Business Information Tab */}
            <TabsContent value="business" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Business Intelligence</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="seasonalDemand">Seasonal Demand Pattern</Label>
                      <Input
                        id="seasonalDemand"
                        value={partForm.seasonalDemand}
                        onChange={(e) => setPartForm(prev => ({ ...prev, seasonalDemand: e.target.value }))}
                        placeholder="e.g., Higher in summer (AC season), Peak during festivals"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tags">Search Tags</Label>
                      <Input
                        id="tags"
                        value={partForm.tags}
                        onChange={(e) => setPartForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="e.g., power, supply, board, TV, electronics, repair"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Comma-separated tags for better searchability
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="featured"
                          checked={partForm.featured}
                          onCheckedChange={(checked) => setPartForm(prev => ({ ...prev, featured: !!checked }))}
                        />
                        <Label htmlFor="featured">Featured Part</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={partForm.isActive}
                          onCheckedChange={(checked) => setPartForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span>AI Search Preview</span>
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">How customers will find this part:</p>
                    <div className="space-y-1 text-xs">
                      <p><strong>Problem:</strong> "{partForm.problemKeywords || 'TV not turning on'}"</p>
                      <p><strong>Symptoms:</strong> {partForm.symptoms ? partForm.symptoms.substring(0, 60) + '...' : 'No display, power issues...'}</p>
                      <p><strong>Solution:</strong> {partForm.name || 'TV Power Supply Board'}</p>
                      <p><strong>Difficulty:</strong> <Badge variant="outline" className="text-xs">{partForm.installationDifficulty}</Badge></p>
                      <p><strong>Urgency:</strong> <Badge variant="outline" className="text-xs">{partForm.urgencyLevel}</Badge></p>
                    </div>
                  </div>
                  
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertDescription>
                      <strong>AI Enhancement:</strong> The more detailed information you provide, the better our AI can match this part to customer problems and provide accurate recommendations.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowAddPartDialog(false);
              resetPartForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddPart} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Add Part with AI Enhancement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={showEditPartDialog} onOpenChange={setShowEditPartDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-blue-600" />
              <span>Edit Part - {selectedPart?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Update part information with comprehensive details including technical specifications, pricing, and media.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="media">Media & Videos</TabsTrigger>
              <TabsTrigger value="ai-search">AI Search Data</TabsTrigger>
              <TabsTrigger value="technical">Technical Specs</TabsTrigger>
              <TabsTrigger value="business">Business Info</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Basic Information</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-code">Part Code *</Label>
                      <Input
                        id="edit-code"
                        value={partForm.code}
                        onChange={(e) => setPartForm(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="e.g., PART001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-name">Part Name *</Label>
                      <Input
                        id="edit-name"
                        value={partForm.name}
                        onChange={(e) => setPartForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., TV Power Supply Board"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-partNumber">Part Number / SKU</Label>
                      <Input
                        id="edit-partNumber"
                        value={partForm.partNumber}
                        onChange={(e) => setPartForm(prev => ({ ...prev, partNumber: e.target.value }))}
                        placeholder="e.g., SKU123456"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-category">Category</Label>
                        <Input
                          id="edit-category"
                          value={partForm.category}
                          onChange={(e) => setPartForm(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="e.g., Electronics"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-subCategory">Sub Category</Label>
                        <Input
                          id="edit-subCategory"
                          value={partForm.subCategory}
                          onChange={(e) => setPartForm(prev => ({ ...prev, subCategory: e.target.value }))}
                          placeholder="e.g., Power Supply"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Pricing & Stock</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-price">Selling Price *</Label>
                        <Input
                          id="edit-price"
                          type="number"
                          step="0.01"
                          value={partForm.price}
                          onChange={(e) => setPartForm(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-costPrice">Cost Price</Label>
                        <Input
                          id="edit-costPrice"
                          type="number"
                          step="0.01"
                          value={partForm.costPrice}
                          onChange={(e) => setPartForm(prev => ({ ...prev, costPrice: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="edit-minStockLevel">Min Stock *</Label>
                        <Input
                          id="edit-minStockLevel"
                          type="number"
                          value={partForm.minStockLevel}
                          onChange={(e) => setPartForm(prev => ({ ...prev, minStockLevel: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-maxStockLevel">Max Stock</Label>
                        <Input
                          id="edit-maxStockLevel"
                          type="number"
                          value={partForm.maxStockLevel}
                          onChange={(e) => setPartForm(prev => ({ ...prev, maxStockLevel: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-reorderPoint">Reorder Point</Label>
                        <Input
                          id="edit-reorderPoint"
                          type="number"
                          value={partForm.reorderPoint}
                          onChange={(e) => setPartForm(prev => ({ ...prev, reorderPoint: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Media & Videos Tab - Edit Mode */}
            <TabsContent value="media" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Image className="h-4 w-4 text-green-600" />
                    <span>Product Images</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-imageUrl">Main Product Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="edit-imageUrl"
                          value={partForm.imageUrl}
                          onChange={(e) => setPartForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Additional Product Images</Label>
                      <div className="space-y-2">
                        {partForm.imageUrls.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...partForm.imageUrls];
                                newUrls[index] = e.target.value;
                                setPartForm(prev => ({ ...prev, imageUrls: newUrls }));
                              }}
                              placeholder="https://example.com/image.jpg"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newUrls = partForm.imageUrls.filter((_, i) => i !== index);
                                setPartForm(prev => ({ ...prev, imageUrls: newUrls }));
                              }}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }))}
                        >
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Add Image
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Video className="h-4 w-4 text-purple-600" />
                    <span>DIY & Installation Videos</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-diyVideoUrl">Main DIY Video URL</Label>
                      <Input
                        id="edit-diyVideoUrl"
                        value={partForm.diyVideoUrl}
                        onChange={(e) => setPartForm(prev => ({ ...prev, diyVideoUrl: e.target.value }))}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>

                    <div>
                      <Label>Additional Installation Videos</Label>
                      <div className="space-y-2">
                        {partForm.installationVideos.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...partForm.installationVideos];
                                newUrls[index] = e.target.value;
                                setPartForm(prev => ({ ...prev, installationVideos: newUrls }));
                              }}
                              placeholder="https://youtube.com/watch?v=..."
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newUrls = partForm.installationVideos.filter((_, i) => i !== index);
                                setPartForm(prev => ({ ...prev, installationVideos: newUrls }));
                              }}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartForm(prev => ({ ...prev, installationVideos: [...prev.installationVideos, ''] }))}
                        >
                          <VideoIcon className="w-4 h-4 mr-2" />
                          Add Video
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* AI Search Data Tab - Edit Mode */}
            <TabsContent value="ai-search" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span>AI Search Optimization</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-problemKeywords">Problem Keywords</Label>
                      <Input
                        id="edit-problemKeywords"
                        value={partForm.problemKeywords}
                        onChange={(e) => setPartForm(prev => ({ ...prev, problemKeywords: e.target.value }))}
                        placeholder="e.g., no power, not turning on, dead, blank screen"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-symptoms">Common Symptoms</Label>
                      <Textarea
                        id="edit-symptoms"
                        value={partForm.symptoms}
                        onChange={(e) => setPartForm(prev => ({ ...prev, symptoms: e.target.value }))}
                        placeholder="e.g., TV won't turn on, no display, power LED not working"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-compatibleAppliances">Compatible Appliances</Label>
                      <Input
                        id="edit-compatibleAppliances"
                        value={partForm.compatibleAppliances}
                        onChange={(e) => setPartForm(prev => ({ ...prev, compatibleAppliances: e.target.value }))}
                        placeholder="e.g., LED TV, LCD TV, Smart TV"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <span>Problem Resolution</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-troubleshootingSteps">Troubleshooting Steps</Label>
                      <Textarea
                        id="edit-troubleshootingSteps"
                        value={partForm.troubleshootingSteps}
                        onChange={(e) => setPartForm(prev => ({ ...prev, troubleshootingSteps: e.target.value }))}
                        placeholder="e.g., 1. Check power cable, 2. Test with different outlet"
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-urgencyLevel">Urgency Level</Label>
                        <Select value={partForm.urgencyLevel} onValueChange={(value) => setPartForm(prev => ({ ...prev, urgencyLevel: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-installationDifficulty">Installation Difficulty</Label>
                        <Select value={partForm.installationDifficulty} onValueChange={(value) => setPartForm(prev => ({ ...prev, installationDifficulty: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EASY">Easy</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HARD">Hard</SelectItem>
                            <SelectItem value="EXPERT">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Technical Specifications Tab - Edit Mode */}
            <TabsContent value="technical" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Technical Specifications</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-technicalSpecs">Technical Specifications</Label>
                      <Textarea
                        id="edit-technicalSpecs"
                        value={partForm.technicalSpecs}
                        onChange={(e) => setPartForm(prev => ({ ...prev, technicalSpecs: e.target.value }))}
                        placeholder="e.g., Input: AC 100-240V, Output: DC 12V 5A"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-specifications">Detailed Specifications</Label>
                      <Textarea
                        id="edit-specifications"
                        value={partForm.specifications}
                        onChange={(e) => setPartForm(prev => ({ ...prev, specifications: e.target.value }))}
                        placeholder="Comprehensive technical details..."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    <span>Safety & Maintenance</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-safetyWarnings">Safety Warnings</Label>
                      <Textarea
                        id="edit-safetyWarnings"
                        value={partForm.safetyWarnings}
                        onChange={(e) => setPartForm(prev => ({ ...prev, safetyWarnings: e.target.value }))}
                        placeholder="e.g., Disconnect power before installation"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-maintenanceInterval">Maintenance Interval</Label>
                      <Input
                        id="edit-maintenanceInterval"
                        value={partForm.maintenanceInterval}
                        onChange={(e) => setPartForm(prev => ({ ...prev, maintenanceInterval: e.target.value }))}
                        placeholder="e.g., Check annually"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Business Information Tab - Edit Mode */}
            <TabsContent value="business" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Business Intelligence</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-seasonalDemand">Seasonal Demand Pattern</Label>
                      <Input
                        id="edit-seasonalDemand"
                        value={partForm.seasonalDemand}
                        onChange={(e) => setPartForm(prev => ({ ...prev, seasonalDemand: e.target.value }))}
                        placeholder="e.g., Higher in summer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-tags">Search Tags</Label>
                      <Input
                        id="edit-tags"
                        value={partForm.tags}
                        onChange={(e) => setPartForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="e.g., power, supply, board, TV"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit-featured"
                          checked={partForm.featured}
                          onCheckedChange={(checked) => setPartForm(prev => ({ ...prev, featured: !!checked }))}
                        />
                        <Label htmlFor="edit-featured">Featured Part</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-isActive"
                          checked={partForm.isActive}
                          onCheckedChange={(checked) => setPartForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="edit-isActive">Active</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span>AI Search Preview</span>
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">How customers will find this part:</p>
                    <div className="space-y-1 text-xs">
                      <p><strong>Problem:</strong> "{partForm.problemKeywords || 'TV not turning on'}"</p>
                      <p><strong>Symptoms:</strong> {partForm.symptoms ? partForm.symptoms.substring(0, 60) + '...' : 'No display, power issues...'}</p>
                      <p><strong>Solution:</strong> {partForm.name || 'TV Power Supply Board'}</p>
                      <p><strong>Difficulty:</strong> <Badge variant="outline" className="text-xs">{partForm.installationDifficulty}</Badge></p>
                      <p><strong>Urgency:</strong> <Badge variant="outline" className="text-xs">{partForm.urgencyLevel}</Badge></p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowEditPartDialog(false);
              setSelectedPart(null);
              resetPartForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditPart} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Update Part
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPinPlus className="h-5 w-5 text-green-600" />
              <span>Add New Location</span>
            </DialogTitle>
            <DialogDescription>
              Create a new storage location for inventory management
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="location-code">Location Code *</Label>
                <Input
                  id="location-code"
                  value={locationForm.code}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., WH001"
                />
              </div>
              <div>
                <Label htmlFor="location-name">Location Name *</Label>
                <Input
                  id="location-name"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Warehouse"
                />
              </div>
              <div>
                <Label htmlFor="location-type">Type</Label>
                <Select value={locationForm.type} onValueChange={(value) => setLocationForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
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
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="location-manager">Manager</Label>
                <Input
                  id="location-manager"
                  value={locationForm.manager}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, manager: e.target.value }))}
                  placeholder="Manager name"
                />
              </div>
              <div>
                <Label htmlFor="location-contact">Contact</Label>
                <Input
                  id="location-contact"
                  value={locationForm.contact}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="Phone/Email"
                />
              </div>
              <div>
                <Label htmlFor="location-capacity">Capacity</Label>
                <Input
                  id="location-capacity"
                  type="number"
                  value={locationForm.capacity}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="Maximum capacity"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowAddLocationDialog(false);
              resetLocationForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddLocation}>
              <Save className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-purple-600" />
              <span>Add New Supplier</span>
            </DialogTitle>
            <DialogDescription>
              Add a new supplier to your network
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="supplier-code">Supplier Code *</Label>
                <Input
                  id="supplier-code"
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., SUP001"
                />
              </div>
              <div>
                <Label htmlFor="supplier-name">Supplier Name *</Label>
                <Input
                  id="supplier-name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., ABC Electronics"
                />
              </div>
              <div>
                <Label htmlFor="supplier-type">Type</Label>
                <Select value={supplierForm.type} onValueChange={(value) => setSupplierForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                    <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                    <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                    <SelectItem value="RETAILER">Retailer</SelectItem>
                    <SelectItem value="SERVICE_PROVIDER">Service Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supplier-leadTime">Lead Time (days)</Label>
                <Input
                  id="supplier-leadTime"
                  type="number"
                  value={supplierForm.leadTime}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, leadTime: e.target.value }))}
                  placeholder="7"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="supplier-contactPerson">Contact Person</Label>
                <Input
                  id="supplier-contactPerson"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <Label htmlFor="supplier-contactEmail">Email</Label>
                <Input
                  id="supplier-contactEmail"
                  type="email"
                  value={supplierForm.contactEmail}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@supplier.com"
                />
              </div>
              <div>
                <Label htmlFor="supplier-contactPhone">Phone</Label>
                <Input
                  id="supplier-contactPhone"
                  value={supplierForm.contactPhone}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <Label htmlFor="supplier-paymentTerms">Payment Terms</Label>
                <Input
                  id="supplier-paymentTerms"
                  value={supplierForm.paymentTerms}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  placeholder="e.g., Net 30"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowAddSupplierDialog(false);
              resetSupplierForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddSupplier}>
              <Save className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-green-600" />
              <span>Edit Location - {selectedLocation?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Update storage location information
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-location-code">Location Code *</Label>
                <Input
                  id="edit-location-code"
                  value={locationForm.code}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., WH001"
                />
              </div>
              <div>
                <Label htmlFor="edit-location-name">Location Name *</Label>
                <Input
                  id="edit-location-name"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Warehouse"
                />
              </div>
              <div>
                <Label htmlFor="edit-location-type">Type</Label>
                <Select value={locationForm.type} onValueChange={(value) => setLocationForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-location-zone">Zone</Label>
                  <Input
                    id="edit-location-zone"
                    value={locationForm.zone}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, zone: e.target.value }))}
                    placeholder="Zone A"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-location-aisle">Aisle</Label>
                  <Input
                    id="edit-location-aisle"
                    value={locationForm.aisle}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, aisle: e.target.value }))}
                    placeholder="A1"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-location-manager">Manager</Label>
                <Input
                  id="edit-location-manager"
                  value={locationForm.manager}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, manager: e.target.value }))}
                  placeholder="Manager name"
                />
              </div>
              <div>
                <Label htmlFor="edit-location-contact">Contact</Label>
                <Input
                  id="edit-location-contact"
                  value={locationForm.contact}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="Phone/Email"
                />
              </div>
              <div>
                <Label htmlFor="edit-location-capacity">Capacity</Label>
                <Input
                  id="edit-location-capacity"
                  type="number"
                  value={locationForm.capacity}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="Maximum capacity"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-location-temperature">Temperature (°C)</Label>
                  <Input
                    id="edit-location-temperature"
                    type="number"
                    step="0.1"
                    value={locationForm.temperature}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, temperature: e.target.value }))}
                    placeholder="25.0"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-location-humidity">Humidity (%)</Label>
                  <Input
                    id="edit-location-humidity"
                    type="number"
                    step="0.1"
                    value={locationForm.humidity}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, humidity: e.target.value }))}
                    placeholder="60.0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-location-address">Address</Label>
              <Textarea
                id="edit-location-address"
                value={locationForm.address}
                onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address of the location"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-location-notes">Notes</Label>
              <Textarea
                id="edit-location-notes"
                value={locationForm.notes}
                onChange={(e) => setLocationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this location"
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-location-accessRestricted"
                checked={locationForm.accessRestricted}
                onCheckedChange={(checked) => setLocationForm(prev => ({ ...prev, accessRestricted: !!checked }))}
              />
              <Label htmlFor="edit-location-accessRestricted">Access Restricted</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowEditLocationDialog(false);
              setSelectedLocation(null);
              resetLocationForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditLocation}>
              <Save className="w-4 h-4 mr-2" />
              Update Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={showEditSupplierDialog} onOpenChange={setShowEditSupplierDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-purple-600" />
              <span>Edit Supplier - {selectedSupplier?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Update supplier information and contact details
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-supplier-code">Supplier Code *</Label>
                <Input
                  id="edit-supplier-code"
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., SUP001"
                />
              </div>
              <div>
                <Label htmlFor="edit-supplier-name">Supplier Name *</Label>
                <Input
                  id="edit-supplier-name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., ABC Electronics"
                />
              </div>
              <div>
                <Label htmlFor="edit-supplier-type">Type</Label>
                <Select value={supplierForm.type} onValueChange={(value) => setSupplierForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                    <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                    <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                    <SelectItem value="RETAILER">Retailer</SelectItem>
                    <SelectItem value="SERVICE_PROVIDER">Service Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-supplier-rating">Rating (1-5)</Label>
                  <Input
                    id="edit-supplier-rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={supplierForm.rating}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, rating: e.target.value }))}
                    placeholder="4.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-supplier-reliability">Reliability (%)</Label>
                  <Input
                    id="edit-supplier-reliability"
                    type="number"
                    min="0"
                    max="100"
                    value={supplierForm.reliability}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, reliability: e.target.value }))}
                    placeholder="95"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-supplier-leadTime">Lead Time (days)</Label>
                <Input
                  id="edit-supplier-leadTime"
                  type="number"
                  value={supplierForm.leadTime}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, leadTime: e.target.value }))}
                  placeholder="7"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-supplier-contactPerson">Contact Person</Label>
                <Input
                  id="edit-supplier-contactPerson"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <Label htmlFor="edit-supplier-contactEmail">Email</Label>
                <Input
                  id="edit-supplier-contactEmail"
                  type="email"
                  value={supplierForm.contactEmail}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@supplier.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-supplier-contactPhone">Phone</Label>
                <Input
                  id="edit-supplier-contactPhone"
                  value={supplierForm.contactPhone}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <Label htmlFor="edit-supplier-contactAddress">Address</Label>
                <Textarea
                  id="edit-supplier-contactAddress"
                  value={supplierForm.contactAddress}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactAddress: e.target.value }))}
                  placeholder="Supplier address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-supplier-paymentTerms">Payment Terms</Label>
                  <Input
                    id="edit-supplier-paymentTerms"
                    value={supplierForm.paymentTerms}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="e.g., Net 30"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-supplier-currency">Currency</Label>
                  <Select value={supplierForm.currency} onValueChange={(value) => setSupplierForm(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-supplier-taxId">Tax ID</Label>
              <Input
                id="edit-supplier-taxId"
                value={supplierForm.taxId}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, taxId: e.target.value }))}
                placeholder="Tax identification number"
              />
            </div>
            <div>
              <Label htmlFor="edit-supplier-certifications">Certifications</Label>
              <Input
                id="edit-supplier-certifications"
                value={supplierForm.certifications}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, certifications: e.target.value }))}
                placeholder="ISO 9001, CE, RoHS (comma-separated)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter certifications separated by commas
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowEditSupplierDialog(false);
              setSelectedSupplier(null);
              resetSupplierForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditSupplier}>
              <Save className="w-4 h-4 mr-2" />
              Update Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockAdjustmentDialog} onOpenChange={setShowStockAdjustmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-orange-600" />
              <span>Stock Adjustment</span>
            </DialogTitle>
            <DialogDescription>
              Adjust stock levels for {selectedInventoryItem?.part?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="adjustment-type">Adjustment Type</Label>
              <Select value={stockAdjustmentForm.adjustmentType} onValueChange={(value) => setStockAdjustmentForm(prev => ({ ...prev, adjustmentType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Add Stock</SelectItem>
                  <SelectItem value="REMOVE">Remove Stock</SelectItem>
                  <SelectItem value="SET">Set Stock Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="adjustment-quantity">Quantity</Label>
              <Input
                id="adjustment-quantity"
                type="number"
                value={stockAdjustmentForm.quantity}
                onChange={(e) => setStockAdjustmentForm(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
              />
            </div>
            
            <div>
              <Label htmlFor="adjustment-reason">Reason</Label>
              <Select value={stockAdjustmentForm.reason} onValueChange={(value) => setStockAdjustmentForm(prev => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTOCK">Restock</SelectItem>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                  <SelectItem value="THEFT">Theft</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                  <SelectItem value="CORRECTION">Correction</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="adjustment-notes">Notes</Label>
              <Textarea
                id="adjustment-notes"
                value={stockAdjustmentForm.notes}
                onChange={(e) => setStockAdjustmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowStockAdjustmentDialog(false);
              setSelectedInventoryItem(null);
              setStockAdjustmentForm({
                adjustmentType: 'ADD',
                quantity: '',
                reason: '',
                notes: ''
              });
            }}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjustment}>
              <Save className="w-4 h-4 mr-2" />
              Apply Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComprehensiveInventoryManager;