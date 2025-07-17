import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, BarChart3, CheckCircle, Plus, Edit, Trash2, Eye, XCircle, 
  RefreshCw, Search, Filter, Calendar, Download, Upload, AlertTriangle, 
  DollarSign, TrendingUp, Activity, Settings, Info, ExternalLink, 
  Copy, Archive, Star, Target, PieChart, LineChart, BarChart, Loader2,
  Clock, Bell, MapPin, Users, Database, Shield, Zap, FileText,
  TrendingDown, RotateCcw, Truck, Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Enhanced interfaces for catalog, analytics, and approvals
interface ProductCatalog {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  msl: number;
  brandId: string;
  brand: {
    id: string;
    name: string;
    email: string;
  };
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PartApproval {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  brand: {
    id: string;
    name: string;
    email: string;
  };
  approvalStatus: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  usageCount: number;
  pendingOrders: number;
  createdAt: string;
}

interface CatalogStats {
  totalParts: number;
  activeParts: number;
  lowStockParts: number;
  outOfStockParts: number;
}

interface RevenueReport {
  totalRevenue: number;
  courierMargin: number;
  totalShipments: number;
  averageMargin: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    margin: number;
    shipments: number;
  }>;
}

interface ShipmentMetrics {
  totalShipments: number;
  deliveredShipments: number;
  pendingShipments: number;
  failedShipments: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
}

interface ReturnAnalytics {
  totalReturns: number;
  returnRate: number;
  topReturnReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  monthlyReturns: Array<{
    month: string;
    returns: number;
    rate: number;
  }>;
}

interface InventoryMovement {
  totalParts: number;
  lowStockParts: number;
  outOfStockParts: number;
  topMovingParts: Array<{
    partId: string;
    partName: string;
    movement: number;
    brand: string;
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function SuperAdminDashboardPart3() {
  // State management
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Catalog management states
  const [catalog, setCatalog] = useState<ProductCatalog[]>([]);
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogActionLoading, setCatalogActionLoading] = useState<string | null>(null);
  
  // Analytics states
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [shipmentMetrics, setShipmentMetrics] = useState<ShipmentMetrics | null>(null);
  const [returnAnalytics, setReturnAnalytics] = useState<ReturnAnalytics | null>(null);
  const [inventoryMovement, setInventoryMovement] = useState<InventoryMovement | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedAnalyticsPeriod, setSelectedAnalyticsPeriod] = useState('30d');
  
  // Approvals states
  const [partApprovals, setPartApprovals] = useState<PartApproval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalActionLoading, setApprovalActionLoading] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Filter and search states
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogFilterBrand, setCatalogFilterBrand] = useState('ALL');
  const [catalogFilterCategory, setCatalogFilterCategory] = useState('ALL');
  const [catalogFilterStatus, setCatalogFilterStatus] = useState('ALL');
  const [approvalSearchTerm, setApprovalSearchTerm] = useState('');
  const [approvalFilterStatus, setApprovalFilterStatus] = useState('ALL');
  
  // Form states
  const [isCreatePartOpen, setIsCreatePartOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<ProductCatalog | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  
  // Users for dropdowns
  const [users, setUsers] = useState<User[]>([]);

  // Initialize component
  useEffect(() => {
    setMounted(true);
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchCatalog(),
        fetchAnalytics(),
        fetchPartApprovals()
      ]);
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for dropdowns
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  // Catalog Management Functions
  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({
        brand: catalogFilterBrand,
        category: catalogFilterCategory,
        status: catalogFilterStatus,
        search: catalogSearchTerm,
        limit: '100'
      });

      const response = await fetch(`/api/admin/product-catalog?${params}`);
      if (!response.ok) throw new Error('Failed to fetch catalog');
      const data = await response.json();
      
      setCatalog(data.parts || []);
      setCatalogStats(data.summary || null);
      
      toast.success('Product catalog loaded successfully');
    } catch (error) {
      console.error('Error fetching catalog:', error);
      toast.error('Failed to fetch product catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleCreatePart = async (partData: any) => {
    setCatalogActionLoading('create');
    try {
      const response = await fetch('/api/admin/product-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          partData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create part');
      }

      const result = await response.json();
      setCatalog(prev => [result.part, ...prev]);
      setIsCreatePartOpen(false);
      
      toast.success(`Part ${result.part.name} created successfully`);
      fetchCatalog(); // Refresh to get updated stats
    } catch (error: any) {
      console.error('Error creating part:', error);
      toast.error(error.message || 'Failed to create part');
    } finally {
      setCatalogActionLoading(null);
    }
  };

  const handleUpdatePart = async (partId: string, partData: any) => {
    setCatalogActionLoading(partId);
    try {
      const response = await fetch('/api/admin/product-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          partId,
          partData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update part');
      }

      const result = await response.json();
      setCatalog(prev => prev.map(p => p.id === partId ? result.part : p));
      setEditingPart(null);
      
      toast.success(`Part ${result.part.name} updated successfully`);
    } catch (error: any) {
      console.error('Error updating part:', error);
      toast.error(error.message || 'Failed to update part');
    } finally {
      setCatalogActionLoading(null);
    }
  };

  const handleDeletePart = async (partId: string, partName: string) => {
    if (!confirm(`Are you sure you want to delete part "${partName}"? This action cannot be undone.`)) {
      return;
    }

    setCatalogActionLoading(partId);
    try {
      const response = await fetch('/api/admin/product-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          partId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete part');
      }

      setCatalog(prev => prev.filter(p => p.id !== partId));
      toast.success(`Part ${partName} deleted successfully`);
      fetchCatalog(); // Refresh to get updated stats
    } catch (error: any) {
      console.error('Error deleting part:', error);
      toast.error(error.message || 'Failed to delete part');
    } finally {
      setCatalogActionLoading(null);
    }
  };

  // Analytics Functions
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [revenueRes, shipmentsRes, returnsRes, inventoryRes] = await Promise.all([
        fetch(`/api/admin/analytics?type=revenue&period=${selectedAnalyticsPeriod}`),
        fetch(`/api/admin/analytics?type=shipments&period=${selectedAnalyticsPeriod}`),
        fetch(`/api/admin/analytics?type=returns&period=${selectedAnalyticsPeriod}`),
        fetch(`/api/admin/analytics?type=inventory&period=${selectedAnalyticsPeriod}`)
      ]);

      if (revenueRes.ok) {
        const revenueData = await revenueRes.json();
        setRevenueReport(revenueData);
      }

      if (shipmentsRes.ok) {
        const shipmentsData = await shipmentsRes.json();
        setShipmentMetrics(shipmentsData);
      }

      if (returnsRes.ok) {
        const returnsData = await returnsRes.json();
        setReturnAnalytics(returnsData);
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventoryMovement(inventoryData);
      }

      toast.success('Analytics data loaded successfully');
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Approvals Functions
  const fetchPartApprovals = async () => {
    setApprovalsLoading(true);
    try {
      const response = await fetch('/api/admin/part-approvals');
      if (!response.ok) throw new Error('Failed to fetch part approvals');
      const data = await response.json();
      setPartApprovals(Array.isArray(data) ? data : []);
      toast.success('Part approvals loaded successfully');
    } catch (error) {
      console.error('Error fetching part approvals:', error);
      toast.error('Failed to fetch part approvals');
    } finally {
      setApprovalsLoading(false);
    }
  };

  const handlePartApproval = async (partId: string, action: 'approve' | 'reject', reason?: string) => {
    const part = partApprovals.find(p => p.id === partId);
    if (!part) {
      toast.error('Part not found');
      return;
    }

    const actionText = action === 'approve' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${actionText} part "${part.name}"?`)) {
      return;
    }

    setApprovalActionLoading(partId);
    try {
      const response = await fetch('/api/admin/part-approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId, action, reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${actionText} part`);
      }

      // Update local state
      setPartApprovals(prev => prev.map(p => 
        p.id === partId 
          ? { ...p, approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED' }
          : p
      ));

      setSelectedPart(null);
      setRejectionReason('');
      
      toast.success(`Part ${part.name} ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      console.error(`Error ${actionText}ing part:`, error);
      toast.error(error.message || `Failed to ${actionText} part`);
    } finally {
      setApprovalActionLoading(null);
    }
  };

  // Filter functions
  const filteredCatalog = catalog.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
                         part.code.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
                         part.description.toLowerCase().includes(catalogSearchTerm.toLowerCase());
    const matchesBrand = catalogFilterBrand === 'ALL' || part.brandId === catalogFilterBrand;
    const matchesCategory = catalogFilterCategory === 'ALL' || part.category === catalogFilterCategory;
    const matchesStatus = catalogFilterStatus === 'ALL' || 
                         (catalogFilterStatus === 'ACTIVE' && part.isActive) ||
                         (catalogFilterStatus === 'INACTIVE' && !part.isActive);
    
    return matchesSearch && matchesBrand && matchesCategory && matchesStatus;
  });

  const filteredApprovals = partApprovals.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(approvalSearchTerm.toLowerCase()) ||
                         part.code.toLowerCase().includes(approvalSearchTerm.toLowerCase());
    const matchesStatus = approvalFilterStatus === 'ALL' || part.approvalStatus === approvalFilterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const brandUsers = users.filter(u => u.role === 'BRAND');
  const categories = ['MOTOR', 'FILTER', 'BELT', 'PUMP', 'COMPRESSOR', 'REMOTE', 'SENSOR', 'OTHER'];

  // Calculate approval statistics
  const approvalStats = {
    pending: partApprovals.filter(p => p.approvalStatus === 'PENDING').length,
    underReview: partApprovals.filter(p => p.approvalStatus === 'UNDER_REVIEW').length,
    approved: partApprovals.filter(p => p.approvalStatus === 'APPROVED').length,
    rejected: partApprovals.filter(p => p.approvalStatus === 'REJECTED').length,
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Catalog, Analytics & Approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
            <p className="text-gray-600">Part 3: Catalog, Analytics & Approvals Management</p>
          </div>

          <Tabs defaultValue="catalog" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="catalog" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product Catalog
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics & Reports
              </TabsTrigger>
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Part Approvals
              </TabsTrigger>
            </TabsList>

            {/* Product Catalog Tab */}
            <TabsContent value="catalog" className="space-y-6">
              {/* Catalog Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Parts</p>
                        <p className="text-2xl font-bold">
                          {catalogLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            catalogStats?.totalParts || catalog.length
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Parts</p>
                        <p className="text-2xl font-bold">
                          {catalogLoading ? '...' : catalogStats?.activeParts || catalog.filter(p => p.isActive).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Low Stock</p>
                        <p className="text-2xl font-bold">
                          {catalogLoading ? '...' : catalogStats?.lowStockParts || catalog.filter(p => p.msl <= 10).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                        <p className="text-2xl font-bold">
                          {catalogLoading ? '...' : catalogStats?.outOfStockParts || catalog.filter(p => p.msl <= 0).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Catalog Management */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Product Catalog Management
                      </CardTitle>
                      <CardDescription>Upload and manage spare parts across all brands</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={fetchCatalog} disabled={catalogLoading}>
                        {catalogLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Catalog
                      </Button>
                      <Dialog open={isCreatePartOpen} onOpenChange={setIsCreatePartOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Part
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Create New Part</DialogTitle>
                            <DialogDescription>Add a new spare part to the catalog</DialogDescription>
                          </DialogHeader>
                          <PartForm 
                            onSubmit={handleCreatePart}
                            loading={catalogActionLoading === 'create'}
                            brands={brandUsers}
                            categories={categories}
                            onCancel={() => setIsCreatePartOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search parts..."
                        value={catalogSearchTerm}
                        onChange={(e) => setCatalogSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={catalogFilterBrand} onValueChange={setCatalogFilterBrand}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Brands</SelectItem>
                        {brandUsers.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={catalogFilterCategory} onValueChange={setCatalogFilterCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={catalogFilterStatus} onValueChange={setCatalogFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Results Summary */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Showing {filteredCatalog.length} of {catalog.length} parts
                    </p>
                  </div>

                  {/* Catalog Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>MSL</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catalogLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500">Loading catalog...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredCatalog.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {catalogSearchTerm || catalogFilterBrand !== 'ALL' || catalogFilterCategory !== 'ALL' || catalogFilterStatus !== 'ALL'
                                  ? 'No parts match your filters' 
                                  : 'No parts found'
                                }
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCatalog.map((part) => (
                            <TableRow key={part.id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm">{part.code}</TableCell>
                              <TableCell className="font-medium">{part.name}</TableCell>
                              <TableCell>{part.brand.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{part.category}</Badge>
                              </TableCell>
                              <TableCell className="font-mono">₹{part.price.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  part.msl <= 0 ? 'destructive' : 
                                  part.msl <= 10 ? 'secondary' : 'default'
                                }>
                                  {part.msl}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={part.isActive ? 'default' : 'secondary'}>
                                  {part.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" title="View Details">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Part Details</DialogTitle>
                                      </DialogHeader>
                                      <PartDetailsView part={part} />
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" title="Edit Part">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Edit Part</DialogTitle>
                                      </DialogHeader>
                                      <PartForm 
                                        part={part}
                                        onSubmit={(data) => handleUpdatePart(part.id, data)}
                                        loading={catalogActionLoading === part.id}
                                        brands={brandUsers}
                                        categories={categories}
                                        onCancel={() => setEditingPart(null)}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeletePart(part.id, part.name)}
                                    disabled={catalogActionLoading === part.id}
                                    title="Delete Part"
                                  >
                                    {catalogActionLoading === part.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics & Reports Tab */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Analytics Period Selector */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Analytics & Reports
                      </CardTitle>
                      <CardDescription>Comprehensive platform analytics and insights</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Select value={selectedAnalyticsPeriod} onValueChange={setSelectedAnalyticsPeriod}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="90d">Last 90 days</SelectItem>
                          <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={fetchAnalytics} disabled={analyticsLoading}>
                        {analyticsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Revenue Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          ₹{analyticsLoading ? '...' : (revenueReport?.totalRevenue || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600">+15% from last period</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Courier Margin</p>
                        <p className="text-2xl font-bold">
                          ₹{analyticsLoading ? '...' : (revenueReport?.courierMargin || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-600">15% margin rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Truck className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Shipments</p>
                        <p className="text-2xl font-bold">
                          {analyticsLoading ? '...' : shipmentMetrics?.totalShipments || 0}
                        </p>
                        <p className="text-xs text-purple-600">
                          {shipmentMetrics?.onTimeDeliveryRate || 96}% on-time delivery
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <RotateCcw className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Returns</p>
                        <p className="text-2xl font-bold">
                          {analyticsLoading ? '...' : returnAnalytics?.totalReturns || 0}
                        </p>
                        <p className="text-xs text-orange-600">
                          {returnAnalytics?.returnRate || 3.8}% return rate
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Analytics Charts and Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                    <CardDescription>Monthly revenue and margin analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center border rounded">
                        <div className="text-center">
                          <LineChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">Revenue Chart</p>
                          <p className="text-xs text-gray-400">
                            Total: ₹{(revenueReport?.totalRevenue || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Shipment Metrics</CardTitle>
                    <CardDescription>Delivery performance overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>On-time Delivery</span>
                          <span>{shipmentMetrics?.onTimeDeliveryRate || 96}%</span>
                        </div>
                        <Progress value={shipmentMetrics?.onTimeDeliveryRate || 96} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Average Delivery Time</span>
                          <span>{shipmentMetrics?.averageDeliveryTime || 2.3} days</span>
                        </div>
                        <Progress value={77} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Delivered Shipments</span>
                          <span>{shipmentMetrics?.deliveredShipments || 0}</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Pending Shipments</span>
                          <span>{shipmentMetrics?.pendingShipments || 0}</span>
                        </div>
                        <Progress value={15} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Return Reasons</CardTitle>
                    <CardDescription>Analysis of return patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {returnAnalytics?.topReturnReasons.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{item.reason}</p>
                            <p className="text-xs text-gray-500">{item.count} returns</p>
                          </div>
                          <Badge variant="outline">{item.percentage}%</Badge>
                        </div>
                      )) || (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No return data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Movement</CardTitle>
                    <CardDescription>Top moving parts this period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {inventoryMovement?.topMovingParts.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{item.partName}</p>
                            <p className="text-xs text-gray-500">{item.brand}</p>
                          </div>
                          <Badge variant="outline">{item.movement}</Badge>
                        </div>
                      )) || (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No movement data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Part Approvals Tab */}
            <TabsContent value="approvals" className="space-y-6">
              {/* Approval Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold">{approvalStats.pending}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Under Review</p>
                        <p className="text-2xl font-bold">{approvalStats.underReview}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Approved</p>
                        <p className="text-2xl font-bold">{approvalStats.approved}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Rejected</p>
                        <p className="text-2xl font-bold">{approvalStats.rejected}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Part Approval Queue */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Part Approval Queue
                      </CardTitle>
                      <CardDescription>Review and approve parts submitted by brands</CardDescription>
                    </div>
                    <Button variant="outline" onClick={fetchPartApprovals} disabled={approvalsLoading}>
                      {approvalsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search parts by name or code..."
                          value={approvalSearchTerm}
                          onChange={(e) => setApprovalSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={approvalFilterStatus} onValueChange={setApprovalFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Results Summary */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Showing {filteredApprovals.length} of {partApprovals.length} parts
                    </p>
                  </div>

                  {/* Approvals Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvalsLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500">Loading approvals...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredApprovals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {approvalSearchTerm || approvalFilterStatus !== 'ALL'
                                  ? 'No parts match your filters' 
                                  : 'No parts pending approval'
                                }
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredApprovals.map((part) => (
                            <TableRow key={part.id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm">{part.code}</TableCell>
                              <TableCell className="font-medium">{part.name}</TableCell>
                              <TableCell>{part.brand.name}</TableCell>
                              <TableCell className="font-mono">₹{part.price.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  part.approvalStatus === 'APPROVED' ? 'default' :
                                  part.approvalStatus === 'REJECTED' ? 'destructive' :
                                  part.approvalStatus === 'UNDER_REVIEW' ? 'secondary' : 'outline'
                                }>
                                  {part.approvalStatus.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>{part.usageCount} orders</TableCell>
                              <TableCell>{new Date(part.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {part.approvalStatus === 'PENDING' || part.approvalStatus === 'UNDER_REVIEW' ? (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handlePartApproval(part.id, 'approve')}
                                        disabled={approvalActionLoading === part.id}
                                        title="Approve Part"
                                      >
                                        {approvalActionLoading === part.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                      </Button>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm" title="Reject Part">
                                            <XCircle className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Reject Part</DialogTitle>
                                            <DialogDescription>
                                              Please provide a reason for rejecting this part.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <Textarea
                                              placeholder="Reason for rejection..."
                                              value={rejectionReason}
                                              onChange={(e) => setRejectionReason(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                              <Button 
                                                onClick={() => handlePartApproval(part.id, 'reject', rejectionReason)}
                                                variant="destructive"
                                                disabled={approvalActionLoading === part.id}
                                              >
                                                {approvalActionLoading === part.id ? (
                                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : null}
                                                Reject Part
                                              </Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    </>
                                  ) : (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" title="View Details">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Part Details</DialogTitle>
                                        </DialogHeader>
                                        <PartApprovalDetailsView part={part} />
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

// Part Form Component
function PartForm({ 
  part, 
  onSubmit, 
  loading, 
  brands, 
  categories, 
  onCancel 
}: { 
  part?: ProductCatalog;
  onSubmit: (data: any) => void;
  loading: boolean;
  brands: User[];
  categories: string[];
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    code: part?.code || '',
    name: part?.name || '',
    description: part?.description || '',
    price: part?.price?.toString() || '',
    msl: part?.msl?.toString() || '',
    brandId: part?.brandId || '',
    category: part?.category || '',
    isActive: part?.isActive ?? true
  });

  const [errors, setErrors] = useState<any>({});

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.code.trim()) newErrors.code = 'Part code is required';
    if (!formData.name.trim()) newErrors.name = 'Part name is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.msl || parseInt(formData.msl) < 0) newErrors.msl = 'Valid MSL is required';
    if (!formData.brandId) newErrors.brandId = 'Brand is required';
    if (!formData.category) newErrors.category = 'Category is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        price: parseFloat(formData.price),
        msl: parseInt(formData.msl)
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Part Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="Enter part code"
            disabled={loading}
            className={errors.code ? 'border-red-500' : ''}
          />
          {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Part Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter part name"
            disabled={loading}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter part description"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (₹) *</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            placeholder="Enter price"
            min="0"
            step="0.01"
            disabled={loading}
            className={errors.price ? 'border-red-500' : ''}
          />
          {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="msl">MSL *</Label>
          <Input
            id="msl"
            type="number"
            value={formData.msl}
            onChange={(e) => setFormData(prev => ({ ...prev, msl: e.target.value }))}
            placeholder="Enter MSL"
            min="0"
            disabled={loading}
            className={errors.msl ? 'border-red-500' : ''}
          />
          {errors.msl && <p className="text-sm text-red-500">{errors.msl}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brandId">Brand *</Label>
          <Select 
            value={formData.brandId} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, brandId: value }))}
            disabled={loading}
          >
            <SelectTrigger className={errors.brandId ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(brand => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.brandId && <p className="text-sm text-red-500">{errors.brandId}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            disabled={loading}
          >
            <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="isActive" 
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          disabled={loading}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {part ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              {part ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {part ? 'Update Part' : 'Create Part'}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Part Details View Component
function PartDetailsView({ part }: { part: ProductCatalog }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-500">Part Code</Label>
          <p className="text-sm font-mono text-gray-900">{part.code}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Name</Label>
          <p className="text-sm text-gray-900">{part.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Brand</Label>
          <p className="text-sm text-gray-900">{part.brand.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Category</Label>
          <Badge variant="outline">{part.category}</Badge>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Price</Label>
          <p className="text-sm font-mono text-gray-900">₹{part.price.toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">MSL</Label>
          <Badge variant={part.msl <= 0 ? 'destructive' : part.msl <= 10 ? 'secondary' : 'default'}>
            {part.msl}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Status</Label>
          <Badge variant={part.isActive ? 'default' : 'secondary'}>
            {part.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Created</Label>
          <p className="text-sm text-gray-900">{new Date(part.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {part.description && (
        <div>
          <Label className="text-sm font-medium text-gray-500">Description</Label>
          <p className="text-sm text-gray-900 mt-1">{part.description}</p>
        </div>
      )}
    </div>
  );
}

// Part Approval Details View Component
function PartApprovalDetailsView({ part }: { part: PartApproval }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-500">Part Code</Label>
          <p className="text-sm font-mono text-gray-900">{part.code}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Name</Label>
          <p className="text-sm text-gray-900">{part.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Brand</Label>
          <p className="text-sm text-gray-900">{part.brand.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Price</Label>
          <p className="text-sm font-mono text-gray-900">₹{part.price.toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Status</Label>
          <Badge variant={
            part.approvalStatus === 'APPROVED' ? 'default' :
            part.approvalStatus === 'REJECTED' ? 'destructive' :
            part.approvalStatus === 'UNDER_REVIEW' ? 'secondary' : 'outline'
          }>
            {part.approvalStatus.replace('_', ' ')}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Usage Count</Label>
          <p className="text-sm text-gray-900">{part.usageCount} orders</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Pending Orders</Label>
          <p className="text-sm text-gray-900">{part.pendingOrders}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Submitted</Label>
          <p className="text-sm text-gray-900">{new Date(part.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {part.description && (
        <div>
          <Label className="text-sm font-medium text-gray-500">Description</Label>
          <p className="text-sm text-gray-900 mt-1">{part.description}</p>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminDashboardPart3Page() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <SuperAdminDashboardPart3 />
    </ProtectedRoute>
  );
}

// Prevent static generation for this page since it requires authentication
export async function getServerSideProps() {
  return {
    props: {}
  };
}