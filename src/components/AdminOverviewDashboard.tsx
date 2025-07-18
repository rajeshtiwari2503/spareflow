import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Users, 
  DollarSign, 
  Truck, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Server, 
  Database, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Bell,
  Settings,
  Plus,
  Upload,
  Download,
  Eye,
  BarChart3,
  PieChart,
  LineChart,
  Globe,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Timer,
  Target,
  Wallet,
  CreditCard,
  ShoppingCart,
  UserCheck,
  FileText,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { makeAuthenticatedRequest } from '@/lib/client-auth';
import { toast } from 'sonner';

interface SystemHealthData {
  systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  activeUsers: number;
  transactionVolume: number;
  errorRate: number;
  responseTime: number;
  databaseHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

interface CriticalAlertsData {
  securityAlerts: number;
  systemErrors: number;
  performanceWarnings: number;
  backupStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  integrationIssues: number;
}

interface QuickStatsData {
  totalUsers: number;
  totalRevenue: number;
  totalWalletBalance: number;
  activeShipments: number;
  totalParts: number;
  lowStockParts: number;
  pendingApprovals: number;
  failedLogins: number;
}

interface RecentActivity {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  shipments: Array<{
    id: string;
    status: string;
    createdAt: string;
    brand: { name: string };
  }>;
  orders: Array<{
    id: string;
    status: string;
    createdAt: string;
    customer: { name: string };
  }>;
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    timestamp: string;
  }>;
}

interface OverviewData {
  systemHealth: SystemHealthData;
  criticalAlerts: CriticalAlertsData;
  quickStats: QuickStatsData;
  userDistribution: Record<string, number>;
  recentActivity: RecentActivity;
  performanceMetrics: {
    systemUptime: number;
    apiResponseTime: number;
    databaseResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  financialOverview: {
    totalRevenue: number;
    totalWalletBalance: number;
    monthlyGrowth: number;
    transactionCount: number;
    averageTransactionValue: number;
  };
}

export default function AdminOverviewDashboard() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('/api/admin/overview');
      if (response.ok) {
        const data = await response.json();
        setOverviewData(data);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to fetch overview data');
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
      toast.error('Failed to fetch dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOverviewData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'WARNING': return 'text-yellow-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'default';
      case 'WARNING': return 'secondary';
      case 'CRITICAL': return 'destructive';
      default: return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  if (loading || !overviewData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between mt-16 items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={fetchOverviewData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${overviewData.systemHealth.systemStatus === 'HEALTHY' ? 'bg-green-100' : overviewData.systemHealth.systemStatus === 'WARNING' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <Server className={`h-4 w-4 ${getStatusColor(overviewData.systemHealth.systemStatus)}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">System Status</p>
                <Badge variant={getStatusBadgeVariant(overviewData.systemHealth.systemStatus)}>
                  {overviewData.systemHealth.systemStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Active Users</p>
                <p className="text-lg font-bold">{formatNumber(overviewData.systemHealth.activeUsers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-purple-100">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Transaction Volume</p>
                <p className="text-lg font-bold">{formatNumber(overviewData.systemHealth.transactionVolume)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${overviewData.systemHealth.errorRate < 1 ? 'bg-green-100' : 'bg-red-100'}`}>
                <AlertTriangle className={`h-4 w-4 ${overviewData.systemHealth.errorRate < 1 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Error Rate</p>
                <p className="text-lg font-bold">{overviewData.systemHealth.errorRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${overviewData.systemHealth.responseTime < 150 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Timer className={`h-4 w-4 ${overviewData.systemHealth.responseTime < 150 ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Response Time</p>
                <p className="text-lg font-bold">{overviewData.systemHealth.responseTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${overviewData.systemHealth.databaseHealth === 'HEALTHY' ? 'bg-green-100' : 'bg-red-100'}`}>
                <Database className={`h-4 w-4 ${getStatusColor(overviewData.systemHealth.databaseHealth)}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Database Health</p>
                <Badge variant={getStatusBadgeVariant(overviewData.systemHealth.databaseHealth)}>
                  {overviewData.systemHealth.databaseHealth}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-500" />
              <CardTitle>Critical Alerts Panel</CardTitle>
            </div>
            <Badge variant="destructive">
              {overviewData.criticalAlerts.securityAlerts + overviewData.criticalAlerts.systemErrors + overviewData.criticalAlerts.performanceWarnings + overviewData.criticalAlerts.integrationIssues} Active
            </Badge>
          </div>
          <CardDescription>Monitor critical system issues and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Security Alerts</span>
              </div>
              <Badge variant={overviewData.criticalAlerts.securityAlerts > 0 ? 'destructive' : 'outline'}>
                {overviewData.criticalAlerts.securityAlerts}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">System Errors</span>
              </div>
              <Badge variant={overviewData.criticalAlerts.systemErrors > 0 ? 'destructive' : 'outline'}>
                {overviewData.criticalAlerts.systemErrors}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Performance Warnings</span>
              </div>
              <Badge variant={overviewData.criticalAlerts.performanceWarnings > 0 ? 'secondary' : 'outline'}>
                {overviewData.criticalAlerts.performanceWarnings}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Backup Status</span>
              </div>
              <Badge variant={overviewData.criticalAlerts.backupStatus === 'SUCCESS' ? 'default' : 'destructive'}>
                {overviewData.criticalAlerts.backupStatus}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Integration Issues</span>
              </div>
              <Badge variant={overviewData.criticalAlerts.integrationIssues > 0 ? 'destructive' : 'outline'}>
                {overviewData.criticalAlerts.integrationIssues}
              </Badge>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="mt-4">
            <h4 className="font-semibold mb-3">Recent Alerts</h4>
            <div className="space-y-2">
              {overviewData.recentActivity.alerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} className="border-l-4 border-l-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <UserCheck className="h-5 w-5" />
              <span className="text-xs">User Management</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Settings className="h-5 w-5" />
              <span className="text-xs">System Configuration</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs">Pricing Updates</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-xs">Content Approval</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <FileText className="h-5 w-5" />
              <span className="text-xs">Generate Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Statistics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{formatNumber(overviewData.quickStats.totalUsers)}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <ArrowUp className="h-3 w-3" />
                      +12% from last month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(overviewData.quickStats.totalRevenue)}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <ArrowUp className="h-3 w-3" />
                      +{overviewData.financialOverview.monthlyGrowth}% from last month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Shipments</p>
                    <p className="text-2xl font-bold">{formatNumber(overviewData.quickStats.activeShipments)}</p>
                    <p className="text-xs text-blue-600">
                      {formatNumber(overviewData.quickStats.activeShipments + 150)} total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                    <p className="text-2xl font-bold">{formatNumber(overviewData.quickStats.pendingApprovals)}</p>
                    <p className="text-xs text-orange-600">Requires attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>Real-time system performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        System Uptime
                      </span>
                      <span>{overviewData.performanceMetrics.systemUptime}%</span>
                    </div>
                    <Progress value={overviewData.performanceMetrics.systemUptime} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        API Response Time
                      </span>
                      <span>{overviewData.performanceMetrics.apiResponseTime}ms</span>
                    </div>
                    <Progress value={Math.max(0, 100 - (overviewData.performanceMetrics.apiResponseTime / 2))} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Database Response
                      </span>
                      <span>{overviewData.performanceMetrics.databaseResponseTime}ms</span>
                    </div>
                    <Progress value={Math.max(0, 100 - overviewData.performanceMetrics.databaseResponseTime)} className="h-2" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <MemoryStick className="h-4 w-4" />
                        Memory Usage
                      </span>
                      <span>{overviewData.performanceMetrics.memoryUsage}%</span>
                    </div>
                    <Progress value={overviewData.performanceMetrics.memoryUsage} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        CPU Usage
                      </span>
                      <span>{overviewData.performanceMetrics.cpuUsage}%</span>
                    </div>
                    <Progress value={overviewData.performanceMetrics.cpuUsage} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Disk Usage
                      </span>
                      <span>{overviewData.performanceMetrics.diskUsage}%</span>
                    </div>
                    <Progress value={overviewData.performanceMetrics.diskUsage} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
              <CardDescription>Platform user breakdown by role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(overviewData.userDistribution).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center">
                    <span className="text-sm capitalize">{role.toLowerCase().replace('_', ' ')}</span>
                    <Badge variant="outline">{formatNumber(count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Platform financial metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Wallet Balance</span>
                  <span className="font-medium">{formatCurrency(overviewData.financialOverview.totalWalletBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Transaction Count</span>
                  <span className="font-medium">{formatNumber(overviewData.financialOverview.transactionCount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg Transaction Value</span>
                  <span className="font-medium">{formatCurrency(overviewData.financialOverview.averageTransactionValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monthly Growth</span>
                  <span className="font-medium text-green-600 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {overviewData.financialOverview.monthlyGrowth}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="shipments">Shipments</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>
                
                <TabsContent value="users" className="space-y-3 mt-4">
                  {overviewData.recentActivity.users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          {user.role} • {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="shipments" className="space-y-3 mt-4">
                  {overviewData.recentActivity.shipments.map((shipment) => (
                    <div key={shipment.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Shipment #{shipment.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">
                          {shipment.brand.name} • {shipment.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="orders" className="space-y-3 mt-4">
                  {overviewData.recentActivity.orders.map((order) => (
                    <div key={order.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">
                          {order.customer.name} • {order.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}