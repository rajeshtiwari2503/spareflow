import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Upload, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText,
  Image,
  Video,
  Ruler,
  Weight,
  DollarSign,
  Package2,
  Archive,
  Star,
  Copy,
  ExternalLink,
  History,
  Settings,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Part {
  id: string;
  code: string;
  name: string;
  description?: string;
  partNumber?: string;
  brandModel?: string;
  category?: string;
  subCategory?: string;
  material?: string;
  compatibility?: string;
  price: number;
  costPrice?: number;
  sellingPrice?: number;
  weight?: number;
  length?: number;
  breadth?: number;
  height?: number;
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  reorderQty?: number;
  warranty?: number;
  imageUrl?: string;
  imageUrls?: string;
  technicalDrawings?: string;
  installationVideos?: string;
  diyVideoUrl?: string;
  tags?: string;
  specifications?: string;
  status: string;
  featured: boolean;
  isActive: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  brand?: {
    id: string;
    name: string;
  };
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  notes?: string;
  previousQty: number;
  newQty: number;
  createdBy?: string;
  createdAt: string;
}

interface FixedEnhancedInventoryManagerProps {
  brandId: string;
  onPartCreated?: (part: Part) => void;
  onPartUpdated?: (part: Part) => void;
}

// Categories constant to prevent re-creation
const CATEGORIES = [
  'Electronics', 'Mechanical', 'Electrical', 'Hardware', 'Software',
  'Automotive', 'Industrial', 'Consumer', 'Medical', 'Aerospace'
];

// Initial form state to prevent re-creation
const INITIAL_FORM_DATA = {
  code: '',
  name: '',
  description: '',
  partNumber: '',
  brandModel: '',
  category: '',
  subCategory: '',
  material: '',
  compatibility: '',
  price: 0,
  costPrice: 0,
  sellingPrice: 0,
  weight: 0,
  length: 0,
  breadth: 0,
  height: 0,
  stockQuantity: 0,
  minStockLevel: 5,
  maxStockLevel: 100,
  reorderPoint: 10,
  reorderQty: 50,
  warranty: 12,
  imageUrl: '',
  imageUrls: '',
  technicalDrawings: '',
  installationVideos: '',
  diyVideoUrl: '',
  tags: '',
  specifications: '',
  status: 'draft',
  featured: false
};

// Helper function to format weight display
const formatWeight = (weight?: number): string => {
  if (!weight || weight === 0) return '0g';
  
  if (weight >= 1) {
    return `${weight.toFixed(2)}kg`;
  } else {
    return `${(weight * 1000).toFixed(0)}g`;
  }
};

// Helper function to parse weight input (supports both kg and g)
const parseWeightInput = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  
  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return 0;
  
  // If the input contains 'g' but not 'kg', treat as grams
  if (value.toLowerCase().includes('g') && !value.toLowerCase().includes('kg')) {
    return numericValue / 1000; // Convert grams to kg
  }
  
  // Otherwise treat as kg
  return numericValue;
};

const FixedEnhancedInventoryManager: React.FC<FixedEnhancedInventoryManagerProps> = ({
  brandId,
  onPartCreated,
  onPartUpdated
}) => {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('manage');
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [formData, setFormData] = useState<Partial<Part>>(INITIAL_FORM_DATA);

  // Refs to prevent focus loss
  const formRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Stable callbacks to prevent re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleFilterStatusChange = useCallback((value: string) => {
    setFilterStatus(value);
  }, []);

  const handleFilterCategoryChange = useCallback((value: string) => {
    setFilterCategory(value);
  }, []);

  // Fetch parts data
  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/parts?brandId=${brandId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setParts(data.data || []);
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
    } finally {
      setLoading(false);
    }
  }, [brandId, toast]);

  // Fetch stock movements for a part
  const fetchStockMovements = useCallback(async (partId: string) => {
    try {
      const response = await fetch(`/api/parts/${partId}/stock-movements`);
      if (response.ok) {
        const data = await response.json();
        setStockMovements(data.movements || []);
      }
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Memoized filtered parts to prevent unnecessary re-calculations
  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      const matchesSearch = !searchTerm || 
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || part.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || part.category === filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [parts, searchTerm, filterStatus, filterCategory]);

  // Stable form field change handler with better state management
  const handleFormFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      // Prevent unnecessary re-renders if value hasn't changed
      if (prev[field as keyof Part] === value) {
        return prev;
      }
      return { ...prev, [field]: value };
    });
  }, []);

  // Fixed individual field handlers with stable references and no focus loss
  const createFieldHandler = useCallback((fieldName: string, parser?: (value: string) => any) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = parser ? parser(e.target.value) : e.target.value;
      handleFormFieldChange(fieldName, value);
    };
  }, [handleFormFieldChange]);

  // Create stable field handlers
  const fieldHandlers = useMemo(() => ({
    code: createFieldHandler('code'),
    name: createFieldHandler('name'),
    description: createFieldHandler('description'),
    partNumber: createFieldHandler('partNumber'),
    brandModel: createFieldHandler('brandModel'),
    category: (value: string) => handleFormFieldChange('category', value),
    subCategory: createFieldHandler('subCategory'),
    material: createFieldHandler('material'),
    compatibility: createFieldHandler('compatibility'),
    length: createFieldHandler('length', (value) => value === '' ? 0 : parseFloat(value) || 0),
    breadth: createFieldHandler('breadth', (value) => value === '' ? 0 : parseFloat(value) || 0),
    height: createFieldHandler('height', (value) => value === '' ? 0 : parseFloat(value) || 0),
    weight: createFieldHandler('weight', parseWeightInput),
    warranty: createFieldHandler('warranty', (value) => value === '' ? 0 : parseInt(value) || 0),
    specifications: createFieldHandler('specifications'),
    tags: createFieldHandler('tags'),
    costPrice: createFieldHandler('costPrice', (value) => value === '' ? 0 : parseFloat(value) || 0),
    price: createFieldHandler('price', (value) => value === '' ? 0 : parseFloat(value) || 0),
    sellingPrice: createFieldHandler('sellingPrice', (value) => value === '' ? 0 : parseFloat(value) || 0),
    stockQuantity: createFieldHandler('stockQuantity', (value) => value === '' ? 0 : parseInt(value) || 0),
    minStockLevel: createFieldHandler('minStockLevel', (value) => value === '' ? 5 : parseInt(value) || 5),
    maxStockLevel: createFieldHandler('maxStockLevel', (value) => value === '' ? 100 : parseInt(value) || 100),
    reorderPoint: createFieldHandler('reorderPoint', (value) => value === '' ? 10 : parseInt(value) || 10),
    reorderQty: createFieldHandler('reorderQty', (value) => value === '' ? 50 : parseInt(value) || 50),
    imageUrl: createFieldHandler('imageUrl'),
    imageUrls: createFieldHandler('imageUrls'),
    technicalDrawings: createFieldHandler('technicalDrawings'),
    installationVideos: createFieldHandler('installationVideos'),
    diyVideoUrl: createFieldHandler('diyVideoUrl'),
    status: (value: string) => handleFormFieldChange('status', value),
    featured: (checked: boolean) => handleFormFieldChange('featured', checked)
  }), [createFieldHandler, handleFormFieldChange]);

  // Handle form submission for new part
  const handleCreatePart = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brandId,
          status: formData.status || 'draft'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setParts(prev => [data.data, ...prev]);
        setShowAddDialog(false);
        setFormData(INITIAL_FORM_DATA);
        onPartCreated?.(data.data);
        toast({
          title: "Success",
          description: `Part "${data.data.code}" created successfully!`
        });
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create part');
      }
    } catch (error: any) {
      console.error('Error creating part:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create part",
        variant: "destructive"
      });
    }
  }, [formData, brandId, onPartCreated, toast]);

  // Handle part update
  const handleUpdatePart = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    try {
      const response = await fetch('/api/parts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPart.id,
          ...formData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setParts(prev => prev.map(p => p.id === editingPart.id ? data.data : p));
        setShowEditDialog(false);
        setEditingPart(null);
        setFormData(INITIAL_FORM_DATA);
        onPartUpdated?.(data.data);
        toast({
          title: "Success",
          description: `Part "${data.data.code}" updated successfully!`
        });
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update part');
      }
    } catch (error: any) {
      console.error('Error updating part:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update part",
        variant: "destructive"
      });
    }
  }, [editingPart, formData, onPartUpdated, toast]);

  // Handle stock adjustment
  const handleStockAdjustment = useCallback(async (partId: string, newQuantity: number, reason: string, notes?: string) => {
    try {
      const response = await fetch(`/api/parts/${partId}/stock-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newQuantity,
          reason,
          notes,
          createdBy: brandId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setParts(prev => prev.map(p => 
          p.id === partId ? { ...p, stockQuantity: newQuantity } : p
        ));
        toast({
          title: "Stock Updated",
          description: data.message
        });
        fetchStockMovements(partId);
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Failed to adjust stock');
      }
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive"
      });
    }
  }, [brandId, toast, fetchStockMovements]);

  // Handle bulk operations
  const handleBulkOperation = useCallback(async (operation: string) => {
    if (selectedParts.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select parts to perform bulk operations",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/parts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partIds: selectedParts,
          operation,
          brandId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (operation === 'export') {
          // Handle export - download CSV
          const csvContent = convertToCSV(data.data);
          downloadCSV(csvContent, `parts-export-${new Date().toISOString().split('T')[0]}.csv`);
        } else {
          // Refresh parts list for other operations
          fetchParts();
        }

        toast({
          title: "Success",
          description: data.message
        });
        setSelectedParts([]);
        setShowBulkDialog(false);
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Bulk operation failed');
      }
    } catch (error: any) {
      console.error('Error in bulk operation:', error);
      toast({
        title: "Error",
        description: error.message || "Bulk operation failed",
        variant: "destructive"
      });
    }
  }, [selectedParts, brandId, toast, fetchParts]);

  // Convert data to CSV
  const convertToCSV = useCallback((data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }, []);

  // Download CSV file
  const downloadCSV = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // Get stock status - memoized
  const getStockStatus = useCallback((part: Part) => {
    if (part.stockQuantity <= 0) return { status: 'out-of-stock', color: 'destructive', text: 'Out of Stock' };
    if (part.stockQuantity <= part.minStockLevel) return { status: 'low-stock', color: 'destructive', text: 'Low Stock' };
    if (part.maxStockLevel && part.stockQuantity >= part.maxStockLevel) return { status: 'overstock', color: 'secondary', text: 'Overstock' };
    return { status: 'in-stock', color: 'default', text: 'In Stock' };
  }, []);

  // Dialog handlers
  const handleCancelForm = useCallback(() => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setFormData(INITIAL_FORM_DATA);
    setEditingPart(null);
  }, []);

  const handleEditPart = useCallback((part: Part) => {
    setEditingPart(part);
    setFormData(part);
    setShowEditDialog(true);
  }, []);

  const handleStockManagement = useCallback((part: Part) => {
    setEditingPart(part);
    fetchStockMovements(part.id);
    setShowStockDialog(true);
  }, [fetchStockMovements]);

  const handleCopyPartCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Part code copied to clipboard"
    });
  }, [toast]);

  // Selection handlers
  const handleSelectAllParts = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedParts(filteredParts.map(p => p.id));
    } else {
      setSelectedParts([]);
    }
  }, [filteredParts]);

  const handleSelectPart = useCallback((partId: string, checked: boolean) => {
    if (checked) {
      setSelectedParts(prev => [...prev, partId]);
    } else {
      setSelectedParts(prev => prev.filter(id => id !== partId));
    }
  }, []);

  // Part form component - completely memoized to prevent re-renders
  const PartForm = useMemo(() => {
    const isEdit = !!editingPart;
    
    return (
      <form 
        ref={formRef}
        onSubmit={isEdit ? handleUpdatePart : handleCreatePart} 
        className="space-y-6"
        key={isEdit ? `edit-${editingPart?.id}` : 'add'}
      >
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
            <TabsTrigger value="media">Media & SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-code">Part Code *</Label>
                <Input
                  id="part-code"
                  value={formData.code || ''}
                  onChange={fieldHandlers.code}
                  placeholder="Enter unique part code"
                  required
                />
              </div>
              <div>
                <Label htmlFor="part-name">Part Name *</Label>
                <Input
                  id="part-name"
                  value={formData.name || ''}
                  onChange={fieldHandlers.name}
                  placeholder="Enter part name"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="part-description">Description</Label>
              <Textarea
                id="part-description"
                value={formData.description || ''}
                onChange={fieldHandlers.description}
                placeholder="Enter part description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-number">Part Number/SKU</Label>
                <Input
                  id="part-number"
                  value={formData.partNumber || ''}
                  onChange={fieldHandlers.partNumber}
                  placeholder="Alternative part number"
                />
              </div>
              <div>
                <Label htmlFor="brand-model">Brand Model</Label>
                <Input
                  id="brand-model"
                  value={formData.brandModel || ''}
                  onChange={fieldHandlers.brandModel}
                  placeholder="Compatible brand models"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-category">Category</Label>
                <Select value={formData.category || ''} onValueChange={fieldHandlers.category}>
                  <SelectTrigger id="part-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sub-category">Sub Category</Label>
                <Input
                  id="sub-category"
                  value={formData.subCategory || ''}
                  onChange={fieldHandlers.subCategory}
                  placeholder="Enter sub category"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-material">Material</Label>
                <Input
                  id="part-material"
                  value={formData.material || ''}
                  onChange={fieldHandlers.material}
                  placeholder="Material composition"
                />
              </div>
              <div>
                <Label htmlFor="part-compatibility">Compatibility</Label>
                <Input
                  id="part-compatibility"
                  value={formData.compatibility || ''}
                  onChange={fieldHandlers.compatibility}
                  placeholder="Compatibility information"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="part-length">Length (cm)</Label>
                <Input
                  id="part-length"
                  type="number"
                  step="0.1"
                  value={formData.length || ''}
                  onChange={fieldHandlers.length}
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="part-breadth">Breadth (cm)</Label>
                <Input
                  id="part-breadth"
                  type="number"
                  step="0.1"
                  value={formData.breadth || ''}
                  onChange={fieldHandlers.breadth}
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="part-height">Height (cm)</Label>
                <Input
                  id="part-height"
                  type="number"
                  step="0.1"
                  value={formData.height || ''}
                  onChange={fieldHandlers.height}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-weight">Weight (supports kg/g)</Label>
                <Input
                  id="part-weight"
                  type="text"
                  value={formData.weight ? (formData.weight >= 1 ? `${formData.weight}kg` : `${formData.weight * 1000}g`) : ''}
                  onChange={fieldHandlers.weight}
                  placeholder="1kg or 1000g"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter weight as "1kg" or "1000g". Values without unit are treated as kg.
                </p>
              </div>
              <div>
                <Label htmlFor="part-warranty">Warranty (months)</Label>
                <Input
                  id="part-warranty"
                  type="number"
                  value={formData.warranty || ''}
                  onChange={fieldHandlers.warranty}
                  placeholder="12"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="part-specifications">Technical Specifications (JSON)</Label>
              <Textarea
                id="part-specifications"
                value={formData.specifications || ''}
                onChange={fieldHandlers.specifications}
                placeholder='{"voltage": "12V", "current": "2A", "power": "24W"}'
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="part-tags">Tags (JSON Array)</Label>
              <Textarea
                id="part-tags"
                value={formData.tags || ''}
                onChange={fieldHandlers.tags}
                placeholder='["electronic", "automotive", "12v", "led"]'
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cost-price">Cost Price (₹)</Label>
                <Input
                  id="cost-price"
                  type="number"
                  step="0.01"
                  value={formData.costPrice || ''}
                  onChange={fieldHandlers.costPrice}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="selling-price">Selling Price (₹) *</Label>
                <Input
                  id="selling-price"
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={fieldHandlers.price}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="override-price">Override Price (₹)</Label>
                <Input
                  id="override-price"
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice || ''}
                  onChange={fieldHandlers.sellingPrice}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stock-quantity">Current Stock</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  value={formData.stockQuantity || ''}
                  onChange={fieldHandlers.stockQuantity}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="min-stock">Minimum Stock Level</Label>
                <Input
                  id="min-stock"
                  type="number"
                  value={formData.minStockLevel || ''}
                  onChange={fieldHandlers.minStockLevel}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max-stock">Maximum Stock Level</Label>
                <Input
                  id="max-stock"
                  type="number"
                  value={formData.maxStockLevel || ''}
                  onChange={fieldHandlers.maxStockLevel}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="reorder-point">Reorder Point</Label>
                <Input
                  id="reorder-point"
                  type="number"
                  value={formData.reorderPoint || ''}
                  onChange={fieldHandlers.reorderPoint}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="reorder-qty">Reorder Quantity</Label>
                <Input
                  id="reorder-qty"
                  type="number"
                  value={formData.reorderQty || ''}
                  onChange={fieldHandlers.reorderQty}
                  placeholder="50"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <div>
              <Label htmlFor="image-url">Primary Image URL</Label>
              <Input
                id="image-url"
                type="url"
                value={formData.imageUrl || ''}
                onChange={fieldHandlers.imageUrl}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="image-urls">Additional Images (JSON Array)</Label>
              <Textarea
                id="image-urls"
                value={formData.imageUrls || ''}
                onChange={fieldHandlers.imageUrls}
                placeholder='["https://example.com/image1.jpg", "https://example.com/image2.jpg"]'
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="technical-drawings">Technical Drawings (JSON Array)</Label>
              <Textarea
                id="technical-drawings"
                value={formData.technicalDrawings || ''}
                onChange={fieldHandlers.technicalDrawings}
                placeholder='["https://example.com/drawing1.pdf", "https://example.com/drawing2.pdf"]'
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="installation-videos">Installation Videos (JSON Array)</Label>
              <Textarea
                id="installation-videos"
                value={formData.installationVideos || ''}
                onChange={fieldHandlers.installationVideos}
                placeholder='["https://youtube.com/watch?v=xyz", "https://vimeo.com/123456"]'
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="diy-video">DIY Video URL</Label>
              <Input
                id="diy-video"
                type="url"
                value={formData.diyVideoUrl || ''}
                onChange={fieldHandlers.diyVideoUrl}
                placeholder="https://youtube.com/watch?v=xyz"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-status">Status</Label>
                <Select value={formData.status || 'draft'} onValueChange={fieldHandlers.status}>
                  <SelectTrigger id="part-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="featured-part"
                  checked={formData.featured || false}
                  onCheckedChange={fieldHandlers.featured}
                />
                <Label htmlFor="featured-part">Featured Part</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleCancelForm}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Update Part' : 'Create Part'}
          </Button>
        </div>
      </form>
    );
  }, [formData, editingPart, fieldHandlers, handleCreatePart, handleUpdatePart, handleCancelForm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Fixed Enhanced Inventory & Spare Catalog</span>
          </CardTitle>
          <CardDescription>
            Comprehensive inventory management with fixed weight display and no focus loss issues
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manage" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Manage Parts</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add New Part</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Stock Management</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Manage Parts Tab */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Parts Inventory</CardTitle>
                  <CardDescription>Manage your existing parts catalog with fixed weight display</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDialog(true)}
                    disabled={selectedParts.length === 0}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Bulk Actions ({selectedParts.length})
                  </Button>
                  <Button onClick={fetchParts} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search parts by name, code, or description..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={handleFilterStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={handleFilterCategoryChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parts Table */}
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading inventory...</p>
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No parts found matching your criteria</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setActiveTab('add')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Part
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedParts.length === filteredParts.length}
                            onCheckedChange={handleSelectAllParts}
                          />
                        </TableHead>
                        <TableHead>Part Info</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Stock Status</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParts.map((part) => {
                        const stockStatus = getStockStatus(part);
                        return (
                          <TableRow key={part.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedParts.includes(part.id)}
                                onCheckedChange={(checked) => handleSelectPart(part.id, !!checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                {part.imageUrl ? (
                                  <img 
                                    src={part.imageUrl} 
                                    alt={part.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                    <Package className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{part.name}</p>
                                  <p className="text-sm text-gray-500">{part.code}</p>
                                  {part.partNumber && (
                                    <p className="text-xs text-gray-400">SKU: {part.partNumber}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{part.category || 'Uncategorized'}</p>
                                {part.subCategory && (
                                  <p className="text-sm text-gray-500">{part.subCategory}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant={stockStatus.color as any}>
                                  {stockStatus.text}
                                </Badge>
                                <p className="text-sm text-gray-600">
                                  {part.stockQuantity} / {part.minStockLevel} min
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Weight className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{formatWeight(part.weight)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">₹{part.price.toFixed(2)}</p>
                                {part.costPrice && (
                                  <p className="text-sm text-gray-500">
                                    Cost: ₹{part.costPrice.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant={
                                  part.status === 'published' ? 'default' :
                                  part.status === 'draft' ? 'secondary' : 'outline'
                                }>
                                  {part.status}
                                </Badge>
                                {part.featured && (
                                  <Badge variant="outline" className="text-yellow-600">
                                    <Star className="w-3 h-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPart(part)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStockManagement(part)}
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyPartCode(part.code)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add New Part Tab */}
        <TabsContent value="add" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Part</CardTitle>
              <CardDescription>
                Create a new part with comprehensive details including technical specifications, pricing, and media. Weight supports both kg and g units.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {PartForm}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Management Tab */}
        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Low Stock Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parts.filter(p => p.stockQuantity <= p.minStockLevel).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No low stock alerts</p>
                ) : (
                  <div className="space-y-3">
                    {parts
                      .filter(p => p.stockQuantity <= p.minStockLevel)
                      .slice(0, 5)
                      .map(part => (
                        <div key={part.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{part.name}</p>
                            <p className="text-xs text-gray-600">{part.code}</p>
                            <p className="text-xs text-gray-500">Weight: {formatWeight(part.weight)}</p>
                          </div>
                          <Badge variant="destructive">
                            {part.stockQuantity}/{part.minStockLevel}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>Stock Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Parts</span>
                    <span className="font-medium">{parts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Stock</span>
                    <span className="font-medium text-green-600">
                      {parts.filter(p => p.stockQuantity > p.minStockLevel).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Stock</span>
                    <span className="font-medium text-red-600">
                      {parts.filter(p => p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Out of Stock</span>
                    <span className="font-medium text-red-600">
                      {parts.filter(p => p.stockQuantity === 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Value</span>
                    <span className="font-medium">
                      ₹{parts.reduce((sum, p) => sum + (p.stockQuantity * p.price), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Weight</span>
                    <span className="font-medium">
                      {formatWeight(parts.reduce((sum, p) => sum + ((p.weight || 0) * p.stockQuantity), 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package2 className="h-5 w-5 text-blue-500" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleBulkOperation('export')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export All Parts
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setActiveTab('add')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Part
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={fetchParts}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Stock Level</span>
                    <span className="font-medium">
                      {parts.length > 0 ? (parts.reduce((sum, p) => sum + p.stockQuantity, 0) / parts.length).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Weight per Part</span>
                    <span className="font-medium">
                      {parts.length > 0 ? formatWeight(parts.reduce((sum, p) => sum + (p.weight || 0), 0) / parts.length) : '0g'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Stock Turnover Rate</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Reorder Frequency</span>
                    <span className="font-medium">2.3x/month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {CATEGORIES.slice(0, 5).map(category => {
                    const count = parts.filter(p => p.category === category).length;
                    const totalWeight = parts
                      .filter(p => p.category === category)
                      .reduce((sum, p) => sum + ((p.weight || 0) * p.stockQuantity), 0);
                    return (
                      <div key={category} className="flex justify-between items-center">
                        <div>
                          <span>{category}</span>
                          <p className="text-xs text-gray-500">{formatWeight(totalWeight)}</p>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Part Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Part: {editingPart?.name}</DialogTitle>
            <DialogDescription>
              Update part information, pricing, and stock details. Weight supports both kg and g units.
            </DialogDescription>
          </DialogHeader>
          {PartForm}
        </DialogContent>
      </Dialog>

      {/* Stock Management Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock Management: {editingPart?.name}</DialogTitle>
            <DialogDescription>
              Adjust stock levels and view stock movement history. Current weight: {formatWeight(editingPart?.weight)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Current Stock</Label>
                <div className="text-2xl font-bold">{editingPart?.stockQuantity}</div>
              </div>
              <div>
                <Label>Minimum Level</Label>
                <div className="text-lg">{editingPart?.minStockLevel}</div>
              </div>
              <div>
                <Label>Part Weight</Label>
                <div className="text-lg">{formatWeight(editingPart?.weight)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Adjust Stock</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newQuantity">New Quantity</Label>
                  <Input
                    id="newQuantity"
                    type="number"
                    placeholder="Enter new stock quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restock">Restock</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="damage">Damage/Loss</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this stock adjustment"
                  rows={2}
                />
              </div>
              <Button 
                onClick={() => {
                  const newQuantity = parseInt((document.getElementById('newQuantity') as HTMLInputElement)?.value || '0');
                  const reason = 'Manual Adjustment'; // Get from select
                  const notes = (document.getElementById('notes') as HTMLTextAreaElement)?.value;
                  if (editingPart && newQuantity >= 0) {
                    handleStockAdjustment(editingPart.id, newQuantity, reason, notes);
                  }
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                Update Stock
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Recent Stock Movements</h4>
              {stockMovements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No stock movements recorded</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {stockMovements.map(movement => (
                    <div key={movement.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{movement.reason}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(movement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          movement.type === 'IN' ? 'text-green-600' : 
                          movement.type === 'OUT' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : '±'}{movement.quantity}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movement.previousQty} → {movement.newQty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Operations Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Operations</DialogTitle>
            <DialogDescription>
              Perform bulk actions on {selectedParts.length} selected parts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={() => handleBulkOperation('publish')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Publish
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkOperation('archive')}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkOperation('activate')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkOperation('deactivate')}
              >
                <X className="w-4 h-4 mr-2" />
                Deactivate
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkOperation('export')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleBulkOperation('delete')}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FixedEnhancedInventoryManager;