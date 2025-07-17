import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Plus, 
  Upload, 
  Eye, 
  Edit, 
  Share2, 
  Download, 
  Image as ImageIcon, 
  Ruler, 
  Tag, 
  Star, 
  Search,
  Filter,
  Grid3X3,
  List,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Camera,
  Trash2,
  RotateCcw,
  QrCode,
  Zap,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Part {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  weight?: number | null;
  price: number;
  msl?: number | null;
  diyVideoUrl?: string | null;
  imageUrl?: string | null;
  imageUrls?: string | null;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  category?: string | null;
  subCategory?: string | null;
  tags?: string | null;
  specifications?: string | null;
  warranty?: number | null;
  isActive?: boolean;
  featured?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: string;
  updatedAt: string;
  brand?: {
    id: string;
    name: string;
    email: string;
  };
  brandId?: string;
}

interface EnhancedPartCatalogProps {
  brandId: string;
  onPartCreated?: (part: Part) => void;
  onPartUpdated?: (part: Part) => void;
}

const PART_CATEGORIES = [
  'Motor', 'Filter', 'Belt', 'Sensor', 'Control Board', 'Pump', 'Valve', 
  'Heating Element', 'Thermostat', 'Fan', 'Compressor', 'Gasket', 'Switch', 'Other'
];

const APPLIANCE_TYPES = [
  'Washing Machine', 'Refrigerator', 'Air Conditioner', 'Microwave', 
  'Dishwasher', 'Dryer', 'Oven', 'Cooktop', 'Water Heater', 'Other'
];

export default function EnhancedPartCatalog({ brandId, onPartCreated, onPartUpdated }: EnhancedPartCatalogProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  // Form state for creating/editing parts
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    weight: '',
    price: '',
    msl: '',
    category: '',
    subCategory: '',
    warranty: '',
    // Images
    imageUrl: '',
    additionalImages: [''],
    // Dimensions
    length: '',
    breadth: '',
    height: '',
    // Advanced
    tags: [''],
    specifications: {
      material: '',
      color: '',
      voltage: '',
      power: '',
      compatibility: ''
    },
    featured: false,
    // SEO
    seoTitle: '',
    seoDescription: '',
    diyVideoUrl: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchParts();
  }, [brandId]);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/parts?brandId=${brandId}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Handle different API response formats
      let partsData: Part[] = [];
      
      if (result.success && Array.isArray(result.data)) {
        partsData = result.data;
      } else if (Array.isArray(result)) {
        partsData = result;
      } else if (result.data && Array.isArray(result.data)) {
        partsData = result.data;
      } else {
        console.warn('Unexpected API response format:', result);
        partsData = [];
      }
      
      // Ensure each part has the required structure
      const normalizedParts = partsData.map(part => ({
        ...part,
        description: part.description || null,
        weight: part.weight || null,
        msl: part.msl || null,
        diyVideoUrl: part.diyVideoUrl || null,
        imageUrl: part.imageUrl || null,
        imageUrls: part.imageUrls || null,
        length: part.length || null,
        breadth: part.breadth || null,
        height: part.height || null,
        category: part.category || null,
        subCategory: part.subCategory || null,
        tags: part.tags || null,
        specifications: part.specifications || null,
        warranty: part.warranty || null,
        isActive: part.isActive !== false,
        featured: part.featured || false,
        seoTitle: part.seoTitle || null,
        seoDescription: part.seoDescription || null,
        brand: part.brand || { id: part.brandId || brandId, name: 'Unknown', email: '' }
      }));
      
      setParts(normalizedParts);
      
    } catch (error) {
      console.error('Error fetching parts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch parts';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Set empty array on error to prevent component crashes
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      weight: '',
      price: '',
      msl: '',
      category: '',
      subCategory: '',
      warranty: '',
      imageUrl: '',
      additionalImages: [''],
      length: '',
      breadth: '',
      height: '',
      tags: [''],
      specifications: {
        material: '',
        color: '',
        voltage: '',
        power: '',
        compatibility: ''
      },
      featured: false,
      seoTitle: '',
      seoDescription: '',
      diyVideoUrl: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) errors.code = 'Part code is required';
    if (!formData.name.trim()) errors.name = 'Part name is required';
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Valid price is required';
    
    if (formData.weight && parseFloat(formData.weight) < 0) errors.weight = 'Weight cannot be negative';
    if (formData.length && parseFloat(formData.length) < 0) errors.length = 'Length cannot be negative';
    if (formData.breadth && parseFloat(formData.breadth) < 0) errors.breadth = 'Breadth cannot be negative';
    if (formData.height && parseFloat(formData.height) < 0) errors.height = 'Height cannot be negative';

    if (formData.imageUrl && formData.imageUrl.trim()) {
      try {
        new URL(formData.imageUrl);
      } catch {
        errors.imageUrl = 'Invalid image URL';
      }
    }

    if (formData.diyVideoUrl && formData.diyVideoUrl.trim()) {
      try {
        new URL(formData.diyVideoUrl);
      } catch {
        errors.diyVideoUrl = 'Invalid video URL';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        price: parseFloat(formData.price),
        msl: formData.msl ? parseInt(formData.msl) : null,
        brandId,
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        warranty: formData.warranty ? parseInt(formData.warranty) : null,
        imageUrl: formData.imageUrl.trim() || null,
        imageUrls: JSON.stringify(formData.additionalImages.filter(url => url.trim())),
        length: formData.length ? parseFloat(formData.length) : null,
        breadth: formData.breadth ? parseFloat(formData.breadth) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        tags: JSON.stringify(formData.tags.filter(tag => tag.trim())),
        specifications: JSON.stringify(formData.specifications),
        featured: formData.featured,
        seoTitle: formData.seoTitle.trim() || null,
        seoDescription: formData.seoDescription.trim() || null,
        diyVideoUrl: formData.diyVideoUrl.trim() || null
      };

      const url = '/api/parts';
      const method = selectedPart ? 'PUT' : 'POST';
      
      if (selectedPart) {
        payload.id = selectedPart.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Part ${selectedPart ? 'updated' : 'created'} successfully!`
        });
        
        fetchParts();
        setShowCreateDialog(false);
        setShowEditDialog(false);
        resetForm();
        setSelectedPart(null);
        
        if (selectedPart && onPartUpdated) {
          onPartUpdated(result.data);
        } else if (!selectedPart && onPartCreated) {
          onPartCreated(result.data);
        }
      } else {
        toast({
          title: "Error",
          description: result.details || result.error || 'Failed to save part',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving part:', error);
      toast({
        title: "Error",
        description: "Failed to save part",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (part: Part) => {
    setSelectedPart(part);
    
    // Safely parse JSON fields with fallbacks
    let additionalImages = [''];
    let tags = [''];
    let specifications = {
      material: '',
      color: '',
      voltage: '',
      power: '',
      compatibility: ''
    };

    try {
      if (part.imageUrls) {
        const parsed = JSON.parse(part.imageUrls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          additionalImages = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse imageUrls:', e);
    }

    try {
      if (part.tags) {
        const parsed = JSON.parse(part.tags);
        if (Array.isArray(parsed) && parsed.length > 0) {
          tags = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse tags:', e);
    }

    try {
      if (part.specifications) {
        const parsed = JSON.parse(part.specifications);
        if (typeof parsed === 'object' && parsed !== null) {
          specifications = { ...specifications, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to parse specifications:', e);
    }
    
    // Populate form with existing data
    setFormData({
      code: part.code || '',
      name: part.name || '',
      description: part.description || '',
      weight: part.weight?.toString() || '',
      price: part.price?.toString() || '',
      msl: part.msl?.toString() || '',
      category: part.category || '',
      subCategory: part.subCategory || '',
      warranty: part.warranty?.toString() || '',
      imageUrl: part.imageUrl || '',
      additionalImages,
      length: part.length?.toString() || '',
      breadth: part.breadth?.toString() || '',
      height: part.height?.toString() || '',
      tags,
      specifications,
      featured: part.featured || false,
      seoTitle: part.seoTitle || '',
      seoDescription: part.seoDescription || '',
      diyVideoUrl: part.diyVideoUrl || ''
    });
    
    setShowEditDialog(true);
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      additionalImages: [...prev.additionalImages, '']
    }));
  };

  const removeImageField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index)
    }));
  };

  const addTagField = () => {
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, '']
    }));
  };

  const removeTagField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const calculateVolume = (part: Part) => {
    if (part.length && part.breadth && part.height) {
      return (part.length * part.breadth * part.height / 1000000).toFixed(3); // Convert cm³ to m³
    }
    return null;
  };

  const generateShareableLink = (part: Part) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/spare-parts?search=${encodeURIComponent(part.code)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard"
    });
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchTerm || 
      part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (part.description && part.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || part.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const renderPartForm = () => (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="seo">SEO & Video</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Part Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., LED-001, FAN-MOTOR-12V"
                className={formErrors.code ? 'border-red-500' : ''}
              />
              {formErrors.code && <p className="text-xs text-red-600 mt-1">{formErrors.code}</p>}
            </div>

            <div>
              <Label htmlFor="name">Part Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., LED Strip Light, Cooling Fan Motor"
                className={formErrors.name ? 'border-red-500' : ''}
              />
              {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select category</SelectItem>
                  {PART_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subCategory">Sub-Category</Label>
              <Input
                id="subCategory"
                value={formData.subCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, subCategory: e.target.value }))}
                placeholder="e.g., AC Motor, DC Motor"
              />
            </div>

            <div>
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className={formErrors.price ? 'border-red-500' : ''}
              />
              {formErrors.price && <p className="text-xs text-red-600 mt-1">{formErrors.price}</p>}
            </div>

            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="0.00"
                className={formErrors.weight ? 'border-red-500' : ''}
              />
              {formErrors.weight && <p className="text-xs text-red-600 mt-1">{formErrors.weight}</p>}
            </div>

            <div>
              <Label htmlFor="msl">MSL (months)</Label>
              <Input
                id="msl"
                type="number"
                min="0"
                value={formData.msl}
                onChange={(e) => setFormData(prev => ({ ...prev, msl: e.target.value }))}
                placeholder="12"
              />
            </div>

            <div>
              <Label htmlFor="warranty">Warranty (months)</Label>
              <Input
                id="warranty"
                type="number"
                min="0"
                value={formData.warranty}
                onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
                placeholder="12"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the part, its usage, and specifications..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="featured"
              checked={formData.featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
            />
            <Label htmlFor="featured">Featured Part</Label>
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <div>
            <Label htmlFor="imageUrl">Primary Image URL</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className={formErrors.imageUrl ? 'border-red-500' : ''}
            />
            {formErrors.imageUrl && <p className="text-xs text-red-600 mt-1">{formErrors.imageUrl}</p>}
            {formData.imageUrl && (
              <div className="mt-2">
                <img 
                  src={formData.imageUrl} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Additional Images</Label>
              <Button type="button" variant="outline" size="sm" onClick={addImageField}>
                <Plus className="w-4 h-4 mr-1" />
                Add Image
              </Button>
            </div>
            <div className="space-y-2">
              {formData.additionalImages.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => {
                      const newImages = [...formData.additionalImages];
                      newImages[index] = e.target.value;
                      setFormData(prev => ({ ...prev, additionalImages: newImages }));
                    }}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.additionalImages.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImageField(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dimensions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="length">Length (cm)</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                min="0"
                value={formData.length}
                onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value }))}
                placeholder="0.0"
                className={formErrors.length ? 'border-red-500' : ''}
              />
              {formErrors.length && <p className="text-xs text-red-600 mt-1">{formErrors.length}</p>}
            </div>

            <div>
              <Label htmlFor="breadth">Breadth (cm)</Label>
              <Input
                id="breadth"
                type="number"
                step="0.1"
                min="0"
                value={formData.breadth}
                onChange={(e) => setFormData(prev => ({ ...prev, breadth: e.target.value }))}
                placeholder="0.0"
                className={formErrors.breadth ? 'border-red-500' : ''}
              />
              {formErrors.breadth && <p className="text-xs text-red-600 mt-1">{formErrors.breadth}</p>}
            </div>

            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                min="0"
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                placeholder="0.0"
                className={formErrors.height ? 'border-red-500' : ''}
              />
              {formErrors.height && <p className="text-xs text-red-600 mt-1">{formErrors.height}</p>}
            </div>
          </div>

          {formData.length && formData.breadth && formData.height && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Calculated Volume</span>
              </div>
              <p className="text-blue-700">
                Volume: {((parseFloat(formData.length) * parseFloat(formData.breadth) * parseFloat(formData.height)) / 1000000).toFixed(3)} m³
              </p>
              <p className="text-sm text-blue-600 mt-1">
                This will help in shipping calculations and box optimization
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-medium">Technical Specifications</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  value={formData.specifications.material}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specifications: { ...prev.specifications, material: e.target.value }
                  }))}
                  placeholder="e.g., Plastic, Metal, Ceramic"
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.specifications.color}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specifications: { ...prev.specifications, color: e.target.value }
                  }))}
                  placeholder="e.g., Black, White, Silver"
                />
              </div>

              <div>
                <Label htmlFor="voltage">Voltage</Label>
                <Input
                  id="voltage"
                  value={formData.specifications.voltage}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specifications: { ...prev.specifications, voltage: e.target.value }
                  }))}
                  placeholder="e.g., 220V, 12V, 24V"
                />
              </div>

              <div>
                <Label htmlFor="power">Power</Label>
                <Input
                  id="power"
                  value={formData.specifications.power}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specifications: { ...prev.specifications, power: e.target.value }
                  }))}
                  placeholder="e.g., 100W, 50W"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="compatibility">Compatibility</Label>
              <Textarea
                id="compatibility"
                value={formData.specifications.compatibility}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  specifications: { ...prev.specifications, compatibility: e.target.value }
                }))}
                placeholder="Compatible appliance models, brands, etc."
                rows={2}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tags (for search optimization)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTagField}>
                <Plus className="w-4 h-4 mr-1" />
                Add Tag
              </Button>
            </div>
            <div className="space-y-2">
              {formData.tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={tag}
                    onChange={(e) => {
                      const newTags = [...formData.tags];
                      newTags[index] = e.target.value;
                      setFormData(prev => ({ ...prev, tags: newTags }));
                    }}
                    placeholder="e.g., motor, cooling, replacement"
                  />
                  {formData.tags.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTagField(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <div>
            <Label htmlFor="seoTitle">SEO Title</Label>
            <Input
              id="seoTitle"
              value={formData.seoTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
              placeholder="Optimized title for search engines"
              maxLength={60}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.seoTitle.length}/60 characters
            </p>
          </div>

          <div>
            <Label htmlFor="seoDescription">SEO Description</Label>
            <Textarea
              id="seoDescription"
              value={formData.seoDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
              placeholder="Brief description for search engine results"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.seoDescription.length}/160 characters
            </p>
          </div>

          <div>
            <Label htmlFor="diyVideoUrl">DIY Video URL</Label>
            <Input
              id="diyVideoUrl"
              value={formData.diyVideoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, diyVideoUrl: e.target.value }))}
              placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
              className={formErrors.diyVideoUrl ? 'border-red-500' : ''}
            />
            {formErrors.diyVideoUrl && <p className="text-xs text-red-600 mt-1">{formErrors.diyVideoUrl}</p>}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowCreateDialog(false);
            setShowEditDialog(false);
            resetForm();
            setSelectedPart(null);
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {selectedPart ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              {selectedPart ? 'Update Part' : 'Create Part'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Part Catalog</h2>
          <p className="text-gray-600">Manage your parts with images, dimensions, and advanced features</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Part
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search parts by code, name, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PART_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parts Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParts.map((part) => (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {part.imageUrl ? (
                    <img
                      src={part.imageUrl}
                      alt={part.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {part.featured && (
                      <Badge className="bg-yellow-500">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {part.isActive === false && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{part.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {part.code}
                      </Badge>
                    </div>
                    
                    {part.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {part.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        ${part.price.toFixed(2)}
                      </span>
                      {part.category && (
                        <Badge variant="secondary" className="text-xs">
                          {part.category}
                        </Badge>
                      )}
                    </div>

                    {/* Dimensions */}
                    {(part.length || part.breadth || part.height) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Ruler className="w-3 h-3" />
                        <span>
                          {part.length || '?'} × {part.breadth || '?'} × {part.height || '?'} cm
                        </span>
                        {calculateVolume(part) && (
                          <span>({calculateVolume(part)} m³)</span>
                        )}
                      </div>
                    )}

                    {/* Weight */}
                    {part.weight && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Package className="w-3 h-3" />
                        <span>{part.weight} kg</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(part)}
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generateShareableLink(part))}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(generateShareableLink(part), '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{part.code}</TableCell>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>
                      {part.category && (
                        <Badge variant="outline">{part.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>${part.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {(part.length || part.breadth || part.height) ? (
                        <span className="text-sm">
                          {part.length || '?'} × {part.breadth || '?'} × {part.height || '?'} cm
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {part.weight ? `${part.weight} kg` : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {part.featured && (
                          <Badge className="bg-yellow-500 text-xs">
                            <Star className="w-3 h-3" />
                          </Badge>
                        )}
                        <Badge variant={part.isActive !== false ? 'default' : 'secondary'} className="text-xs">
                          {part.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(part)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateShareableLink(part))}
                        >
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredParts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search or filters' 
              : 'Create your first part to get started'
            }
          </p>
        </div>
      )}

      {/* Create Part Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Part</DialogTitle>
          </DialogHeader>
          {renderPartForm()}
        </DialogContent>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Part: {selectedPart?.name}</DialogTitle>
          </DialogHeader>
          {renderPartForm()}
        </DialogContent>
      </Dialog>
    </div>
  );
}