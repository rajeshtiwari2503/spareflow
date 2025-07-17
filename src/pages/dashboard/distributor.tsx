import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Wallet, 
  Users, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  BarChart3,
  Bell,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Star,
  Target,
  Zap,
  Activity,
  PieChart,
  LineChart,
  Settings,
  HelpCircle,
  FileText,
  Send,
  Archive,
  AlertCircle,
  CheckSquare,
  XCircle,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { DIYSupportAgent } from '@/components/DIYSupportAgent';
import RequestBrandAccess from '@/components/RequestBrandAccess';
import { AuthorizationGuard, AuthorizationStatusBanner } from '@/components/AuthorizationGuard';
import { useAuthorization } from '@/hooks/useAuthorization';
import DistributorShippingManager from '@/components/DistributorShippingManager';
import ComprehensiveProfileManager from '@/components/ComprehensiveProfileManager';

// Enhanced interfaces for comprehensive data management
interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  inventoryValue: number;
  lowStockItems: number;
  activeServiceCenters: number;
  walletBalance: number;
  pendingPayments: number;
  averageOrderValue: number;
  fulfillmentRate: number;
  customerSatisfaction: number;
  profitMargin: number;
}

interface Order {
  id: string;
  orderNumber: string;
  serviceCenterId: string;
  serviceCenterName: string;
  brandId: string;
  brandName: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  totalAmount: number;
  itemCount: number;
  orderDate: string;
  requiredBy: string;
  estimatedDelivery: string;
  awbNumber?: string;
  courierPartner?: string;
  items: OrderItem[];
  shippingAddress: string;
  contactPerson: string;
  contactPhone: string;
  notes?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  profitMargin: number;
}

interface OrderItem {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'BACKORDERED';
  estimatedRestockDate?: string;
}

interface InventoryItem {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  brandName: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  unitCost: number;
  sellingPrice: number;
  profitMargin: number;
  lastRestocked: string;
  lastSold: string;
  turnoverRate: number;
  location: string;
  supplier: string;
  leadTime: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  images: string[];
  specifications: Record<string, any>;
  demandForecast: number;
  seasonalTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  orderId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  timestamp: string;
  reference: string;
  category: 'ORDER_PAYMENT' | 'REFUND' | 'COMMISSION' | 'PENALTY' | 'BONUS' | 'WITHDRAWAL';
}

interface ServiceCenter {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  rating: number;
  totalOrders: number;
  monthlyOrders: number;
  averageOrderValue: number;
  paymentTerms: string;
  creditLimit: number;
  outstandingAmount: number;
  lastOrderDate: string;
  performanceScore: number;
}

interface Notification {
  id: string;
  type: 'ORDER' | 'INVENTORY' | 'PAYMENT' | 'SYSTEM' | 'ALERT';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  relatedId?: string;
}

interface PerformanceMetrics {
  orderFulfillmentRate: number;
  averageDeliveryTime: number;
  customerSatisfactionScore: number;
  inventoryTurnover: number;
  profitMargin: number;
  returnRate: number;
  onTimeDeliveryRate: number;
  stockAccuracy: number;
}

const DistributorDashboard: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout, isAuthenticated } = useAuth();
  
  // Authorization hook
  const { authStatus, loading: authLoading } = useAuthorization();
  
  // State management for all dashboard data
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  
  // Filter and search states
  const [orderFilter, setOrderFilter] = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30');
  
  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showStockUpdateDialog, setShowStockUpdateDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);

  // Helper function to handle unauthorized actions
  const handleUnauthorizedAction = (actionName: string) => {
    toast({
      title: "Authorization Required",
      description: `You need brand authorization to ${actionName}. Please request brand access first.`,
      variant: "destructive"
    });
    setActiveTab('request-access');
  };

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [
        statsResponse,
        ordersResponse,
        inventoryResponse,
        walletResponse,
        analyticsResponse
      ] = await Promise.all([
        fetch('/api/distributor/dashboard-stats'),
        fetch('/api/distributor/orders'),
        fetch('/api/distributor/inventory'),
        fetch('/api/distributor/wallet'),
        fetch('/api/distributor/analytics')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      }

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setInventory(inventoryData.inventory || []);
      }

      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setTransactions(walletData.transactions || []);
      }

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setPerformanceMetrics(analyticsData.metrics);
      }

      // Mock data for service centers and notifications
      setServiceCenters([
        {
          id: '1',
          name: 'Central Service Hub',
          location: 'Mumbai, Maharashtra',
          contactPerson: 'Rajesh Kumar',
          phone: '+91 98765 43210',
          email: 'rajesh@centralservice.com',
          status: 'ACTIVE',
          rating: 4.8,
          totalOrders: 245,
          monthlyOrders: 28,
          averageOrderValue: 15000,
          paymentTerms: 'NET 30',
          creditLimit: 500000,
          outstandingAmount: 75000,
          lastOrderDate: '2024-01-15',
          performanceScore: 92
        }
      ]);

      setNotifications([
        {
          id: '1',
          type: 'ORDER',
          title: 'New Urgent Order',
          message: 'Order #ORD-2024-001 requires immediate attention',
          priority: 'HIGH',
          timestamp: '2024-01-15T10:30:00Z',
          read: false,
          actionRequired: true,
          relatedId: 'ORD-2024-001'
        }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      const response = await fetch(`/api/distributor/orders/${orderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Order ${action} successfully`
        });
        loadDashboardData();
      } else {
        throw new Error('Failed to update order');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive"
      });
    }
  };

  const handleInventoryUpdate = async (itemId: string, newStock: number) => {
    try {
      const response = await fetch('/api/distributor/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, newStock })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Inventory updated successfully"
        });
        loadDashboardData();
        setShowStockUpdateDialog(false);
      } else {
        throw new Error('Failed to update inventory');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inventory",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      IN_STOCK: 'bg-green-100 text-green-800',
      LOW_STOCK: 'bg-yellow-100 text-yellow-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
      CRITICAL: 'bg-red-200 text-red-900'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading distributor dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">Distributor Dashboard</h1>
                <p className="text-muted-foreground">Comprehensive logistics management platform</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm" onClick={loadDashboardData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                {/* Notifications */}
                <div className="relative">
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </Button>
                </div>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                        <AvatarFallback>
                          {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {user?.role || 'DISTRIBUTOR'}
                          </Badge>
                          {user?.isActive && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => logout()}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Authorization Status Banner */}
          <AuthorizationStatusBanner className="mb-6" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-12">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="partners">Partners</TabsTrigger>
              <TabsTrigger value="request-access">Request Brand Access</TabsTrigger>
              <TabsTrigger value="logistics">Logistics</TabsTrigger>
              <TabsTrigger value="notifications">Alerts</TabsTrigger>
              <TabsTrigger value="ai-support">AI Support</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stats?.totalRevenue?.toLocaleString() || '0'}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-600">+12.5%</span> from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.totalOrders || 0} total orders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stats?.inventoryValue?.toLocaleString() || '0'}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.lowStockItems || 0} low stock alerts
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stats?.walletBalance?.toLocaleString() || '0'}</div>
                    <p className="text-xs text-muted-foreground">
                      ₹{stats?.pendingPayments?.toLocaleString() || '0'} pending
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Order Fulfillment Rate</span>
                      <span className="text-sm font-medium">{stats?.fulfillmentRate || 0}%</span>
                    </div>
                    <Progress value={stats?.fulfillmentRate || 0} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Customer Satisfaction</span>
                      <span className="text-sm font-medium">{stats?.customerSatisfaction || 0}%</span>
                    </div>
                    <Progress value={stats?.customerSatisfaction || 0} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Profit Margin</span>
                      <span className="text-sm font-medium">{stats?.profitMargin || 0}%</span>
                    </div>
                    <Progress value={stats?.profitMargin || 0} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest orders and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {orders.slice(0, 5).map((order) => (
                          <div key={order.id} className="flex items-center space-x-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                Order #{order.orderNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.serviceCenterName} • ₹{order.totalAmount.toLocaleString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Frequently used operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-20 flex-col">
                      <Plus className="h-6 w-6 mb-2" />
                      New Order
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Upload className="h-6 w-6 mb-2" />
                      Bulk Upload
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <BarChart3 className="h-6 w-6 mb-2" />
                      Generate Report
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Settings className="h-6 w-6 mb-2" />
                      Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              <AuthorizationGuard 
                feature="order management"
                onRequestAccess={() => setActiveTab('request-access')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Order Management</h2>
                    <p className="text-muted-foreground">Manage incoming orders and fulfillment</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <Select value={orderFilter} onValueChange={setOrderFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Orders</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Service Center</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders
                          .filter(order => 
                            orderFilter === 'all' || order.status.toLowerCase() === orderFilter ||
                            (orderFilter === 'urgent' && order.priority === 'URGENT')
                          )
                          .filter(order =>
                            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.serviceCenterName.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.orderNumber}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{order.serviceCenterName}</p>
                                  <p className="text-xs text-muted-foreground">{order.contactPerson}</p>
                                </div>
                              </TableCell>
                              <TableCell>{order.itemCount} items</TableCell>
                              <TableCell>₹{order.totalAmount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getPriorityColor(order.priority)}>
                                  {order.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(order.requiredBy).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowOrderDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {order.status === 'PENDING' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (!authStatus?.isAuthorized) {
                                          handleUnauthorizedAction('confirm orders');
                                          return;
                                        }
                                        handleOrderAction(order.id, 'confirm');
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {order.status === 'CONFIRMED' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (!authStatus?.isAuthorized) {
                                          handleUnauthorizedAction('process orders');
                                          return;
                                        }
                                        handleOrderAction(order.id, 'process');
                                      }}
                                    >
                                      <Truck className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </AuthorizationGuard>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Inventory Management</h2>
                  <p className="text-muted-foreground">Monitor stock levels and manage inventory</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setShowBulkUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Inventory Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <p className="text-2xl font-bold">{inventory.length}</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Low Stock</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {inventory.filter(item => item.currentStock <= item.minStockLevel).length}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Out of Stock</p>
                        <p className="text-2xl font-bold text-red-600">
                          {inventory.filter(item => item.currentStock === 0).length}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">
                          ₹{inventory.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Min Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.partNumber}</TableCell>
                          <TableCell>{item.partName}</TableCell>
                          <TableCell>{item.brandName}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{item.currentStock}</span>
                              {item.currentStock <= item.minStockLevel && (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.minStockLevel}</TableCell>
                          <TableCell>
                            <Badge className={
                              item.currentStock === 0 ? 'bg-red-100 text-red-800' :
                              item.currentStock <= item.minStockLevel ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }>
                              {item.currentStock === 0 ? 'OUT OF STOCK' :
                               item.currentStock <= item.minStockLevel ? 'LOW STOCK' : 'IN STOCK'}
                            </Badge>
                          </TableCell>
                          <TableCell>₹{item.unitCost.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInventoryItem(item);
                                  setShowInventoryDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInventoryItem(item);
                                  setShowStockUpdateDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Financial Management</h2>
                  <p className="text-muted-foreground">Track payments, transactions, and financial health</p>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Statement
                </Button>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wallet className="h-5 w-5 mr-2" />
                      Current Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      ₹{stats?.walletBalance?.toLocaleString() || '0'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Available for transactions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Pending Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      ₹{stats?.pendingPayments?.toLocaleString() || '0'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Awaiting settlement
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Monthly Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      ₹{stats?.monthlyRevenue?.toLocaleString() || '0'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="text-green-600">+8.2%</span> vs last month
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest financial activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 10).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.timestamp).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'CREDIT' ? 'default' : 'secondary'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className={transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'CREDIT' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{transaction.reference}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Performance Analytics</h2>
                  <p className="text-muted-foreground">Insights and trends for business optimization</p>
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Order Value</p>
                        <p className="text-2xl font-bold">₹{stats?.averageOrderValue?.toLocaleString() || '0'}</p>
                      </div>
                      <Target className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Fulfillment Rate</p>
                        <p className="text-2xl font-bold">{stats?.fulfillmentRate || 0}%</p>
                      </div>
                      <CheckSquare className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
                        <p className="text-2xl font-bold">{stats?.customerSatisfaction || 0}%</p>
                      </div>
                      <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Profit Margin</p>
                        <p className="text-2xl font-bold">{stats?.profitMargin || 0}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Trend</CardTitle>
                    <CardDescription>Revenue over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <LineChart className="h-16 w-16 mb-4" />
                      <p>Sales trend chart would be displayed here</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Distribution</CardTitle>
                    <CardDescription>Orders by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <PieChart className="h-16 w-16 mb-4" />
                      <p>Order distribution chart would be displayed here</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Insights</CardTitle>
                  <CardDescription>Recommendations for business optimization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Inventory Optimization:</strong> Consider increasing stock for Part #ABC123 - demand has increased by 45% this month.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Pricing Strategy:</strong> Your profit margin on electronics parts is 8% below industry average. Consider price adjustments.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Customer Retention:</strong> Service centers with payment terms NET 15 show 23% higher order frequency.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Partners Tab */}
            <TabsContent value="partners" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Partner Management</h2>
                  <p className="text-muted-foreground">Manage relationships with service centers and brands</p>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Partner
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceCenters.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{partner.name}</p>
                              <div className="flex items-center mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < Math.floor(partner.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="text-xs text-muted-foreground ml-1">
                                  {partner.rating}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                              {partner.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                {partner.phone}
                              </div>
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                                {partner.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(partner.status)}>
                              {partner.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>Score: {partner.performanceScore}%</p>
                              <p className="text-muted-foreground">{partner.monthlyOrders} orders/month</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">₹{partner.outstandingAmount.toLocaleString()}</p>
                              <p className="text-muted-foreground">Limit: ₹{partner.creditLimit.toLocaleString()}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logistics Tab */}
            <TabsContent value="logistics" className="space-y-6">
              <AuthorizationGuard 
                feature="distributor shipping"
                onRequestAccess={() => setActiveTab('request-access')}
              >
                <DistributorShippingManager />
              </AuthorizationGuard>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Notifications & Alerts</h2>
                  <p className="text-muted-foreground">Stay updated with important system notifications</p>
                </div>
                <Button variant="outline">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              </div>

              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card key={notification.id} className={!notification.read ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                            {notification.type === 'ORDER' && <ShoppingCart className="h-4 w-4" />}
                            {notification.type === 'INVENTORY' && <Package className="h-4 w-4" />}
                            {notification.type === 'PAYMENT' && <DollarSign className="h-4 w-4" />}
                            {notification.type === 'SYSTEM' && <Settings className="h-4 w-4" />}
                            {notification.type === 'ALERT' && <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{notification.title}</h4>
                              <Badge className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                              {notification.actionRequired && (
                                <Badge variant="destructive">Action Required</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {notification.actionRequired && (
                            <Button size="sm">Take Action</Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Request Brand Access Tab */}
            <TabsContent value="request-access" className="space-y-6">
              <RequestBrandAccess userRole="DISTRIBUTOR" />
            </TabsContent>

            {/* AI Support Tab */}
            <TabsContent value="ai-support" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">AI-Powered Support</h2>
                <p className="text-muted-foreground">Get intelligent assistance for your distribution operations</p>
              </div>
              
              <DIYSupportAgent />
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Profile Management</h2>
                <p className="text-muted-foreground">Manage your distributor profile and account information</p>
              </div>
              
              <ComprehensiveProfileManager />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Account Settings</h2>
                  <p className="text-muted-foreground">Configure your account preferences and security settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Account Information
                    </CardTitle>
                    <CardDescription>Basic account details and status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                        <AvatarFallback className="text-lg">
                          {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{user?.name || 'User Name'}</h3>
                        <p className="text-muted-foreground">{user?.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary">{user?.role || 'DISTRIBUTOR'}</Badge>
                          <Badge variant="outline" className="text-green-600">
                            {user?.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Member Since</span>
                        <span className="text-sm font-medium">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Login</span>
                        <span className="text-sm font-medium">
                          {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Account Status</span>
                        <Badge variant={user?.isActive ? 'default' : 'secondary'}>
                          {user?.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>Manage your account security and privacy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Change Password</p>
                          <p className="text-sm text-muted-foreground">Update your account password</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Change
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Enable
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Login Sessions</p>
                          <p className="text-sm text-muted-foreground">Manage active sessions</p>
                        </div>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>Configure how you receive notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-muted-foreground">Receive updates via email</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">SMS Notifications</p>
                          <p className="text-sm text-muted-foreground">Receive urgent alerts via SMS</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Push Notifications</p>
                          <p className="text-sm text-muted-foreground">Browser push notifications</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      System Preferences
                    </CardTitle>
                    <CardDescription>Customize your dashboard experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select defaultValue="en">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="mr">Marathi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select defaultValue="asia/kolkata">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asia/kolkata">Asia/Kolkata (IST)</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select defaultValue="inr">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                            <SelectItem value="usd">US Dollar ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Danger Zone */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-red-600">Deactivate Account</p>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable your account. You can reactivate it later.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Deactivate
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-red-600">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data. This cannot be undone.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Order Details Dialog */}
        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
              <DialogDescription>
                Complete order information and management options
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Service Center</Label>
                      <p className="font-medium">{selectedOrder.serviceCenterName}</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.contactPerson}</p>
                    </div>
                    <div>
                      <Label>Order Status</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(selectedOrder.status)}>
                          {selectedOrder.status}
                        </Badge>
                        <Badge className={getPriorityColor(selectedOrder.priority)}>
                          {selectedOrder.priority}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label>Order Value</Label>
                      <p className="text-2xl font-bold">₹{selectedOrder.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Required By</Label>
                      <p>{new Date(selectedOrder.requiredBy).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label>Shipping Address</Label>
                      <p className="text-sm">{selectedOrder.shippingAddress}</p>
                    </div>
                    {selectedOrder.awbNumber && (
                      <div>
                        <Label>AWB Number</Label>
                        <p className="font-mono">{selectedOrder.awbNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Order Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Availability</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{item.partNumber}</TableCell>
                          <TableCell>{item.partName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell>₹{item.totalPrice.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(item.availability)}>
                              {item.availability.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
                    Close
                  </Button>
                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <Button 
                        variant="destructive"
                        onClick={() => handleOrderAction(selectedOrder.id, 'reject')}
                      >
                        Reject Order
                      </Button>
                      <Button onClick={() => handleOrderAction(selectedOrder.id, 'confirm')}>
                        Confirm Order
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && (
                    <Button onClick={() => handleOrderAction(selectedOrder.id, 'process')}>
                      Start Processing
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Inventory Details Dialog */}
        <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Inventory Details - {selectedInventoryItem?.partNumber}</DialogTitle>
              <DialogDescription>
                Complete part information and stock management
              </DialogDescription>
            </DialogHeader>
            {selectedInventoryItem && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Part Information</Label>
                      <div className="space-y-2">
                        <p><strong>Part Number:</strong> {selectedInventoryItem.partNumber}</p>
                        <p><strong>Name:</strong> {selectedInventoryItem.partName}</p>
                        <p><strong>Brand:</strong> {selectedInventoryItem.brandName}</p>
                        <p><strong>Category:</strong> {selectedInventoryItem.category}</p>
                      </div>
                    </div>
                    <div>
                      <Label>Stock Information</Label>
                      <div className="space-y-2">
                        <p><strong>Current Stock:</strong> {selectedInventoryItem.currentStock}</p>
                        <p><strong>Min Level:</strong> {selectedInventoryItem.minStockLevel}</p>
                        <p><strong>Max Level:</strong> {selectedInventoryItem.maxStockLevel}</p>
                        <p><strong>Reorder Point:</strong> {selectedInventoryItem.reorderPoint}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Pricing</Label>
                      <div className="space-y-2">
                        <p><strong>Unit Cost:</strong> ₹{selectedInventoryItem.unitCost.toLocaleString()}</p>
                        <p><strong>Selling Price:</strong> ₹{selectedInventoryItem.sellingPrice.toLocaleString()}</p>
                        <p><strong>Profit Margin:</strong> {selectedInventoryItem.profitMargin}%</p>
                      </div>
                    </div>
                    <div>
                      <Label>Performance</Label>
                      <div className="space-y-2">
                        <p><strong>Turnover Rate:</strong> {selectedInventoryItem.turnoverRate}x</p>
                        <p><strong>Last Restocked:</strong> {new Date(selectedInventoryItem.lastRestocked).toLocaleDateString()}</p>
                        <p><strong>Last Sold:</strong> {new Date(selectedInventoryItem.lastSold).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowInventoryDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setShowInventoryDialog(false);
                    setShowStockUpdateDialog(true);
                  }}>
                    Update Stock
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Stock Update Dialog */}
        <Dialog open={showStockUpdateDialog} onOpenChange={setShowStockUpdateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock - {selectedInventoryItem?.partNumber}</DialogTitle>
              <DialogDescription>
                Adjust inventory levels for this part
              </DialogDescription>
            </DialogHeader>
            {selectedInventoryItem && (
              <div className="space-y-4">
                <div>
                  <Label>Current Stock</Label>
                  <p className="text-2xl font-bold">{selectedInventoryItem.currentStock}</p>
                </div>
                <div>
                  <Label htmlFor="newStock">New Stock Level</Label>
                  <Input
                    id="newStock"
                    type="number"
                    placeholder="Enter new stock level"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason for Update</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restock">New Stock Received</SelectItem>
                      <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                      <SelectItem value="damage">Damaged Stock</SelectItem>
                      <SelectItem value="return">Customer Return</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this stock update"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowStockUpdateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    // Handle stock update
                    setShowStockUpdateDialog(false);
                  }}>
                    Update Stock
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Inventory Upload</DialogTitle>
              <DialogDescription>
                Upload inventory data using CSV or Excel file
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Upload File</Label>
                <Input type="file" accept=".csv,.xlsx,.xls" />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>
              <div>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowBulkUploadDialog(false)}>
                  Cancel
                </Button>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default DistributorDashboard;