import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Truck, 
  Users, 
  Wallet, 
  RotateCcw, 
  TrendingUp,
  Plus,
  Bell,
  Eye,
  Network,
  AlertTriangle,
  Activity,
  Calendar,
  DollarSign,
  ShoppingCart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface DashboardStats {
  metrics: {
    totalParts: number;
    activeShipments: number;
    authorizedPartners: number;
    walletBalance: number;
    pendingReturns: number;
    monthlyRevenue: number;
  };
  breakdown: {
    authorizedServiceCenters: number;
    authorizedDistributors: number;
  };
  recentActivity: {
    shipments: Array<{
      id: string;
      status: string;
      createdAt: string;
      serviceCenter: {
        name: string;
      };
    }>;
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      isRead: boolean;
      createdAt: string;
    }>;
  };
  alerts: {
    lowStockParts: Array<{
      id: string;
      name: string;
      partNumber: string;
      stockQuantity: number;
      minStockLevel: number;
    }>;
  };
  trends: {
    shipments: Array<{
      createdAt: string;
      _count: { id: number };
    }>;
    returns: Array<{
      status: string;
      _count: { id: number };
    }>;
  };
  topPerformers: {
    parts: Array<{
      id: string;
      partName: string;
      partNumber: string;
      price: number;
      shipmentCount: number;
    }>;
  };
}

interface BrandOverviewDashboardProps {
  onNavigate: (tab: string) => void;
}

const BrandOverviewDashboard: React.FC<BrandOverviewDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/brand/dashboard-stats', {
        credentials: 'include', // Include cookies in the request
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Failed to load dashboard data'}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={fetchDashboardStats}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.totalParts}</div>
            <p className="text-xs text-muted-foreground">
              Parts in your catalog
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.activeShipments}</div>
            <p className="text-xs text-muted-foreground">
              Currently in-transit
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authorized Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.authorizedPartners}</div>
            <p className="text-xs text-muted-foreground">
              {stats.breakdown.authorizedServiceCenters} Service Centers, {stats.breakdown.authorizedDistributors} Distributors
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.metrics.walletBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Available balance
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.pendingReturns}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.metrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Current month earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used actions for efficient workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button 
              onClick={() => onNavigate('shipment')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Create Shipment</span>
            </Button>
            
            <Button 
              onClick={() => onNavigate('inventory')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Package className="h-5 w-5" />
              <span className="text-sm">Add New Part</span>
            </Button>
            
            <Button 
              onClick={() => onNavigate('notifications')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Bell className="h-5 w-5" />
              <span className="text-sm">Notifications</span>
              {stats.recentActivity.notifications.filter(n => !n.isRead).length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.recentActivity.notifications.filter(n => !n.isRead).length}
                </Badge>
              )}
            </Button>
            
            <Button 
              onClick={() => onNavigate('wallet')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Wallet className="h-5 w-5" />
              <span className="text-sm">Wallet</span>
            </Button>
            
            <Button 
              onClick={() => onNavigate('network')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Network className="h-5 w-5" />
              <span className="text-sm">Manage Network</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Recent Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.shipments.length > 0 ? (
                stats.recentActivity.shipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(shipment.status)}
                      <div>
                        <p className="font-medium text-sm">Shipment #{shipment.id.slice(-8)}</p>
                        <p className="text-xs text-muted-foreground">{shipment.serviceCenter.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(shipment.status)}>
                        {shipment.status.replace('_', ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(shipment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent shipments</p>
              )}
            </div>
            {stats.recentActivity.shipments.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => onNavigate('shipment')}
              >
                View All Shipments
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.alerts.lowStockParts.length > 0 ? (
                stats.alerts.lowStockParts.map((part) => (
                  <div key={part.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                    <div>
                      <p className="font-medium text-sm">{part.name}</p>
                      <p className="text-xs text-muted-foreground">{part.partNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-orange-600">
                        {part.stockQuantity} left
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Min: {part.minStockLevel}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">All parts well stocked</p>
              )}
            </div>
            {stats.alerts.lowStockParts.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => onNavigate('inventory')}
              >
                Manage Inventory
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Parts */}
      {stats.topPerformers.parts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Performing Parts
            </CardTitle>
            <CardDescription>Most frequently shipped parts this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topPerformers.parts.map((part, index) => (
                <div key={part.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{part.partName}</p>
                      <p className="text-xs text-muted-foreground">{part.partNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{part.shipmentCount} shipments</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(part.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      {stats.recentActivity.notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    !notification.isRead ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('notifications')}
            >
              View All Notifications
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BrandOverviewDashboard;