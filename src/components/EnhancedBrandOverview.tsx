import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Loader,
  RefreshCw,
  Target,
  Zap,
  Star,
  TrendingDown,
  PieChart,
  LineChart,
  Settings
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

interface EnhancedBrandOverviewProps {
  onNavigate: (tab: string) => void;
}

const EnhancedBrandOverview: React.FC<EnhancedBrandOverviewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await fetch('/api/brand/dashboard-stats', {
        credentials: 'include',
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
      
      if (showRefreshing) {
        toast({
          title: "Dashboard Refreshed",
          description: "Latest data has been loaded successfully",
        });
      }
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
      setRefreshing(false);
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
      case 'dispatched': 
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'initiated':
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'dispatched':
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'initiated':
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMetricTrend = (current: number, previous: number) => {
    if (previous === 0) return { trend: 'neutral', percentage: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change)
    };
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
            onClick={() => fetchDashboardStats()}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600">Monitor your business performance and key metrics</p>
        </div>
        <Button 
          onClick={() => fetchDashboardStats(true)}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Parts */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.totalParts}</div>
            <p className="text-xs text-muted-foreground">
              Parts in your catalog
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="secondary" className="text-xs">
                Active Inventory
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Active Shipments */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.activeShipments}</div>
            <p className="text-xs text-muted-foreground">
              Currently in-transit
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="text-xs">
                In Progress
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Authorized Partners */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authorized Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.authorizedPartners}</div>
            <p className="text-xs text-muted-foreground">
              {stats.breakdown.authorizedServiceCenters} Service Centers, {stats.breakdown.authorizedDistributors} Distributors
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="default" className="text-xs">
                Network Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balance */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.metrics.walletBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Available balance
            </p>
            <div className="flex items-center mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-6"
                onClick={() => onNavigate('wallet')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Funds
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Returns */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.metrics.pendingReturns}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
            <div className="flex items-center mt-2">
              {stats.metrics.pendingReturns > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  Action Required
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  All Clear
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.metrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Current month earnings
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="text-xs">
                This Month
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Frequently used actions for efficient workflow management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Create New Shipment */}
            <Button 
              onClick={() => onNavigate('shipments')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Create Shipment</span>
            </Button>
            
            {/* Add New Part */}
            <Button 
              onClick={() => onNavigate('inventory')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Package className="h-5 w-5" />
              <span className="text-sm">Add New Part</span>
            </Button>
            
            {/* View Notifications */}
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
            
            {/* Check Wallet Balance */}
            <Button 
              onClick={() => onNavigate('wallet')}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Wallet className="h-5 w-5" />
              <span className="text-sm">Wallet</span>
            </Button>
            
            {/* Manage Network */}
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

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Business Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Inventory Health</span>
                <span className="font-medium">
                  {stats.alerts.lowStockParts.length === 0 ? '100%' : 
                   `${Math.max(0, 100 - (stats.alerts.lowStockParts.length * 10))}%`}
                </span>
              </div>
              <Progress 
                value={stats.alerts.lowStockParts.length === 0 ? 100 : 
                       Math.max(0, 100 - (stats.alerts.lowStockParts.length * 10))} 
                className="h-2" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Network Coverage</span>
                <span className="font-medium">
                  {stats.metrics.authorizedPartners > 0 ? '85%' : '0%'}
                </span>
              </div>
              <Progress 
                value={stats.metrics.authorizedPartners > 0 ? 85 : 0} 
                className="h-2" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Operational Efficiency</span>
                <span className="font-medium">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.shipments.length > 0 ? (
                stats.recentActivity.shipments.slice(0, 3).map((shipment) => (
                  <div key={shipment.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    {getStatusIcon(shipment.status)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">Shipment #{shipment.id.slice(-8)}</p>
                      <p className="text-xs text-muted-foreground">{shipment.serviceCenter.name}</p>
                    </div>
                    <Badge className={getStatusColor(shipment.status)} variant="outline">
                      {shipment.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
              
              {stats.recentActivity.shipments.length > 3 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onNavigate('shipments')}
                >
                  View All Activity
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.alerts.lowStockParts.length > 0 ? (
                stats.alerts.lowStockParts.slice(0, 3).map((part) => (
                  <div key={part.id} className="flex items-center justify-between p-2 border rounded-lg bg-orange-50">
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
                <div className="text-center py-4 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">All systems normal</p>
                </div>
              )}
              
              {stats.alerts.lowStockParts.length > 3 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onNavigate('inventory')}
                >
                  View All Alerts
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Parts */}
      {stats.topPerformers.parts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Performing Parts
            </CardTitle>
            <CardDescription>Most frequently shipped parts this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.topPerformers.parts.map((part, index) => (
                <div key={part.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{part.partName}</p>
                    <p className="text-xs text-muted-foreground">{part.partNumber}</p>
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

      {/* Analytics Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipment Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Shipment Trends
            </CardTitle>
            <CardDescription>Last 7 days shipment activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Shipments (7 days)</span>
                <span className="font-medium">{stats.trends.shipments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average per day</span>
                <span className="font-medium">{(stats.trends.shipments.length / 7).toFixed(1)}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => onNavigate('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Detailed Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Return Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Return Analysis
            </CardTitle>
            <CardDescription>Return request breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.trends.returns.length > 0 ? (
                stats.trends.returns.map((returnTrend, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{returnTrend.status.toLowerCase()}</span>
                    <span className="font-medium">{returnTrend._count.id}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No return data available</p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => onNavigate('returns')}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Manage Returns
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedBrandOverview;