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
  Users, Package, Truck, Settings, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, 
  Clock, FileText, Shield, AlertTriangle, Wallet, CreditCard, Calculator, BarChart3, 
  Upload, Download, RefreshCw, Database, Activity, TrendingUp, DollarSign, 
  ShoppingCart, RotateCcw, Bell, Search, Filter, Calendar, MapPin, Zap, Server, 
  Globe, Lock, UserCheck, UserX, Ban, CheckSquare, AlertCircle, Info, ExternalLink, 
  Copy, Archive, Star, Target, PieChart, LineChart, BarChart, TrendingDown, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Enhanced interfaces with better typing
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  parts?: any[];
  brandShipments?: any[];
  serviceCenterShipments?: any[];
  reverseRequests?: any[];
  distributorOrders?: any[];
  brandOrders?: any[];
  serviceCenterOrders?: any[];
  customerOrders?: any[];
}

interface DashboardStats {
  statistics: {
    totalUsers: number;
    totalBrands: number;
    totalDistributors: number;
    totalServiceCenters: number;
    totalCustomers: number;
    totalParts: number;
    totalShipments: number;
    totalPurchaseOrders: number;
    totalCustomerOrders: number;
    totalReverseRequests: number;
  };
  recentActivity: {
    recentUsers: User[];
    recentShipments: any[];
    recentCustomerOrders: any[];
  };
}

interface CreateUserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

function SuperAdminDashboardPart1() {
  // State management with proper typing
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // User management states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true);
    initializeDashboard();
  }, []);

  // Initialize dashboard data
  const initializeDashboard = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchDashboardStats()
      ]);
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users with proper error handling
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
      toast.success('Users loaded successfully');
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboardStats(data);
      toast.success('Dashboard stats loaded successfully');
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to fetch dashboard statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Create new user with validation and error handling
  const handleCreateUser = async (formData: CreateUserFormData) => {
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error('All fields are required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setCreateUserLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const newUser = await response.json();
      setUsers(prev => [newUser, ...prev]);
      setIsCreateUserOpen(false);
      toast.success(`User ${newUser.name} created successfully`);
      
      // Refresh dashboard stats
      fetchDashboardStats();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Delete user with confirmation
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success(`User ${userName} deleted successfully`);
      
      // Refresh dashboard stats
      fetchDashboardStats();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle user actions (approve/deactivate)
  const handleUserAction = async (userId: string, action: 'approve' | 'deactivate', originalName?: string) => {
    const actionText = action === 'approve' ? 'approve' : 'deactivate';
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      toast.error('User not found');
      return;
    }

    if (!confirm(`Are you sure you want to ${actionText} user "${user.name}"?`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, action, originalName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${actionText} user`);
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      toast.success(`User ${user.name} ${action === 'approve' ? 'approved' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error(`Error ${actionText}ing user:`, error);
      toast.error(error.message || `Failed to ${actionText} user`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || 
                         (filterStatus === 'ACTIVE' && !user.name.includes('[DEACTIVATED]')) ||
                         (filterStatus === 'DEACTIVATED' && user.name.includes('[DEACTIVATED]'));
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate user statistics
  const userStats = {
    total: users.length,
    brands: users.filter(u => u.role === 'BRAND').length,
    distributors: users.filter(u => u.role === 'DISTRIBUTOR').length,
    serviceCenters: users.filter(u => u.role === 'SERVICE_CENTER').length,
    customers: users.filter(u => u.role === 'CUSTOMER').length,
    active: users.filter(u => !u.name.includes('[DEACTIVATED]')).length,
    deactivated: users.filter(u => u.name.includes('[DEACTIVATED]')).length,
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
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
            <p className="text-gray-600">Manage the entire SpareFlow platform - Part 1: Overview & Users</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Dashboard Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statsLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            dashboardStats?.statistics.totalUsers || userStats.total
                          )}
                        </p>
                        <p className="text-xs text-green-600">
                          {userStats.active} active, {userStats.deactivated} deactivated
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">₹2,47,850</p>
                        <p className="text-xs text-green-600">+15% from last month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Truck className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Shipments</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statsLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            dashboardStats?.statistics.totalShipments || 0
                          )}
                        </p>
                        <p className="text-xs text-blue-600">96% on-time delivery</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                        <p className="text-2xl font-bold text-gray-900">12</p>
                        <p className="text-xs text-orange-600">Requires attention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Health and Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-green-500" />
                          Platform Health
                        </CardTitle>
                        <CardDescription>System performance metrics</CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchDashboardStats}
                        disabled={statsLoading}
                      >
                        {statsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>System Uptime</span>
                        <span className="font-medium text-green-600">99.9%</span>
                      </div>
                      <Progress value={99.9} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>API Response Time</span>
                        <span className="font-medium">120ms</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Error Rate</span>
                        <span className="font-medium text-green-600">0.1%</span>
                      </div>
                      <Progress value={1} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>User Satisfaction</span>
                        <span className="font-medium text-green-600">4.8/5</span>
                      </div>
                      <Progress value={96} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Latest platform activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardStats?.recentActivity.recentUsers.slice(0, 5).map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">New user registered: {user.name}</p>
                            <p className="text-xs text-gray-500">
                              {user.role} • {new Date(user.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">{user.role}</Badge>
                        </div>
                      )) || (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Distribution and Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-500" />
                      User Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Brands</span>
                        <Badge variant="outline" className="bg-purple-50">
                          {userStats.brands}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Distributors</span>
                        <Badge variant="outline" className="bg-green-50">
                          {userStats.distributors}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Service Centers</span>
                        <Badge variant="outline" className="bg-blue-50">
                          {userStats.serviceCenters}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Customers</span>
                        <Badge variant="outline" className="bg-orange-50">
                          {userStats.customers}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-green-500" />
                      Platform Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Parts</span>
                        <span className="font-medium">
                          {dashboardStats?.statistics.totalParts || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Customer Orders</span>
                        <span className="font-medium">
                          {dashboardStats?.statistics.totalCustomerOrders || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Purchase Orders</span>
                        <span className="font-medium">
                          {dashboardStats?.statistics.totalPurchaseOrders || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Return Requests</span>
                        <span className="font-medium">
                          {dashboardStats?.statistics.totalReverseRequests || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setIsCreateUserOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New User
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload Parts
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={fetchDashboardStats}
                        disabled={statsLoading}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Reports
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        System Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Management Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* User Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold">{userStats.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Brands</p>
                        <p className="text-2xl font-bold">{userStats.brands}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Distributors</p>
                        <p className="text-2xl font-bold">{userStats.distributors}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Service Centers</p>
                        <p className="text-2xl font-bold">{userStats.serviceCenters}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Customers</p>
                        <p className="text-2xl font-bold">{userStats.customers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active</p>
                        <p className="text-2xl font-bold">{userStats.active}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        User Management
                      </CardTitle>
                      <CardDescription>View and manage all platform users</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={fetchUsers}
                        variant="outline"
                        disabled={usersLoading}
                      >
                        {usersLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add User
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                            <DialogDescription>Add a new user to the platform</DialogDescription>
                          </DialogHeader>
                          <CreateUserForm 
                            onSubmit={handleCreateUser} 
                            loading={createUserLoading}
                            onCancel={() => setIsCreateUserOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search users by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Roles</SelectItem>
                        <SelectItem value="BRAND">Brand</SelectItem>
                        <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                        <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Results Summary */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Showing {filteredUsers.length} of {users.length} users
                      {searchTerm && ` matching "${searchTerm}"`}
                      {filterRole !== 'ALL' && ` with role "${filterRole}"`}
                      {filterStatus !== 'ALL' && ` with status "${filterStatus}"`}
                    </p>
                  </div>

                  {/* Users Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500">Loading users...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {searchTerm || filterRole !== 'ALL' || filterStatus !== 'ALL' 
                                  ? 'No users match your filters' 
                                  : 'No users found'
                                }
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                {user.name.includes('[DEACTIVATED]') ? (
                                  <span className="text-red-500">{user.name}</span>
                                ) : (
                                  user.name
                                )}
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline"
                                  className={
                                    user.role === 'BRAND' ? 'bg-purple-50 text-purple-700' :
                                    user.role === 'DISTRIBUTOR' ? 'bg-green-50 text-green-700' :
                                    user.role === 'SERVICE_CENTER' ? 'bg-blue-50 text-blue-700' :
                                    user.role === 'CUSTOMER' ? 'bg-orange-50 text-orange-700' :
                                    'bg-gray-50 text-gray-700'
                                  }
                                >
                                  {user.role.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user.name.includes('[DEACTIVATED]') ? (
                                  <Badge variant="destructive">Deactivated</Badge>
                                ) : (
                                  <Badge variant="default">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
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
                                        <DialogTitle>User Details</DialogTitle>
                                      </DialogHeader>
                                      <UserDetailsView user={user} />
                                    </DialogContent>
                                  </Dialog>
                                  
                                  {!user.name.includes('[DEACTIVATED]') && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleUserAction(user.id, 'approve')}
                                        disabled={actionLoading === user.id}
                                        title="Approve User"
                                      >
                                        {actionLoading === user.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleUserAction(user.id, 'deactivate', user.name)}
                                        disabled={actionLoading === user.id}
                                        title="Deactivate User"
                                      >
                                        {actionLoading === user.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                      </Button>
                                    </>
                                  )}
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    disabled={actionLoading === user.id}
                                    title="Delete User"
                                  >
                                    {actionLoading === user.id ? (
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
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

// Enhanced Create User Form Component
function CreateUserForm({ 
  onSubmit, 
  loading, 
  onCancel 
}: { 
  onSubmit: (data: CreateUserFormData) => void; 
  loading: boolean;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateUserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER'
  });

  const [errors, setErrors] = useState<Partial<CreateUserFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<CreateUserFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof CreateUserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter full name"
          disabled={loading}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="Enter email address"
          disabled={loading}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          placeholder="Enter password (min 6 characters)"
          disabled={loading}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">User Role *</Label>
        <Select 
          value={formData.role} 
          onValueChange={(value) => handleInputChange('role', value)}
          disabled={loading}
        >
          <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select user role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BRAND">Brand</SelectItem>
            <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
            <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </>
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// User Details View Component
function UserDetailsView({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-500">Name</Label>
          <p className="text-sm text-gray-900">{user.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Email</Label>
          <p className="text-sm text-gray-900">{user.email}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-500">Role</Label>
          <Badge variant="outline" className="mt-1">
            {user.role.replace('_', ' ')}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Status</Label>
          <Badge 
            variant={user.name.includes('[DEACTIVATED]') ? 'destructive' : 'default'}
            className="mt-1"
          >
            {user.name.includes('[DEACTIVATED]') ? 'Deactivated' : 'Active'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-500">Created</Label>
          <p className="text-sm text-gray-900">{new Date(user.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
          <p className="text-sm text-gray-900">{new Date(user.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="border-t pt-4">
        <Label className="text-sm font-medium text-gray-500 mb-2 block">Activity Summary</Label>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>Parts Created:</span>
            <span className="font-medium">{user.parts?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Orders:</span>
            <span className="font-medium">
              {(user.customerOrders?.length || 0) + (user.brandOrders?.length || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Shipments:</span>
            <span className="font-medium">
              {(user.brandShipments?.length || 0) + (user.serviceCenterShipments?.length || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Returns:</span>
            <span className="font-medium">{user.reverseRequests?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboardPart1Page() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <SuperAdminDashboardPart1 />
    </ProtectedRoute>
  );
}

// Prevent static generation for this page since it requires authentication
export async function getServerSideProps() {
  return {
    props: {}
  };
}