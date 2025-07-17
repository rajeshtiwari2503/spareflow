import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Users, DollarSign, Package, TrendingUp, Eye, Edit, Trash2, Plus, Download, Upload, RefreshCw, Search, Filter, AlertTriangle, CheckCircle, XCircle, Clock, Settings, BarChart3, FileText, Bell, Shield } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
  walletBalance?: number;
  isVerified: boolean;
}

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  totalParts: number;
  activeUsers: number;
  pendingOrders: number;
  lowStockAlerts: number;
  systemHealth: number;
}

interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

interface Part {
  id: string;
  name: string;
  partNumber: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  createdAt: string;
}

interface CourierLog {
  id: string;
  awbNumber: string;
  service: string;
  status: string;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
}

const SuperAdminDashboard: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [courierLogs, setCourierLogs] = useState<CourierLog[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  
  // Filter states
  const [userFilter, setUserFilter] = useState({ role: '', status: '', search: '' });
  const [walletFilter, setWalletFilter] = useState({ type: '', status: '', search: '' });
  const [partFilter, setPartFilter] = useState({ category: '', status: '', search: '' });
  
  // Dialog states
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [editWalletDialog, setEditWalletDialog] = useState(false);
  const [editPartDialog, setEditPartDialog] = useState(false);
  const [editConfigDialog, setEditConfigDialog] = useState(false);
  
  // Selected items for editing
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);
  
  // Form states
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    status: '',
    walletBalance: 0
  });
  
  const [walletForm, setWalletForm] = useState({
    userId: '',
    type: '',
    amount: 0,
    description: '',
    status: ''
  });
  
  const [partForm, setPartForm] = useState({
    name: '',
    partNumber: '',
    brand: '',
    category: '',
    price: 0,
    stock: 0,
    status: ''
  });
  
  const [configForm, setConfigForm] = useState({
    key: '',
    value: '',
    description: '',
    category: ''
  });

  // Helper function to get auth token
  const getAuthToken = (): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  };

  // API call helper with error handling
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive"
      });
      router.push('/auth/login');
      return null;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Session Expired",
            description: "Please login again",
            variant: "destructive"
          });
          router.push('/auth/login');
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call error:', error);
      toast({
        title: "API Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
      return null;
    }
  };

  // Load dashboard data
  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/dashboard');
      if (data) {
        setDashboardStats(data);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/users');
      if (data && data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load wallet transactions
  const loadWalletTransactions = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/wallet');
      if (data && data.transactions) {
        setWalletTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error loading wallet transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load parts
  const loadParts = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/product-catalog');
      if (data && data.parts) {
        setParts(data.parts);
      }
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load courier logs
  const loadCourierLogs = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/courier-logs');
      if (data && data.logs) {
        setCourierLogs(data.logs);
      }
    } catch (error) {
      console.error('Error loading courier logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load system configs
  const loadSystemConfigs = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/system-config');
      if (data && data.configs) {
        setSystemConfigs(data.configs);
      }
    } catch (error) {
      console.error('Error loading system configs:', error);
    } finally {
      setLoading(false);
    }
  };

  // User management functions
  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(userForm)
      });

      if (data) {
        toast({
          title: "Success",
          description: "User created successfully",
        });
        setEditUserDialog(false);
        setUserForm({ name: '', email: '', phone: '', role: '', status: '', walletBalance: 0 });
        loadUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !userForm.name || !userForm.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall(`/api/admin/users`, {
        method: 'PUT',
        body: JSON.stringify({ id: selectedUser.id, ...userForm })
      });

      if (data) {
        toast({
          title: "Success",
          description: "User updated successfully",
        });
        setEditUserDialog(false);
        setSelectedUser(null);
        loadUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    setLoading(true);
    try {
      const data = await apiCall(`/api/admin/users`, {
        method: 'DELETE',
        body: JSON.stringify({ id: userId })
      });

      if (data) {
        toast({
          title: "Success",
          description: "User deleted successfully",
        });
        loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    setLoading(true);
    try {
      const data = await apiCall(`/api/admin/users`, {
        method: 'PUT',
        body: JSON.stringify({ id: userId, status: newStatus })
      });

      if (data) {
        toast({
          title: "Success",
          description: `User status updated to ${newStatus}`,
        });
        loadUsers();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Wallet management functions
  const handleCreateWalletTransaction = async () => {
    if (!walletForm.userId || !walletForm.type || !walletForm.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall('/api/admin/wallet', {
        method: 'POST',
        body: JSON.stringify(walletForm)
      });

      if (data) {
        toast({
          title: "Success",
          description: "Wallet transaction created successfully",
        });
        setEditWalletDialog(false);
        setWalletForm({ userId: '', type: '', amount: 0, description: '', status: '' });
        loadWalletTransactions();
      }
    } catch (error) {
      console.error('Error creating wallet transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWalletTransaction = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      const data = await apiCall(`/api/admin/wallet`, {
        method: 'PUT',
        body: JSON.stringify({ id: selectedTransaction.id, ...walletForm })
      });

      if (data) {
        toast({
          title: "Success",
          description: "Wallet transaction updated successfully",
        });
        setEditWalletDialog(false);
        setSelectedTransaction(null);
        loadWalletTransactions();
      }
    } catch (error) {
      console.error('Error updating wallet transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  // Part management functions
  const handleCreatePart = async () => {
    if (!partForm.name || !partForm.partNumber || !partForm.brand) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall('/api/admin/product-catalog', {
        method: 'POST',
        body: JSON.stringify(partForm)
      });

      if (data) {
        toast({
          title: "Success",
          description: "Part created successfully",
        });
        setEditPartDialog(false);
        setPartForm({ name: '', partNumber: '', brand: '', category: '', price: 0, stock: 0, status: '' });
        loadParts();
      }
    } catch (error) {
      console.error('Error creating part:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePart = async () => {
    if (!selectedPart) return;

    setLoading(true);
    try {
      const data = await apiCall(`/api/admin/product-catalog`, {
        method: 'PUT',
        body: JSON.stringify({ id: selectedPart.id, ...partForm })
      });

      if (data) {
        toast({
          title: "Success",
          description: "Part updated successfully",
        });
        setEditPartDialog(false);
        setSelectedPart(null);
        loadParts();
      }
    } catch (error) {
      console.error('Error updating part:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Are you sure you want to delete this part?')) return;

    setLoading(true);
    try {
      const data = await apiCall(`/api/admin/product-catalog`, {
        method: 'DELETE',
        body: JSON.stringify({ id: partId })
      });

      if (data) {
        toast({
          title: "Success",
          description: "Part deleted successfully",
        });
        loadParts();
      }
    } catch (error) {
      console.error('Error deleting part:', error);
    } finally {
      setLoading(false);
    }
  };

  // System config functions
  const handleCreateConfig = async () => {
    if (!configForm.key || !configForm.value) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall('/api/admin/system-config', {
        method: 'POST',
        body: JSON.stringify(configForm)
      });

      if (data) {
        toast({
          title: "Success",
          description: "Configuration created successfully",
        });
        setEditConfigDialog(false);
        setConfigForm({ key: '', value: '', description: '', category: '' });
        loadSystemConfigs();
      }
    } catch (error) {
      console.error('Error creating config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedConfig) return;

    setLoading(true);
    try {
      const data = await apiCall(`/api/admin/system-config`, {
        method: 'PUT',
        body: JSON.stringify({ id: selectedConfig.id, ...configForm })
      });

      if (data) {
        toast({
          title: "Success",
          description: "Configuration updated successfully",
        });
        setEditConfigDialog(false);
        setSelectedConfig(null);
        loadSystemConfigs();
      }
    } catch (error) {
      console.error('Error updating config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const handleExportUsers = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/users?export=true');
      if (data) {
        // Create and download CSV
        const csvContent = "data:text/csv;charset=utf-8," + data.csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "users_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Success",
          description: "Users exported successfully",
        });
      }
    } catch (error) {
      console.error('Error exporting users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportWalletTransactions = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/admin/wallet?export=true');
      if (data) {
        const csvContent = "data:text/csv;charset=utf-8," + data.csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "wallet_transactions_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Success",
          description: "Wallet transactions exported successfully",
        });
      }
    } catch (error) {
      console.error('Error exporting wallet transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filteredUsers = users.filter(user => {
    return (
      (!userFilter.role || user.role === userFilter.role) &&
      (!userFilter.status || user.status === userFilter.status) &&
      (!userFilter.search || 
        user.name.toLowerCase().includes(userFilter.search.toLowerCase()) ||
        user.email.toLowerCase().includes(userFilter.search.toLowerCase())
      )
    );
  });

  const filteredWalletTransactions = walletTransactions.filter(transaction => {
    return (
      (!walletFilter.type || transaction.type === walletFilter.type) &&
      (!walletFilter.status || transaction.status === walletFilter.status) &&
      (!walletFilter.search || 
        transaction.userName.toLowerCase().includes(walletFilter.search.toLowerCase()) ||
        transaction.description.toLowerCase().includes(walletFilter.search.toLowerCase())
      )
    );
  });

  const filteredParts = parts.filter(part => {
    return (
      (!partFilter.category || part.category === partFilter.category) &&
      (!partFilter.status || part.status === partFilter.status) &&
      (!partFilter.search || 
        part.name.toLowerCase().includes(partFilter.search.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(partFilter.search.toLowerCase()) ||
        part.brand.toLowerCase().includes(partFilter.search.toLowerCase())
      )
    );
  });

  // Initialize data on component mount
  useEffect(() => {
    loadDashboardStats();
    loadUsers();
    loadWalletTransactions();
    loadParts();
    loadCourierLogs();
    loadSystemConfigs();
  }, []);

  // Edit handlers
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      walletBalance: user.walletBalance || 0
    });
    setEditUserDialog(true);
  };

  const handleEditWalletTransaction = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction);
    setWalletForm({
      userId: transaction.userId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      status: transaction.status
    });
    setEditWalletDialog(true);
  };

  const handleEditPart = (part: Part) => {
    setSelectedPart(part);
    setPartForm({
      name: part.name,
      partNumber: part.partNumber,
      brand: part.brand,
      category: part.category,
      price: part.price,
      stock: part.stock,
      status: part.status
    });
    setEditPartDialog(true);
  };

  const handleEditConfig = (config: SystemConfig) => {
    setSelectedConfig(config);
    setConfigForm({
      key: config.key,
      value: config.value,
      description: config.description,
      category: config.category
    });
    setEditConfigDialog(true);
  };

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage users, system configurations, and monitor platform performance</p>
          </div>

          {/* Dashboard Stats */}
          {dashboardStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats.activeUsers} active users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{dashboardStats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats.totalOrders} total orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalParts}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats.lowStockAlerts} low stock alerts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.systemHealth}%</div>
                  <p className="text-xs text-muted-foreground">
                    All systems operational
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="catalog">Catalog</TabsTrigger>
              <TabsTrigger value="courier">Courier</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Manage all platform users and their permissions</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleExportUsers} variant="outline" disabled={loading}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button onClick={() => {
                        setSelectedUser(null);
                        setUserForm({ name: '', email: '', phone: '', role: '', status: '', walletBalance: 0 });
                        setEditUserDialog(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                      <Button onClick={loadUsers} variant="outline" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search users..."
                        value={userFilter.search}
                        onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })}
                      />
                    </div>
                    <Select value={userFilter.role} onValueChange={(value) => setUserFilter({ ...userFilter, role: value })}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Roles</SelectItem>
                        <SelectItem value="BRAND">Brand</SelectItem>
                        <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                        <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={userFilter.status} onValueChange={(value) => setUserFilter({ ...userFilter, status: value })}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Users Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Wallet Balance</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              <p className="mt-2">Loading users...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <p>No users found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <p>{user.name}</p>
                                  {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
                                </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'SUPER_ADMIN' ? 'destructive' : 'secondary'}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                    {user.status}
                                  </Badge>
                                  <Switch
                                    checked={user.status === 'ACTIVE'}
                                    onCheckedChange={() => handleToggleUserStatus(user.id, user.status)}
                                    disabled={loading}
                                  />
                                </div>
                              </TableCell>
                              <TableCell>₹{(user.walletBalance || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditUser(user)}
                                    disabled={loading}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4" />
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

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Wallet Management</CardTitle>
                      <CardDescription>Monitor and manage user wallet transactions</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleExportWalletTransactions} variant="outline" disabled={loading}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button onClick={() => {
                        setSelectedTransaction(null);
                        setWalletForm({ userId: '', type: '', amount: 0, description: '', status: '' });
                        setEditWalletDialog(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Transaction
                      </Button>
                      <Button onClick={loadWalletTransactions} variant="outline" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Wallet Filters */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search transactions..."
                        value={walletFilter.search}
                        onChange={(e) => setWalletFilter({ ...walletFilter, search: e.target.value })}
                      />
                    </div>
                    <Select value={walletFilter.type} onValueChange={(value) => setWalletFilter({ ...walletFilter, type: value })}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                        <SelectItem value="DEBIT">Debit</SelectItem>
                        <SelectItem value="REFUND">Refund</SelectItem>
                        <SelectItem value="PAYMENT">Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={walletFilter.status} onValueChange={(value) => setWalletFilter({ ...walletFilter, status: value })}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wallet Transactions Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              <p className="mt-2">Loading transactions...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredWalletTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <p>No transactions found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredWalletTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">{transaction.userName}</TableCell>
                              <TableCell>
                                <Badge variant={transaction.type === 'CREDIT' ? 'default' : 'secondary'}>
                                  {transaction.type}
                                </Badge>
                              </TableCell>
                              <TableCell className={transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                                {transaction.type === 'CREDIT' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  transaction.status === 'COMPLETED' ? 'default' :
                                  transaction.status === 'PENDING' ? 'secondary' : 'destructive'
                                }>
                                  {transaction.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditWalletTransaction(transaction)}
                                    disabled={loading}
                                  >
                                    <Edit className="h-4 w-4" />
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

            {/* Catalog Tab */}
            <TabsContent value="catalog" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Product Catalog</CardTitle>
                      <CardDescription>Manage spare parts and inventory</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        setSelectedPart(null);
                        setPartForm({ name: '', partNumber: '', brand: '', category: '', price: 0, stock: 0, status: '' });
                        setEditPartDialog(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Part
                      </Button>
                      <Button onClick={loadParts} variant="outline" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Part Filters */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search parts..."
                        value={partFilter.search}
                        onChange={(e) => setPartFilter({ ...partFilter, search: e.target.value })}
                      />
                    </div>
                    <Select value={partFilter.category} onValueChange={(value) => setPartFilter({ ...partFilter, category: value })}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        <SelectItem value="ENGINE">Engine</SelectItem>
                        <SelectItem value="TRANSMISSION">Transmission</SelectItem>
                        <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                        <SelectItem value="BODY">Body</SelectItem>
                        <SelectItem value="SUSPENSION">Suspension</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={partFilter.status} onValueChange={(value) => setPartFilter({ ...partFilter, status: value })}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parts Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part Name</TableHead>
                          <TableHead>Part Number</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              <p className="mt-2">Loading parts...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredParts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <p>No parts found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredParts.map((part) => (
                            <TableRow key={part.id}>
                              <TableCell className="font-medium">{part.name}</TableCell>
                              <TableCell>{part.partNumber}</TableCell>
                              <TableCell>{part.brand}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{part.category}</Badge>
                              </TableCell>
                              <TableCell>₹{part.price.toLocaleString()}</TableCell>
                              <TableCell>
                                <span className={part.stock < 10 ? 'text-red-600' : 'text-green-600'}>
                                  {part.stock}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={part.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                  {part.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditPart(part)}
                                    disabled={loading}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeletePart(part.id)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4" />
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

            {/* Courier Tab */}
            <TabsContent value="courier" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Courier Management</CardTitle>
                      <CardDescription>Monitor courier services and shipment logs</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={loadCourierLogs} variant="outline" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Courier Logs Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>AWB Number</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              <p className="mt-2">Loading courier logs...</p>
                            </TableCell>
                          </TableRow>
                        ) : courierLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <p>No courier logs found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          courierLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">{log.awbNumber}</TableCell>
                              <TableCell>{log.service}</TableCell>
                              <TableCell>
                                <Badge variant={log.status === 'DELIVERED' ? 'default' : 'secondary'}>
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell>₹{log.cost.toLocaleString()}</TableCell>
                              <TableCell>{new Date(log.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(log.updatedAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Reports</CardTitle>
                  <CardDescription>Platform performance metrics and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">User Growth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">+12%</div>
                        <p className="text-sm text-gray-600">This month</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Revenue Growth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">+8%</div>
                        <p className="text-sm text-gray-600">This month</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Order Volume</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-purple-600">+15%</div>
                        <p className="text-sm text-gray-600">This month</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>System Configuration</CardTitle>
                      <CardDescription>Manage system settings and configurations</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        setSelectedConfig(null);
                        setConfigForm({ key: '', value: '', description: '', category: '' });
                        setEditConfigDialog(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Config
                      </Button>
                      <Button onClick={loadSystemConfigs} variant="outline" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* System Configs Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              <p className="mt-2">Loading configurations...</p>
                            </TableCell>
                          </TableRow>
                        ) : systemConfigs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <p>No configurations found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          systemConfigs.map((config) => (
                            <TableRow key={config.id}>
                              <TableCell className="font-medium">{config.key}</TableCell>
                              <TableCell className="max-w-xs truncate">{config.value}</TableCell>
                              <TableCell>{config.description}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{config.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditConfig(config)}
                                    disabled={loading}
                                  >
                                    <Edit className="h-4 w-4" />
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

          {/* User Edit Dialog */}
          <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
                <DialogDescription>
                  {selectedUser ? 'Update user information' : 'Add a new user to the platform'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="Enter user name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRAND">Brand</SelectItem>
                      <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                      <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={userForm.status} onValueChange={(value) => setUserForm({ ...userForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="walletBalance">Wallet Balance</Label>
                  <Input
                    id="walletBalance"
                    type="number"
                    value={userForm.walletBalance}
                    onChange={(e) => setUserForm({ ...userForm, walletBalance: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter wallet balance"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditUserDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={selectedUser ? handleUpdateUser : handleCreateUser} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedUser ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Wallet Transaction Edit Dialog */}
          <Dialog open={editWalletDialog} onOpenChange={setEditWalletDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedTransaction ? 'Edit Transaction' : 'Create Transaction'}</DialogTitle>
                <DialogDescription>
                  {selectedTransaction ? 'Update transaction details' : 'Add a new wallet transaction'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userId">User ID *</Label>
                  <Input
                    id="userId"
                    value={walletForm.userId}
                    onChange={(e) => setWalletForm({ ...walletForm, userId: e.target.value })}
                    placeholder="Enter user ID"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={walletForm.type} onValueChange={(value) => setWalletForm({ ...walletForm, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                      <SelectItem value="DEBIT">Debit</SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                      <SelectItem value="PAYMENT">Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={walletForm.amount}
                    onChange={(e) => setWalletForm({ ...walletForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={walletForm.description}
                    onChange={(e) => setWalletForm({ ...walletForm, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={walletForm.status} onValueChange={(value) => setWalletForm({ ...walletForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditWalletDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={selectedTransaction ? handleUpdateWalletTransaction : handleCreateWalletTransaction} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedTransaction ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Part Edit Dialog */}
          <Dialog open={editPartDialog} onOpenChange={setEditPartDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedPart ? 'Edit Part' : 'Create Part'}</DialogTitle>
                <DialogDescription>
                  {selectedPart ? 'Update part information' : 'Add a new part to the catalog'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="partName">Part Name *</Label>
                  <Input
                    id="partName"
                    value={partForm.name}
                    onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                    placeholder="Enter part name"
                  />
                </div>
                <div>
                  <Label htmlFor="partNumber">Part Number *</Label>
                  <Input
                    id="partNumber"
                    value={partForm.partNumber}
                    onChange={(e) => setPartForm({ ...partForm, partNumber: e.target.value })}
                    placeholder="Enter part number"
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <Input
                    id="brand"
                    value={partForm.brand}
                    onChange={(e) => setPartForm({ ...partForm, brand: e.target.value })}
                    placeholder="Enter brand name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={partForm.category} onValueChange={(value) => setPartForm({ ...partForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENGINE">Engine</SelectItem>
                      <SelectItem value="TRANSMISSION">Transmission</SelectItem>
                      <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                      <SelectItem value="BODY">Body</SelectItem>
                      <SelectItem value="SUSPENSION">Suspension</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={partForm.price}
                    onChange={(e) => setPartForm({ ...partForm, price: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter price"
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={partForm.stock}
                    onChange={(e) => setPartForm({ ...partForm, stock: parseInt(e.target.value) || 0 })}
                    placeholder="Enter stock quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="partStatus">Status</Label>
                  <Select value={partForm.status} onValueChange={(value) => setPartForm({ ...partForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditPartDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={selectedPart ? handleUpdatePart : handleCreatePart} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedPart ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Config Edit Dialog */}
          <Dialog open={editConfigDialog} onOpenChange={setEditConfigDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedConfig ? 'Edit Configuration' : 'Create Configuration'}</DialogTitle>
                <DialogDescription>
                  {selectedConfig ? 'Update system configuration' : 'Add a new system configuration'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="configKey">Key *</Label>
                  <Input
                    id="configKey"
                    value={configForm.key}
                    onChange={(e) => setConfigForm({ ...configForm, key: e.target.value })}
                    placeholder="Enter configuration key"
                  />
                </div>
                <div>
                  <Label htmlFor="configValue">Value *</Label>
                  <Textarea
                    id="configValue"
                    value={configForm.value}
                    onChange={(e) => setConfigForm({ ...configForm, value: e.target.value })}
                    placeholder="Enter configuration value"
                  />
                </div>
                <div>
                  <Label htmlFor="configDescription">Description</Label>
                  <Textarea
                    id="configDescription"
                    value={configForm.description}
                    onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <Label htmlFor="configCategory">Category</Label>
                  <Input
                    id="configCategory"
                    value={configForm.category}
                    onChange={(e) => setConfigForm({ ...configForm, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditConfigDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={selectedConfig ? handleUpdateConfig : handleCreateConfig} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedConfig ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SuperAdminDashboard;