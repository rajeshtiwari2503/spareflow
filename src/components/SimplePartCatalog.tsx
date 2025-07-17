import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  Plus, 
  Edit, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Part {
  id: string;
  code: string;
  name: string;
  description?: string;
  weight?: number;
  price: number;
  msl?: number;
  diyVideoUrl?: string;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
    email: string;
  };
}

interface SimplePartCatalogProps {
  brandId: string;
  onPartCreated?: (part: Part) => void;
  onPartUpdated?: (part: Part) => void;
}

export default function SimplePartCatalog({ brandId, onPartCreated, onPartUpdated }: SimplePartCatalogProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    weight: '',
    price: '',
    msl: '',
    diyVideoUrl: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchParts();
  }, [brandId]);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/parts?brandId=${brandId}&limit=50`);
      const result = await response.json();
      
      if (response.ok) {
        setParts(result.data || []);
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

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      weight: '',
      price: '',
      msl: '',
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
    setFormData({
      code: part.code,
      name: part.name,
      description: part.description || '',
      weight: part.weight?.toString() || '',
      price: part.price.toString(),
      msl: part.msl?.toString() || '',
      diyVideoUrl: part.diyVideoUrl || ''
    });
    setShowEditDialog(true);
  };

  const renderPartForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Part Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="e.g., LED-001"
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
            placeholder="e.g., LED Strip Light"
            className={formErrors.name ? 'border-red-500' : ''}
          />
          {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
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
          <Label htmlFor="diyVideoUrl">DIY Video URL</Label>
          <Input
            id="diyVideoUrl"
            value={formData.diyVideoUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, diyVideoUrl: e.target.value }))}
            placeholder="https://youtube.com/watch?v=..."
            className={formErrors.diyVideoUrl ? 'border-red-500' : ''}
          />
          {formErrors.diyVideoUrl && <p className="text-xs text-red-600 mt-1">{formErrors.diyVideoUrl}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Detailed description of the part..."
          rows={3}
        />
      </div>

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
          <h2 className="text-2xl font-bold">Part Catalog</h2>
          <p className="text-gray-600">Manage your spare parts inventory</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Part
        </Button>
      </div>

      {/* Parts Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading parts...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>MSL</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono">{part.code}</TableCell>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>${part.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {part.weight ? `${part.weight} kg` : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {part.msl ? `${part.msl} months` : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {part.diyVideoUrl ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Has Video
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          No Video
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(part)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {parts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
          <p className="text-gray-600">Create your first part to get started</p>
        </div>
      )}

      {/* Create Part Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Part</DialogTitle>
          </DialogHeader>
          {renderPartForm()}
        </DialogContent>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Part: {selectedPart?.name}</DialogTitle>
          </DialogHeader>
          {renderPartForm()}
        </DialogContent>
      </Dialog>
    </div>
  );
}