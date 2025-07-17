import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Plus, 
  Camera, 
  Video, 
  FileImage, 
  PlayCircle, 
  Zap, 
  Monitor, 
  Settings, 
  Smartphone, 
  Eye,
  Edit,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle,
  Wrench,
  Brain,
  ImageIcon,
  Upload,
  X,
  ExternalLink,
  Download,
  Info,
  Package,
  Tv,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Part {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  subCategory?: string;
  imageUrl?: string;
  imageUrls?: string;
  diyVideoUrl?: string;
  installationVideos?: string;
  technicalDrawings?: string;
  problemKeywords?: string;
  symptoms?: string;
  compatibleAppliances?: string;
  installationDifficulty?: string;
  commonFailureReasons?: string;
  troubleshootingSteps?: string;
  urgencyLevel?: string;
  customerDescription?: string;
  technicalSpecs?: string;
  safetyWarnings?: string;
  featured?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
    email: string;
  };
}

interface EnhancedPartCatalogWithMediaProps {
  brandId: string;
  userRole: string;
  onPartCreated?: (part: Part) => void;
  onPartUpdated?: (part: Part) => void;
}

const FAULT_CATEGORIES = [
  { id: 'all', name: 'All Parts', icon: Package, color: 'gray' },
  { id: 'power', name: 'Power Issues', icon: Zap, color: 'red', keywords: ['no power', 'won\'t turn on', 'dead', 'power supply'] },
  { id: 'display', name: 'Display Problems', icon: Monitor, color: 'blue', keywords: ['no display', 'blank screen', 'flickering'] },
  { id: 'mechanical', name: 'Mechanical', icon: Settings, color: 'orange', keywords: ['motor', 'fan', 'noise', 'vibration'] },
  { id: 'control', name: 'Control Issues', icon: Smartphone, color: 'green', keywords: ['remote', 'buttons', 'control'] }
];

const INSTALLATION_DIFFICULTY = [
  { value: 'EASY', label: 'Easy (DIY)', color: 'green' },
  { value: 'MEDIUM', label: 'Medium (Some Experience)', color: 'yellow' },
  { value: 'HARD', label: 'Hard (Technical Skills)', color: 'orange' },
  { value: 'EXPERT', label: 'Expert (Professional Only)', color: 'red' }
];

const URGENCY_LEVELS = [
  { value: 'LOW', label: 'Low Priority', color: 'green' },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'yellow' },
  { value: 'HIGH', label: 'High Priority', color: 'orange' },
  { value: 'CRITICAL', label: 'Critical', color: 'red' }
];

export default function EnhancedPartCatalogWithMedia({ 
  brandId, 
  userRole, 
  onPartCreated, 
  onPartUpdated 
}: EnhancedPartCatalogWithMediaProps) {
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [showPartDetails, setShowPartDetails] = useState(false);

  // Form state for adding/editing parts
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    price: '',
    category: '',
    subCategory: '',
    imageUrl: '',
    imageUrls: '',
    diyVideoUrl: '',
    installationVideos: '',
    technicalDrawings: '',
    problemKeywords: '',
    symptoms: '',
    compatibleAppliances: '',
    installationDifficulty: 'MEDIUM',
    commonFailureReasons: '',
    troubleshootingSteps: '',
    urgencyLevel: 'MEDIUM',
    customerDescription: '',
    technicalSpecs: '',
    safetyWarnings: '',
    featured: false
  });

  useEffect(() => {
    fetchParts();
  }, [brandId]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/parts?brandId=${brandId}`);
      const data = await response.json();
      
      if (data.success) {
        setParts(data.data || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch parts",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch parts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = selectedPart ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        id: selectedPart?.id,
        brandId,
        price: parseFloat(formData.price) || 0,
        imageUrls: formData.imageUrls ? JSON.stringify(formData.imageUrls.split(',').map(url => url.trim()).filter(Boolean)) : null,
        installationVideos: formData.installationVideos ? JSON.stringify(formData.installationVideos.split(',').map(url => url.trim()).filter(Boolean)) : null,
        technicalDrawings: formData.technicalDrawings ? JSON.stringify(formData.technicalDrawings.split(',').map(url => url.trim()).filter(Boolean)) : null
      };

      const response = await fetch('/api/parts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        if (selectedPart) {
          setParts(prev => prev.map(p => p.id === selectedPart.id ? data.data : p));
          onPartUpdated?.(data.data);
          toast({
            title: "Success",
            description: "Part updated successfully"
          });
        } else {
          setParts(prev => [data.data, ...prev]);
          onPartCreated?.(data.data);
          toast({
            title: "Success",
            description: "Part created successfully"
          });
        }
        
        resetForm();
        setShowAddDialog(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save part",
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
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      price: '',
      category: '',
      subCategory: '',
      imageUrl: '',
      imageUrls: '',
      diyVideoUrl: '',
      installationVideos: '',
      technicalDrawings: '',
      problemKeywords: '',
      symptoms: '',
      compatibleAppliances: '',
      installationDifficulty: 'MEDIUM',
      commonFailureReasons: '',
      troubleshootingSteps: '',
      urgencyLevel: 'MEDIUM',
      customerDescription: '',
      technicalSpecs: '',
      safetyWarnings: '',
      featured: false
    });
    setSelectedPart(null);
  };

  const handleEdit = (part: Part) => {
    setSelectedPart(part);
    setFormData({
      code: part.code || '',
      name: part.name || '',
      description: part.description || '',
      price: part.price?.toString() || '',
      category: part.category || '',
      subCategory: part.subCategory || '',
      imageUrl: part.imageUrl || '',
      imageUrls: part.imageUrls ? JSON.parse(part.imageUrls).join(', ') : '',
      diyVideoUrl: part.diyVideoUrl || '',
      installationVideos: part.installationVideos ? JSON.parse(part.installationVideos).join(', ') : '',
      technicalDrawings: part.technicalDrawings ? JSON.parse(part.technicalDrawings).join(', ') : '',
      problemKeywords: part.problemKeywords || '',
      symptoms: part.symptoms || '',
      compatibleAppliances: part.compatibleAppliances || '',
      installationDifficulty: part.installationDifficulty || 'MEDIUM',
      commonFailureReasons: part.commonFailureReasons || '',
      troubleshootingSteps: part.troubleshootingSteps || '',
      urgencyLevel: part.urgencyLevel || 'MEDIUM',
      customerDescription: part.customerDescription || '',
      technicalSpecs: part.technicalSpecs || '',
      safetyWarnings: part.safetyWarnings || '',
      featured: part.featured || false
    });
    setShowAddDialog(true);
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchTerm || 
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.problemKeywords?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.symptoms?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.compatibleAppliances?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory !== 'all' && 
       FAULT_CATEGORIES.find(cat => cat.id === selectedCategory)?.keywords.some(keyword =>
         part.problemKeywords?.toLowerCase().includes(keyword) ||
         part.symptoms?.toLowerCase().includes(keyword) ||
         part.name.toLowerCase().includes(keyword)
       ));

    return matchesSearch && matchesCategory;
  });

  const renderMediaGallery = (part: Part) => {
    const additionalImages = part.imageUrls ? JSON.parse(part.imageUrls) : [];
    const installationVideos = part.installationVideos ? JSON.parse(part.installationVideos) : [];
    const technicalDrawings = part.technicalDrawings ? JSON.parse(part.technicalDrawings) : [];
    
    const allMedia = [
      ...(part.imageUrl ? [{ url: part.imageUrl, type: 'image', title: 'Primary Image' }] : []),
      ...additionalImages.map((url: string, index: number) => ({ url, type: 'image', title: `Image ${index + 1}` })),
      ...(part.diyVideoUrl ? [{ url: part.diyVideoUrl, type: 'video', title: 'DIY Video' }] : []),
      ...installationVideos.map((url: string, index: number) => ({ url, type: 'video', title: `Installation Video ${index + 1}` })),
      ...technicalDrawings.map((url: string, index: number) => ({ url, type: 'image', title: `Technical Drawing ${index + 1}` }))
    ];

    if (allMedia.length === 0) {
      return (
        <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <span className="text-sm text-gray-500">No media available</span>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {allMedia.slice(0, 6).map((media, index) => (
          <div key={index} className="relative group cursor-pointer">
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.title}
                className="w-full h-24 object-cover rounded border"
                onClick={() => window.open(media.url, '_blank')}
              />
            ) : (
              <div 
                className="w-full h-24 bg-black rounded border flex items-center justify-center"
                onClick={() => window.open(media.url, '_blank')}
              >
                <PlayCircle className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
        {allMedia.length > 6 && (
          <div className="w-full h-24 bg-gray-100 rounded border flex items-center justify-center">
            <span className="text-sm text-gray-600">+{allMedia.length - 6} more</span>
          </div>
        )}
      </div>
    );
  };

  const renderPartCard = (part: Part) => {
    const difficultyConfig = INSTALLATION_DIFFICULTY.find(d => d.value === part.installationDifficulty);
    const urgencyConfig = URGENCY_LEVELS.find(u => u.value === part.urgencyLevel);

    return (
      <Card key={part.id} className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{part.name}</CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="outline" className="mr-2">{part.code}</Badge>
                {part.category && <span className="text-sm text-gray-600">{part.category}</span>}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {part.featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
              <span className="font-semibold text-lg">${part.price}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Media Gallery */}
          {renderMediaGallery(part)}
          
          {/* Part Details */}
          <div className="space-y-2">
            {part.customerDescription && (
              <p className="text-sm text-gray-600 line-clamp-2">{part.customerDescription}</p>
            )}
            
            {part.compatibleAppliances && (
              <div className="flex items-center space-x-2">
                <Tv className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">{part.compatibleAppliances}</span>
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {difficultyConfig && (
              <Badge variant="outline" className={`text-${difficultyConfig.color}-700 border-${difficultyConfig.color}-300`}>
                <Wrench className="w-3 h-3 mr-1" />
                {difficultyConfig.label}
              </Badge>
            )}
            {urgencyConfig && (
              <Badge variant="outline" className={`text-${urgencyConfig.color}-700 border-${urgencyConfig.color}-300`}>
                <AlertCircle className="w-3 h-3 mr-1" />
                {urgencyConfig.label}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPart(part);
                setShowPartDetails(true);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            
            {userRole === 'BRAND' && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(part)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Part Catalog</h2>
          <p className="text-gray-600">Comprehensive parts with media and fault-based filtering</p>
        </div>
        
        {userRole === 'BRAND' && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Part
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, code, problem, or symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Fault Categories */}
        <div className="flex flex-wrap gap-2">
          {FAULT_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <Button
                key={category.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center space-x-2"
              >
                <IconComponent className="w-4 h-4" />
                <span>{category.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredParts.length} part{filteredParts.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredParts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No parts found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No parts have been added yet'
                }
              </p>
              {userRole === 'BRAND' && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Part
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
          }>
            {filteredParts.map(renderPartCard)}
          </div>
        )}
      </div>

      {/* Add/Edit Part Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPart ? 'Edit Part' : 'Add New Part'}
            </DialogTitle>
            <DialogDescription>
              Create a comprehensive part entry with media and AI-optimized data
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="ai-data">AI Data</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Part Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Part Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subCategory">Sub Category</Label>
                    <Input
                      id="subCategory"
                      value={formData.subCategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, subCategory: e.target.value }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <Alert>
                  <Camera className="h-4 w-4" />
                  <AlertDescription>
                    Add images, videos, and technical drawings to help customers and service centers
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="imageUrl">Primary Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <Label htmlFor="imageUrls">Additional Images (comma-separated URLs)</Label>
                  <Textarea
                    id="imageUrls"
                    value={formData.imageUrls}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrls: e.target.value }))}
                    placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="diyVideoUrl">DIY Repair Video URL</Label>
                  <Input
                    id="diyVideoUrl"
                    value={formData.diyVideoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, diyVideoUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div>
                  <Label htmlFor="installationVideos">Installation Videos (comma-separated URLs)</Label>
                  <Textarea
                    id="installationVideos"
                    value={formData.installationVideos}
                    onChange={(e) => setFormData(prev => ({ ...prev, installationVideos: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..., https://vimeo.com/..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="technicalDrawings">Technical Drawings (comma-separated URLs)</Label>
                  <Textarea
                    id="technicalDrawings"
                    value={formData.technicalDrawings}
                    onChange={(e) => setFormData(prev => ({ ...prev, technicalDrawings: e.target.value }))}
                    placeholder="https://example.com/drawing1.pdf, https://example.com/schematic.jpg"
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="ai-data" className="space-y-4">
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    This data helps customers find parts by describing their problems
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="problemKeywords">Problem Keywords</Label>
                  <Input
                    id="problemKeywords"
                    value={formData.problemKeywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, problemKeywords: e.target.value }))}
                    placeholder="no power, won't turn on, dead, blank screen"
                  />
                </div>

                <div>
                  <Label htmlFor="symptoms">Common Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    value={formData.symptoms}
                    onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                    placeholder="TV won't turn on, no display, power LED not working"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="compatibleAppliances">Compatible Appliances</Label>
                  <Input
                    id="compatibleAppliances"
                    value={formData.compatibleAppliances}
                    onChange={(e) => setFormData(prev => ({ ...prev, compatibleAppliances: e.target.value }))}
                    placeholder="LED TV, LCD TV, Smart TV, 32-55 inch TVs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="installationDifficulty">Installation Difficulty</Label>
                    <Select
                      value={formData.installationDifficulty}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, installationDifficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLATION_DIFFICULTY.map(diff => (
                          <SelectItem key={diff.value} value={diff.value}>
                            {diff.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="urgencyLevel">Urgency Level</Label>
                    <Select
                      value={formData.urgencyLevel}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, urgencyLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCY_LEVELS.map(urgency => (
                          <SelectItem key={urgency.value} value={urgency.value}>
                            {urgency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customerDescription">Customer-Friendly Description</Label>
                  <Textarea
                    id="customerDescription"
                    value={formData.customerDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerDescription: e.target.value }))}
                    placeholder="This power supply board provides electricity to your TV..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-4">
                <div>
                  <Label htmlFor="technicalSpecs">Technical Specifications</Label>
                  <Textarea
                    id="technicalSpecs"
                    value={formData.technicalSpecs}
                    onChange={(e) => setFormData(prev => ({ ...prev, technicalSpecs: e.target.value }))}
                    placeholder="Input: AC 100-240V, Output: DC 12V 5A, Power: 60W"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="commonFailureReasons">Common Failure Reasons</Label>
                  <Textarea
                    id="commonFailureReasons"
                    value={formData.commonFailureReasons}
                    onChange={(e) => setFormData(prev => ({ ...prev, commonFailureReasons: e.target.value }))}
                    placeholder="Power surges, age-related component failure, overheating"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="troubleshootingSteps">Troubleshooting Steps</Label>
                  <Textarea
                    id="troubleshootingSteps"
                    value={formData.troubleshootingSteps}
                    onChange={(e) => setFormData(prev => ({ ...prev, troubleshootingSteps: e.target.value }))}
                    placeholder="1. Check power cable&#10;2. Test with different outlet&#10;3. Look for burnt components"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="safetyWarnings">Safety Warnings</Label>
                  <Textarea
                    id="safetyWarnings"
                    value={formData.safetyWarnings}
                    onChange={(e) => setFormData(prev => ({ ...prev, safetyWarnings: e.target.value }))}
                    placeholder="Disconnect power before installation, Handle with anti-static precautions"
                    rows={2}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedPart ? 'Update Part' : 'Create Part'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Part Details Dialog */}
      <Dialog open={showPartDetails} onOpenChange={setShowPartDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPart && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedPart.name}</span>
                  <Badge variant="outline">{selectedPart.code}</Badge>
                </DialogTitle>
                <DialogDescription>
                  Complete part information with media and technical details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Media Gallery */}
                <div>
                  <h3 className="font-semibold mb-3">Media Gallery</h3>
                  {renderMediaGallery(selectedPart)}
                </div>

                {/* Part Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Basic Information</h4>
                      <div className="mt-2 space-y-2">
                        <div><span className="font-medium">Price:</span> ${selectedPart.price}</div>
                        {selectedPart.category && <div><span className="font-medium">Category:</span> {selectedPart.category}</div>}
                        {selectedPart.customerDescription && (
                          <div>
                            <span className="font-medium">Description:</span>
                            <p className="text-sm text-gray-600 mt-1">{selectedPart.customerDescription}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedPart.compatibleAppliances && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Compatibility</h4>
                        <p className="mt-2 text-sm">{selectedPart.compatibleAppliances}</p>
                      </div>
                    )}

                    {selectedPart.problemKeywords && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Problem Keywords</h4>
                        <p className="mt-2 text-sm">{selectedPart.problemKeywords}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedPart.symptoms && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Common Symptoms</h4>
                        <p className="mt-2 text-sm">{selectedPart.symptoms}</p>
                      </div>
                    )}

                    {selectedPart.technicalSpecs && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Technical Specifications</h4>
                        <p className="mt-2 text-sm">{selectedPart.technicalSpecs}</p>
                      </div>
                    )}

                    {selectedPart.safetyWarnings && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Safety Warnings</h4>
                        <p className="mt-2 text-sm text-red-600">{selectedPart.safetyWarnings}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPart.troubleshootingSteps && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Troubleshooting Steps</h4>
                    <pre className="mt-2 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">{selectedPart.troubleshootingSteps}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}