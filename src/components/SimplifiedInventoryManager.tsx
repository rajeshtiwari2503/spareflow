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
  Info,
  Zap,
  Brain
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
  imageUrls?: string[];
  technicalDrawings?: string[];
  installationVideos?: string[];
  diyVideoUrl?: string;
  tags?: string[];
  specifications?: Record<string, any>;
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

interface SimplifiedInventoryManagerProps {
  brandId: string;
  onPartCreated?: (part: Part) => void;
  onPartUpdated?: (part: Part) => void;
}

// Categories constant
const CATEGORIES = [
  'Electronics', 'Mechanical', 'Electrical', 'Hardware', 'Software',
  'Automotive', 'Industrial', 'Consumer', 'Medical', 'Aerospace'
];

// Initial form state
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

const SimplifiedInventoryManager: React.FC<SimplifiedInventoryManagerProps> = ({
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
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [formData, setFormData] = useState<any>(INITIAL_FORM_DATA);
  const [formMode, setFormMode] = useState<'simple' | 'advanced'>('simple');

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

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Filtered parts
  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchTerm || 
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || part.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || part.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Form field change handler with focus preservation
  const handleFormFieldChange = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  // Handle form submission for new part
  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Process form data to handle arrays and objects properly
      const processedData = {
        ...formData,
        brandId,
        status: formData.status || 'draft',
        // Convert string arrays to actual arrays
        imageUrls: formData.imageUrls ? 
          (typeof formData.imageUrls === 'string' ? 
            formData.imageUrls.split(',').map((url: string) => url.trim()).filter(Boolean) : 
            formData.imageUrls) : [],
        technicalDrawings: formData.technicalDrawings ? 
          (typeof formData.technicalDrawings === 'string' ? 
            formData.technicalDrawings.split(',').map((url: string) => url.trim()).filter(Boolean) : 
            formData.technicalDrawings) : [],
        installationVideos: formData.installationVideos ? 
          (typeof formData.installationVideos === 'string' ? 
            formData.installationVideos.split(',').map((url: string) => url.trim()).filter(Boolean) : 
            formData.installationVideos) : [],
        tags: formData.tags ? 
          (typeof formData.tags === 'string' ? 
            formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : 
            formData.tags) : [],
        // Parse specifications if it's a string
        specifications: formData.specifications ? 
          (typeof formData.specifications === 'string' ? 
            (() => {
              try {
                return JSON.parse(formData.specifications);
              } catch {
                // If JSON parsing fails, create a simple object
                return { description: formData.specifications };
              }
            })() : 
            formData.specifications) : {}
      };

      const response = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData)
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
  };

  // Handle part update
  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    try {
      // Process form data similar to create
      const processedData = {
        id: editingPart.id,
        ...formData,
        imageUrls: formData.imageUrls ? 
          (typeof formData.imageUrls === 'string' ? 
            formData.imageUrls.split(',').map((url: string) => url.trim()).filter(Boolean) : 
            formData.imageUrls) : [],
        technicalDrawings: formData.technicalDrawings ? 
          (typeof formData.technicalDrawings === 'string' ? 
            formData.technicalDrawings.split(',').map((url: string) => url.trim()).filter(Boolean) : 
            formData.technicalDrawings) : [],
        installationVideos: formData.installationVideos ? 
          (typeof formData.installationVideos === 'string' ? 
            formData.installationVideos.split(',').map((url: string) => url.trim()).filter(Boolean) : 
            formData.installationVideos) : [],
        tags: formData.tags ? 
          (typeof formData.tags === 'string' ? 
            formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : 
            formData.tags) : [],
        specifications: formData.specifications ? 
          (typeof formData.specifications === 'string' ? 
            (() => {
              try {
                return JSON.parse(formData.specifications);
              } catch {
                return { description: formData.specifications };
              }
            })() : 
            formData.specifications) : {}
      };

      const response = await fetch('/api/parts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData)
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
  };

  // Get stock status
  const getStockStatus = (part: Part) => {
    if (part.stockQuantity <= 0) return { status: 'out-of-stock', color: 'destructive', text: 'Out of Stock' };
    if (part.stockQuantity <= part.minStockLevel) return { status: 'low-stock', color: 'destructive', text: 'Low Stock' };
    if (part.maxStockLevel && part.stockQuantity >= part.maxStockLevel) return { status: 'overstock', color: 'secondary', text: 'Overstock' };
    return { status: 'in-stock', color: 'default', text: 'In Stock' };
  };

  // Dialog handlers
  const handleCancelForm = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setFormData(INITIAL_FORM_DATA);
    setEditingPart(null);
  };

  const handleEditPart = (part: Part) => {
    setEditingPart(part);
    // Convert arrays back to strings for form display
    setFormData({
      ...part,
      imageUrls: Array.isArray(part.imageUrls) ? part.imageUrls.join(', ') : (part.imageUrls || ''),
      technicalDrawings: Array.isArray(part.technicalDrawings) ? part.technicalDrawings.join(', ') : (part.technicalDrawings || ''),
      installationVideos: Array.isArray(part.installationVideos) ? part.installationVideos.join(', ') : (part.installationVideos || ''),
      tags: Array.isArray(part.tags) ? part.tags.join(', ') : (part.tags || ''),
      specifications: typeof part.specifications === 'object' ? JSON.stringify(part.specifications, null, 2) : (part.specifications || '')
    });
    setShowEditDialog(true);
  };

  const handleCopyPartCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Part code copied to clipboard"
    });
  };

  // Selection handlers
  const handleSelectAllParts = (checked: boolean) => {
    if (checked) {
      setSelectedParts(filteredParts.map(p => p.id));
    } else {
      setSelectedParts([]);
    }
  };

  const handleSelectPart = (partId: string, checked: boolean) => {
    if (checked) {
      setSelectedParts(prev => [...prev, partId]);
    } else {
      setSelectedParts(prev => prev.filter(id => id !== partId));
    }
  };

  // Smart form component
  const SmartPartForm = ({ isEdit = false }) => (
    <form onSubmit={isEdit ? handleUpdatePart : handleCreatePart} className="space-y-6">
      {/* Form Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant={formMode === 'simple' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormMode('simple')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Simple Mode
          </Button>
          <Button
            type="button"
            variant={formMode === 'advanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormMode('advanced')}
          >
            <Brain className="w-4 h-4 mr-2" />
            Advanced Mode
          </Button>
        </div>
        <Badge variant="outline">
          {formMode === 'simple' ? 'Easy Entry' : 'Full Features'}
        </Badge>
      </div>

      {formMode === 'simple' ? (
        // Simple Mode - Essential fields only
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Simple Mode:</strong> Enter only the essential information. Advanced features like JSON arrays are handled automatically.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part-code">Part Code *</Label>
              <Input
                id="part-code"
                value={formData.code || ''}
                onChange={(e) => handleFormFieldChange('code', e.target.value)}
                placeholder="Enter unique part code"
                required
              />
            </div>
            <div>
              <Label htmlFor="part-name">Part Name *</Label>
              <Input
                id="part-name"
                value={formData.name || ''}
                onChange={(e) => handleFormFieldChange('name', e.target.value)}
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
              onChange={(e) => handleFormFieldChange('description', e.target.value)}
              placeholder="Enter part description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part-category">Category</Label>
              <Select value={formData.category || ''} onValueChange={(value) => handleFormFieldChange('category', value)}>
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
              <Label htmlFor="selling-price">Selling Price (₹) *</Label>
              <Input
                id="selling-price"
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => handleFormFieldChange('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="stock-quantity">Current Stock</Label>
              <Input
                id="stock-quantity"
                type="number"
                value={formData.stockQuantity || ''}
                onChange={(e) => handleFormFieldChange('stockQuantity', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="min-stock">Minimum Stock Level</Label>
              <Input
                id="min-stock"
                type="number"
                value={formData.minStockLevel || ''}
                onChange={(e) => handleFormFieldChange('minStockLevel', parseInt(e.target.value) || 5)}
                placeholder="5"
              />
            </div>
            <div>
              <Label htmlFor="part-weight">Weight (kg)</Label>
              <Input
                id="part-weight"
                type="number"
                step="0.01"
                value={formData.weight || ''}
                onChange={(e) => handleFormFieldChange('weight', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                type="url"
                value={formData.imageUrl || ''}
                onChange={(e) => handleFormFieldChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="part-status">Status</Label>
              <Select value={formData.status || 'draft'} onValueChange={(value) => handleFormFieldChange('status', value)}>
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
          </div>

          {/* Simple array inputs */}
          <div>
            <Label htmlFor="simple-tags">Tags (comma-separated)</Label>
            <Input
              id="simple-tags"
              value={formData.tags || ''}
              onChange={(e) => handleFormFieldChange('tags', e.target.value)}
              placeholder="electronic, automotive, 12v, led"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
          </div>

          <div>
            <Label htmlFor="simple-images">Additional Images (comma-separated URLs)</Label>
            <Textarea
              id="simple-images"
              value={formData.imageUrls || ''}
              onChange={(e) => handleFormFieldChange('imageUrls', e.target.value)}
              placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple URLs with commas</p>
          </div>
        </div>
      ) : (
        // Advanced Mode - All fields with JSON support
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
            <TabsTrigger value="media">Media & Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${formMode}-part-code`}>Part Code *</Label>
                <Input
                  id={`${formMode}-part-code`}
                  value={formData.code || ''}
                  onChange={(e) => handleFormFieldChange('code', e.target.value)}
                  placeholder="Enter unique part code"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`${formMode}-part-name`}>Part Name *</Label>
                <Input
                  id={`${formMode}-part-name`}
                  value={formData.name || ''}
                  onChange={(e) => handleFormFieldChange('name', e.target.value)}
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
                onChange={(e) => handleFormFieldChange('description', e.target.value)}
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
                  onChange={(e) => handleFormFieldChange('partNumber', e.target.value)}
                  placeholder="Alternative part number"
                />
              </div>
              <div>
                <Label htmlFor="brand-model">Brand Model</Label>
                <Input
                  id="brand-model"
                  value={formData.brandModel || ''}
                  onChange={(e) => handleFormFieldChange('brandModel', e.target.value)}
                  placeholder="Compatible brand models"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-category">Category</Label>
                <Select value={formData.category || ''} onValueChange={(value) => handleFormFieldChange('category', value)}>
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
                  onChange={(e) => handleFormFieldChange('subCategory', e.target.value)}
                  placeholder="Enter sub category"
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
                  onChange={(e) => handleFormFieldChange('length', parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => handleFormFieldChange('breadth', parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => handleFormFieldChange('height', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-weight">Weight (kg)</Label>
                <Input
                  id="part-weight"
                  type="number"
                  step="0.01"
                  value={formData.weight || ''}
                  onChange={(e) => handleFormFieldChange('weight', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="part-warranty">Warranty (months)</Label>
                <Input
                  id="part-warranty"
                  type="number"
                  value={formData.warranty || ''}
                  onChange={(e) => handleFormFieldChange('warranty', parseInt(e.target.value) || 0)}
                  placeholder="12"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="part-specifications">Technical Specifications (JSON or Text)</Label>
              <Textarea
                id="part-specifications"
                value={formData.specifications || ''}
                onChange={(e) => handleFormFieldChange('specifications', e.target.value)}
                placeholder='{"voltage": "12V", "current": "2A", "power": "24W"} or simple text description'
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter as JSON object for structured data or plain text for simple description
              </p>
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
                  onChange={(e) => handleFormFieldChange('costPrice', parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => handleFormFieldChange('price', parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => handleFormFieldChange('sellingPrice', parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => handleFormFieldChange('stockQuantity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="min-stock">Minimum Stock Level</Label>
                <Input
                  id="min-stock"
                  type="number"
                  value={formData.minStockLevel || ''}
                  onChange={(e) => handleFormFieldChange('minStockLevel', parseInt(e.target.value) || 5)}
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
                  onChange={(e) => handleFormFieldChange('maxStockLevel', parseInt(e.target.value) || 100)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="reorder-point">Reorder Point</Label>
                <Input
                  id="reorder-point"
                  type="number"
                  value={formData.reorderPoint || ''}
                  onChange={(e) => handleFormFieldChange('reorderPoint', parseInt(e.target.value) || 10)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="reorder-qty">Reorder Quantity</Label>
                <Input
                  id="reorder-qty"
                  type="number"
                  value={formData.reorderQty || ''}
                  onChange={(e) => handleFormFieldChange('reorderQty', parseInt(e.target.value) || 50)}
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
                onChange={(e) => handleFormFieldChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="image-urls">Additional Images (comma-separated URLs)</Label>
              <Textarea
                id="image-urls"
                value={formData.imageUrls || ''}
                onChange={(e) => handleFormFieldChange('imageUrls', e.target.value)}
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple URLs with commas</p>
            </div>

            <div>
              <Label htmlFor="technical-drawings">Technical Drawings (comma-separated URLs)</Label>
              <Textarea
                id="technical-drawings"
                value={formData.technicalDrawings || ''}
                onChange={(e) => handleFormFieldChange('technicalDrawings', e.target.value)}
                placeholder="https://example.com/drawing1.pdf, https://example.com/drawing2.pdf"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="installation-videos">Installation Videos (comma-separated URLs)</Label>
              <Textarea
                id="installation-videos"
                value={formData.installationVideos || ''}
                onChange={(e) => handleFormFieldChange('installationVideos', e.target.value)}
                placeholder="https://youtube.com/watch?v=xyz, https://vimeo.com/123456"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="diy-video">DIY Video URL</Label>
              <Input
                id="diy-video"
                type="url"
                value={formData.diyVideoUrl || ''}
                onChange={(e) => handleFormFieldChange('diyVideoUrl', e.target.value)}
                placeholder="https://youtube.com/watch?v=xyz"
              />
            </div>

            <div>
              <Label htmlFor="part-tags">Tags (comma-separated)</Label>
              <Textarea
                id="part-tags"
                value={formData.tags || ''}
                onChange={(e) => handleFormFieldChange('tags', e.target.value)}
                placeholder="electronic, automotive, 12v, led"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part-status">Status</Label>
                <Select value={formData.status || 'draft'} onValueChange={(value) => handleFormFieldChange('status', value)}>
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
                  onCheckedChange={(checked) => handleFormFieldChange('featured', checked)}
                />
                <Label htmlFor="featured-part">Featured Part</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Simplified Inventory Manager</span>
          </CardTitle>
          <CardDescription>
            Easy-to-use inventory management with smart form handling - no more JSON complexity!
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Manage Parts</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add New Part</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
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
                  <CardDescription>Manage your existing parts catalog</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
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
                      placeholder="Search parts by name, code, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
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
                <Select value={filterCategory} onValueChange={setFilterCategory}>
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
                Create a new part with smart form handling - choose simple or advanced mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartPartForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
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
      </Tabs>

      {/* Edit Part Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Part: {editingPart?.name}</DialogTitle>
            <DialogDescription>
              Update part information with smart form handling
            </DialogDescription>
          </DialogHeader>
          <SmartPartForm isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimplifiedInventoryManager;