import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  XCircle,
  BarChart3,
  LineChart,
  PieChart,
  Monitor,
  Wifi,
  Shield
} from 'lucide-react';

interface SystemMetrics {
  timestamp: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
  latest: {
    cpu: { usage: number; cores: number; loadAverage: number[] };
    memory: { total: number; used: number; free: number; usage: number };
    disk: { total: number; used: number; free: number; usage: number };
    network: { bytesReceived: number; bytesSent: number; errors: number };
    application: { uptime: number; responseTime: number; errorRate: number; requestsPerMinute: number };
    database: { connections: number; queryTime: number; size: number };
  };
  performance: {
    totalUsers: number;
    totalShipments: number;
    totalParts: number;
    totalBrands: number;
    activeShipments: number;
    systemUptime: number;
    nodeVersion: string;
    platform: string;
    databaseSize: number;
    connectionCount: number;
  };
  resourceUtilization: {
    cpu: { current: number; average: number; peak: number };
    memory: { current: number; average: number; peak: number };
    disk: { current: number; average: number; peak: number };
  };
  applicationMetrics: {
    responseTime: { current: number; average: number; peak: number };
    errorRate: { current: number; average: number; peak: number };
    requestsPerMinute: { current: number; average: number; peak: number };
  };
  trends: {
    cpu: { trend: string; change: number };
    memory: { trend: string; change: number };
    disk: { trend: string; change: number };
    responseTime: { trend: string; change: number };
  };
  alerts: {
    active: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      value: number;
      threshold: number;
      timestamp: string;
    }>;
    count: number;
    critical: number;
    high: number;
    medium: number;
  };
}

const SystemHealthMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [timeRange, autoRefresh]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/system/metrics?timeRange=${timeRange}&detailed=true`);
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load system metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'critical': return <XCircle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system metrics...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load system metrics. Please check your connection and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health Monitor</h2>
          <p className="text-gray-600">Real-time system performance and health monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className="w-4 h-4 mr-2" />
            Auto Refresh
          </Button>
          
          <Button onClick={fetchMetrics} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              System Health Overview
            </CardTitle>
            <Badge className={getHealthColor(metrics.systemHealth)}>
              {getHealthIcon(metrics.systemHealth)}
              <span className="ml-2 capitalize">{metrics.systemHealth}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatUptime(metrics.performance.systemUptime)}</div>
              <div className="text-sm text-gray-600">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.performance.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.performance.activeShipments.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Active Shipments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatBytes(metrics.performance.databaseSize * 1024 * 1024)}</div>
              <div className="text-sm text-gray-600">Database Size</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {metrics.alerts.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Alerts ({metrics.alerts.count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.alerts.active.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {alert.type} • {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{alert.value}%</p>
                    <p className="text-xs text-gray-500">Threshold: {alert.threshold}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="resources" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
        </TabsList>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                  {getTrendIcon(metrics.trends.cpu.trend, metrics.trends.cpu.change)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current</span>
                      <span className="font-medium">{metrics.latest.cpu.usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.latest.cpu.usage} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Average:</span>
                      <span className="ml-1 font-medium">{metrics.resourceUtilization.cpu.average}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Peak:</span>
                      <span className="ml-1 font-medium">{metrics.resourceUtilization.cpu.peak}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cores:</span>
                      <span className="ml-1 font-medium">{metrics.latest.cpu.cores}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Load:</span>
                      <span className="ml-1 font-medium">{metrics.latest.cpu.loadAverage[0].toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MemoryStick className="h-4 w-4" />
                  Memory Usage
                  {getTrendIcon(metrics.trends.memory.trend, metrics.trends.memory.change)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current</span>
                      <span className="font-medium">{metrics.latest.memory.usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.latest.memory.usage} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Used:</span>
                      <span className="ml-1 font-medium">{formatBytes(metrics.latest.memory.used * 1024 * 1024)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Free:</span>
                      <span className="ml-1 font-medium">{formatBytes(metrics.latest.memory.free * 1024 * 1024)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-1 font-medium">{formatBytes(metrics.latest.memory.total * 1024 * 1024)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Peak:</span>
                      <span className="ml-1 font-medium">{metrics.resourceUtilization.memory.peak}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disk Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="h-4 w-4" />
                  Disk Usage
                  {getTrendIcon(metrics.trends.disk.trend, metrics.trends.disk.change)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current</span>
                      <span className="font-medium">{metrics.latest.disk.usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.latest.disk.usage} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Used:</span>
                      <span className="ml-1 font-medium">{formatBytes(metrics.latest.disk.used * 1024 * 1024)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Free:</span>
                      <span className="ml-1 font-medium">{formatBytes(metrics.latest.disk.free * 1024 * 1024)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-1 font-medium">{formatBytes(metrics.latest.disk.total * 1024 * 1024)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Peak:</span>
                      <span className="ml-1 font-medium">{metrics.resourceUtilization.disk.peak}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Application Tab */}
        <TabsContent value="application" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Response Time
                  {getTrendIcon(metrics.trends.responseTime.trend, metrics.trends.responseTime.change)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.latest.application.responseTime}ms</div>
                    <div className="text-sm text-gray-600">Current</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Average:</span>
                      <span className="ml-1 font-medium">{metrics.applicationMetrics.responseTime.average}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Peak:</span>
                      <span className="ml-1 font-medium">{metrics.applicationMetrics.responseTime.peak}ms</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" />
                  Error Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.latest.application.errorRate.toFixed(2)}%</div>
                    <div className="text-sm text-gray-600">Current</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Average:</span>
                      <span className="ml-1 font-medium">{metrics.applicationMetrics.errorRate.average}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Peak:</span>
                      <span className="ml-1 font-medium">{metrics.applicationMetrics.errorRate.peak}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Requests/Min
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.latest.application.requestsPerMinute}</div>
                    <div className="text-sm text-gray-600">Current</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Average:</span>
                      <span className="ml-1 font-medium">{metrics.applicationMetrics.requestsPerMinute.average}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Peak:</span>
                      <span className="ml-1 font-medium">{metrics.applicationMetrics.requestsPerMinute.peak}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Connections</div>
                      <div className="text-xl font-bold">{metrics.latest.database.connections}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Query Time</div>
                      <div className="text-xl font-bold">{metrics.latest.database.queryTime}ms</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Database Size</div>
                    <div className="text-xl font-bold">{formatBytes(metrics.latest.database.size * 1024 * 1024)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Data Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Shipments</span>
                    <span className="font-medium">{metrics.performance.totalShipments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Parts</span>
                    <span className="font-medium">{metrics.performance.totalParts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Brands</span>
                    <span className="font-medium">{metrics.performance.totalBrands.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Platform</span>
                    <span className="font-medium">{metrics.performance.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Node Version</span>
                    <span className="font-medium">{metrics.performance.nodeVersion}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Network Traffic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Bytes Received</div>
                      <div className="text-lg font-bold">{formatBytes(metrics.latest.network.bytesReceived)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Bytes Sent</div>
                      <div className="text-lg font-bold">{formatBytes(metrics.latest.network.bytesSent)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Network Errors</div>
                    <div className="text-lg font-bold text-red-600">{metrics.latest.network.errors}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Status</span>
                    <Badge className={getHealthColor(metrics.systemHealth)}>
                      {metrics.systemHealth}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Service</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-sm text-gray-500">
                      {new Date(metrics.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthMonitor;