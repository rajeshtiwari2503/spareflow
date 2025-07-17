'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  BarChart3, 
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calendar,
  LineChart,
  PieChart,
  Activity
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  ComposedChart
} from 'recharts';

interface MarginAnalytics {
  totalMargin: number;
  averageMarginPercent: number;
  totalRevenue: number;
  totalCosts: number;
  shipmentCount: number;
  marginTrend: Array<{
    date: string;
    margin: number;
    marginPercent: number;
    count: number;
  }>;
  topPerformingRoutes: Array<{
    origin: string;
    destination: string;
    averageMargin: number;
    count: number;
  }>;
}

interface TimeSeriesDataPoint {
  date: string;
  margin: number;
  marginPercent: number;
  revenue: number;
  costs: number;
  count: number;
  cumulativeMargin: number;
  movingAverage: number;
}

interface ChartConfig {
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  chartType: 'line' | 'area' | 'bar' | 'composed';
  showMovingAverage: boolean;
  showCumulative: boolean;
}

interface MarginLog {
  id: string;
  customerPrice: number;
  dtdcCost: number;
  margin: number;
  marginPercent: number;
  awbNumber?: string;
  weight?: number;
  serviceType?: string;
  origin?: string;
  destination?: string;
  calculatedAt: string;
  notes?: string;
  brand: {
    name: string;
    email: string;
  };
  box?: {
    boxNumber: string;
    awbNumber?: string;
  };
  customerOrder?: {
    id: string;
    awbNumber?: string;
  };
}

interface MarginSummary {
  totalMargin: number;
  totalRevenue: number;
  totalCosts: number;
  averageMarginPercent: number;
  shipmentCount: number;
  brandBreakdown: Array<{
    brandName: string;
    totalMargin: number;
    totalRevenue: number;
    totalCosts: number;
    shipmentCount: number;
    averageMarginPercent: number;
  }>;
}

interface MarginAnalyticsDashboardProps {
  userRole?: string;
  brandId?: string;
}

export default function MarginAnalyticsDashboard({ userRole = 'SUPER_ADMIN', brandId }: MarginAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<MarginAnalytics | null>(null);
  const [logs, setLogs] = useState<MarginLog[]>([]);
  const [summary, setSummary] = useState<MarginSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState(brandId || '');
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering charts
  useEffect(() => {
    setMounted(true);
  }, []);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    timeRange: '30d',
    chartType: 'line',
    showMovingAverage: true,
    showCumulative: false
  });

  // Fetch analytics data
  const fetchAnalytics = async () => {
    // For super admin, if no brand is selected, skip analytics and just fetch summary
    if (!selectedBrandId && userRole === 'SUPER_ADMIN') {
      // Skip analytics for super admin without brand selection
      setAnalytics(null);
      return;
    }
    
    // For non-super admin users, brandId is required
    if (!selectedBrandId && userRole !== 'SUPER_ADMIN') {
      setError('Brand ID is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        action: 'analytics',
        brandId: selectedBrandId, // Always include brandId when calling analytics
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/admin/margin-analytics?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch margin logs
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        action: 'logs',
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(selectedBrandId && { brandId: selectedBrandId }),
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/admin/margin-analytics?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch logs');
      }

      setLogs(data.logs || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary (admin only)
  const fetchSummary = async () => {
    if (userRole !== 'SUPER_ADMIN') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        action: 'summary',
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/admin/margin-analytics?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch summary');
      }

      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Backfill margin data
  const handleBackfill = async (dryRun = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/margin-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'backfill',
          brandId: selectedBrandId || undefined,
          dryRun
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Backfill failed');
      }

      alert(`${dryRun ? 'Dry run' : 'Backfill'} completed: ${data.processed} processed, ${data.updated} updated`);
      
      if (!dryRun) {
        // Refresh data after successful backfill
        fetchAnalytics();
        fetchLogs();
        if (userRole === 'SUPER_ADMIN') fetchSummary();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (percent: number) => {
    return `${percent.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Process time-series data for charts
  const processTimeSeriesData = (marginTrend: MarginAnalytics['marginTrend']): TimeSeriesDataPoint[] => {
    if (!marginTrend || marginTrend.length === 0) return [];

    // Sort by date
    const sortedData = [...marginTrend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let cumulativeMargin = 0;
    const movingAverageWindow = 7; // 7-day moving average
    
    return sortedData.map((point, index) => {
      cumulativeMargin += point.margin;
      
      // Calculate moving average
      const startIndex = Math.max(0, index - movingAverageWindow + 1);
      const windowData = sortedData.slice(startIndex, index + 1);
      const movingAverage = windowData.reduce((sum, p) => sum + p.marginPercent, 0) / windowData.length;
      
      // Calculate revenue and costs from margin data
      const revenue = point.margin / (point.marginPercent / 100);
      const costs = revenue - point.margin;
      
      return {
        date: point.date,
        margin: Math.round(point.margin * 100) / 100,
        marginPercent: Math.round(point.marginPercent * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        costs: Math.round(costs * 100) / 100,
        count: point.count,
        cumulativeMargin: Math.round(cumulativeMargin * 100) / 100,
        movingAverage: Math.round(movingAverage * 100) / 100
      };
    });
  };

  // Filter data based on time range
  const filterDataByTimeRange = (data: TimeSeriesDataPoint[], timeRange: ChartConfig['timeRange']): TimeSeriesDataPoint[] => {
    if (timeRange === 'all') return data;
    
    const now = new Date();
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[timeRange];
    
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return data.filter(point => new Date(point.date) >= cutoffDate);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {
                entry.dataKey.includes('Percent') ? 
                  `${entry.value.toFixed(2)}%` : 
                  formatCurrency(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Chart colors
  const chartColors = {
    margin: '#3b82f6',
    marginPercent: '#10b981',
    revenue: '#8b5cf6',
    costs: '#ef4444',
    movingAverage: '#f59e0b',
    cumulative: '#6366f1'
  };

  useEffect(() => {
    // Only fetch analytics if we have a brandId or if we're super admin (for summary)
    if (selectedBrandId) {
      fetchAnalytics();
      fetchLogs();
    } else if (userRole === 'SUPER_ADMIN') {
      // For super admin without brand selection, only fetch summary and logs
      setAnalytics(null);
      fetchLogs();
      fetchSummary();
    }
  }, [selectedBrandId, dateRange]);

  // Don't render until component is mounted (prevents SSR issues)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Margin Analytics</h2>
          <p className="text-muted-foreground">
            Track and analyze profit margins between customer pricing and DTDC costs
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {userRole === 'SUPER_ADMIN' && (
              <div className="space-y-2">
                <Label htmlFor="brandId">Brand ID (Optional)</Label>
                <Input
                  id="brandId"
                  placeholder="Enter brand ID"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleBackfill(true)} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  Dry Run
                </Button>
                <Button 
                  onClick={() => handleBackfill(false)} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  Backfill
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Overview</TabsTrigger>
          <TabsTrigger value="charts">Time-Series Charts</TabsTrigger>
          <TabsTrigger value="logs">Margin Logs</TabsTrigger>
          {userRole === 'SUPER_ADMIN' && <TabsTrigger value="summary">Summary</TabsTrigger>}
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Margin</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analytics.totalMargin)}</div>
                    <p className="text-xs text-muted-foreground">
                      Revenue - DTDC Costs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Margin %</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(analytics.averageMarginPercent)}</div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.averageMarginPercent > 0 ? (
                        <span className="text-green-600 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Profitable
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Loss
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">
                      Customer payments
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Shipments</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.shipmentCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Total shipments tracked
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Routes */}
              {analytics.topPerformingRoutes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Routes</CardTitle>
                    <CardDescription>Routes with highest average margins</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.topPerformingRoutes.slice(0, 5).map((route, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{route.origin} → {route.destination}</span>
                            <span className="text-sm text-muted-foreground ml-2">({route.count} shipments)</span>
                          </div>
                          <Badge variant={route.averageMargin > 0 ? "default" : "destructive"}>
                            {formatCurrency(route.averageMargin)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Advanced Time-Series Charts */}
              {analytics.marginTrend.length > 0 && (
                <div className="space-y-6">
                  {/* Chart Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Time-Series Analytics
                      </CardTitle>
                      <CardDescription>Advanced margin trend analysis with interactive charts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="space-y-2">
                          <Label>Time Range</Label>
                          <Select
                            value={chartConfig.timeRange}
                            onValueChange={(value: ChartConfig['timeRange']) => 
                              setChartConfig(prev => ({ ...prev, timeRange: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7d">Last 7 Days</SelectItem>
                              <SelectItem value="30d">Last 30 Days</SelectItem>
                              <SelectItem value="90d">Last 90 Days</SelectItem>
                              <SelectItem value="1y">Last Year</SelectItem>
                              <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Chart Type</Label>
                          <Select
                            value={chartConfig.chartType}
                            onValueChange={(value: ChartConfig['chartType']) => 
                              setChartConfig(prev => ({ ...prev, chartType: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="line">Line Chart</SelectItem>
                              <SelectItem value="area">Area Chart</SelectItem>
                              <SelectItem value="bar">Bar Chart</SelectItem>
                              <SelectItem value="composed">Combined</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={chartConfig.showMovingAverage}
                              onChange={(e) => setChartConfig(prev => ({ 
                                ...prev, 
                                showMovingAverage: e.target.checked 
                              }))}
                              className="rounded"
                            />
                            Moving Average
                          </Label>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={chartConfig.showCumulative}
                              onChange={(e) => setChartConfig(prev => ({ 
                                ...prev, 
                                showCumulative: e.target.checked 
                              }))}
                              className="rounded"
                            />
                            Cumulative View
                          </Label>
                        </div>
                      </div>

                      {(() => {
                        const timeSeriesData = processTimeSeriesData(analytics.marginTrend);
                        const filteredData = filterDataByTimeRange(timeSeriesData, chartConfig.timeRange);
                        
                        if (filteredData.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              No data available for the selected time range
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {/* Main Margin Chart */}
                            <div className="h-80">
                              <h4 className="text-lg font-semibold mb-4">Margin Trends</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                {chartConfig.chartType === 'line' && (
                                  <RechartsLineChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line 
                                      type="monotone" 
                                      dataKey={chartConfig.showCumulative ? "cumulativeMargin" : "margin"} 
                                      stroke={chartColors.margin} 
                                      strokeWidth={2}
                                      name={chartConfig.showCumulative ? "Cumulative Margin" : "Daily Margin"}
                                      dot={{ fill: chartColors.margin, strokeWidth: 2, r: 4 }}
                                    />
                                    {chartConfig.showMovingAverage && (
                                      <Line 
                                        type="monotone" 
                                        dataKey="movingAverage" 
                                        stroke={chartColors.movingAverage} 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        name="7-Day Moving Avg (%)"
                                        dot={false}
                                      />
                                    )}
                                  </RechartsLineChart>
                                )}

                                {chartConfig.chartType === 'area' && (
                                  <AreaChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Area 
                                      type="monotone" 
                                      dataKey={chartConfig.showCumulative ? "cumulativeMargin" : "margin"} 
                                      stroke={chartColors.margin} 
                                      fill={chartColors.margin}
                                      fillOpacity={0.3}
                                      name={chartConfig.showCumulative ? "Cumulative Margin" : "Daily Margin"}
                                    />
                                    {chartConfig.showMovingAverage && (
                                      <Area 
                                        type="monotone" 
                                        dataKey="movingAverage" 
                                        stroke={chartColors.movingAverage} 
                                        fill="none"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        name="7-Day Moving Avg (%)"
                                      />
                                    )}
                                  </AreaChart>
                                )}

                                {chartConfig.chartType === 'bar' && (
                                  <RechartsBarChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar 
                                      dataKey={chartConfig.showCumulative ? "cumulativeMargin" : "margin"} 
                                      fill={chartColors.margin}
                                      name={chartConfig.showCumulative ? "Cumulative Margin" : "Daily Margin"}
                                    />
                                  </RechartsBarChart>
                                )}

                                {chartConfig.chartType === 'composed' && (
                                  <ComposedChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar 
                                      yAxisId="left"
                                      dataKey="margin" 
                                      fill={chartColors.margin}
                                      name="Daily Margin"
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="marginPercent" 
                                      stroke={chartColors.marginPercent} 
                                      strokeWidth={2}
                                      name="Margin %"
                                      dot={{ fill: chartColors.marginPercent, strokeWidth: 2, r: 3 }}
                                    />
                                    {chartConfig.showMovingAverage && (
                                      <Line 
                                        yAxisId="right"
                                        type="monotone" 
                                        dataKey="movingAverage" 
                                        stroke={chartColors.movingAverage} 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        name="7-Day Moving Avg (%)"
                                        dot={false}
                                      />
                                    )}
                                  </ComposedChart>
                                )}
                              </ResponsiveContainer>
                            </div>

                            {/* Revenue vs Costs Chart */}
                            <div className="h-80">
                              <h4 className="text-lg font-semibold mb-4">Revenue vs Costs Analysis</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend />
                                  <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stackId="1"
                                    stroke={chartColors.revenue} 
                                    fill={chartColors.revenue}
                                    fillOpacity={0.6}
                                    name="Revenue"
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="costs" 
                                    stackId="2"
                                    stroke={chartColors.costs} 
                                    fill={chartColors.costs}
                                    fillOpacity={0.6}
                                    name="DTDC Costs"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Margin Percentage Distribution */}
                            <div className="h-80">
                              <h4 className="text-lg font-semibold mb-4">Margin Percentage Trends</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsLineChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `${value}%`}
                                  />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend />
                                  <Line 
                                    type="monotone" 
                                    dataKey="marginPercent" 
                                    stroke={chartColors.marginPercent} 
                                    strokeWidth={3}
                                    name="Margin %"
                                    dot={{ fill: chartColors.marginPercent, strokeWidth: 2, r: 4 }}
                                  />
                                  {chartConfig.showMovingAverage && (
                                    <Line 
                                      type="monotone" 
                                      dataKey="movingAverage" 
                                      stroke={chartColors.movingAverage} 
                                      strokeWidth={2}
                                      strokeDasharray="5 5"
                                      name="7-Day Moving Average"
                                      dot={false}
                                    />
                                  )}
                                </RechartsLineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          {analytics && analytics.marginTrend.length > 0 ? (
            <div className="space-y-6">
              {/* Chart Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Advanced Time-Series Analytics
                  </CardTitle>
                  <CardDescription>Interactive margin trend analysis with multiple visualization options</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label>Time Range</Label>
                      <Select
                        value={chartConfig.timeRange}
                        onValueChange={(value: ChartConfig['timeRange']) => 
                          setChartConfig(prev => ({ ...prev, timeRange: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                          <SelectItem value="1y">Last Year</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Chart Type</Label>
                      <Select
                        value={chartConfig.chartType}
                        onValueChange={(value: ChartConfig['chartType']) => 
                          setChartConfig(prev => ({ ...prev, chartType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="area">Area Chart</SelectItem>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="composed">Combined</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={chartConfig.showMovingAverage}
                          onChange={(e) => setChartConfig(prev => ({ 
                            ...prev, 
                            showMovingAverage: e.target.checked 
                          }))}
                          className="rounded"
                        />
                        Moving Average
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={chartConfig.showCumulative}
                          onChange={(e) => setChartConfig(prev => ({ 
                            ...prev, 
                            showCumulative: e.target.checked 
                          }))}
                          className="rounded"
                        />
                        Cumulative View
                      </Label>
                    </div>
                  </div>

                  {(() => {
                    const timeSeriesData = processTimeSeriesData(analytics.marginTrend);
                    const filteredData = filterDataByTimeRange(timeSeriesData, chartConfig.timeRange);
                    
                    if (filteredData.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          No data available for the selected time range
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-8">
                        {/* Main Margin Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <LineChart className="h-4 w-4" />
                              Margin Trends Over Time
                            </CardTitle>
                            <CardDescription>
                              {chartConfig.showCumulative ? 'Cumulative' : 'Daily'} margin analysis with {chartConfig.showMovingAverage ? '7-day moving average' : 'raw data'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-96">
                              <ResponsiveContainer width="100%" height="100%">
                                {chartConfig.chartType === 'line' && (
                                  <RechartsLineChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line 
                                      type="monotone" 
                                      dataKey={chartConfig.showCumulative ? "cumulativeMargin" : "margin"} 
                                      stroke={chartColors.margin} 
                                      strokeWidth={3}
                                      name={chartConfig.showCumulative ? "Cumulative Margin" : "Daily Margin"}
                                      dot={{ fill: chartColors.margin, strokeWidth: 2, r: 5 }}
                                    />
                                    {chartConfig.showMovingAverage && (
                                      <Line 
                                        type="monotone" 
                                        dataKey="movingAverage" 
                                        stroke={chartColors.movingAverage} 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        name="7-Day Moving Avg (%)"
                                        dot={false}
                                      />
                                    )}
                                  </RechartsLineChart>
                                )}

                                {chartConfig.chartType === 'area' && (
                                  <AreaChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Area 
                                      type="monotone" 
                                      dataKey={chartConfig.showCumulative ? "cumulativeMargin" : "margin"} 
                                      stroke={chartColors.margin} 
                                      fill={chartColors.margin}
                                      fillOpacity={0.4}
                                      name={chartConfig.showCumulative ? "Cumulative Margin" : "Daily Margin"}
                                    />
                                    {chartConfig.showMovingAverage && (
                                      <Area 
                                        type="monotone" 
                                        dataKey="movingAverage" 
                                        stroke={chartColors.movingAverage} 
                                        fill="none"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        name="7-Day Moving Avg (%)"
                                      />
                                    )}
                                  </AreaChart>
                                )}

                                {chartConfig.chartType === 'bar' && (
                                  <RechartsBarChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar 
                                      dataKey={chartConfig.showCumulative ? "cumulativeMargin" : "margin"} 
                                      fill={chartColors.margin}
                                      name={chartConfig.showCumulative ? "Cumulative Margin" : "Daily Margin"}
                                    />
                                  </RechartsBarChart>
                                )}

                                {chartConfig.chartType === 'composed' && (
                                  <ComposedChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar 
                                      yAxisId="left"
                                      dataKey="margin" 
                                      fill={chartColors.margin}
                                      name="Daily Margin"
                                    />
                                    <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="marginPercent" 
                                      stroke={chartColors.marginPercent} 
                                      strokeWidth={3}
                                      name="Margin %"
                                      dot={{ fill: chartColors.marginPercent, strokeWidth: 2, r: 4 }}
                                    />
                                    {chartConfig.showMovingAverage && (
                                      <Line 
                                        yAxisId="right"
                                        type="monotone" 
                                        dataKey="movingAverage" 
                                        stroke={chartColors.movingAverage} 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        name="7-Day Moving Avg (%)"
                                        dot={false}
                                      />
                                    )}
                                  </ComposedChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Revenue vs Costs Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Revenue vs Costs Analysis
                            </CardTitle>
                            <CardDescription>Comparative analysis of revenue streams and DTDC costs over time</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-96">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend />
                                  <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stackId="1"
                                    stroke={chartColors.revenue} 
                                    fill={chartColors.revenue}
                                    fillOpacity={0.7}
                                    name="Revenue"
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="costs" 
                                    stackId="2"
                                    stroke={chartColors.costs} 
                                    fill={chartColors.costs}
                                    fillOpacity={0.7}
                                    name="DTDC Costs"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Margin Percentage Trends */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Margin Percentage Trends
                            </CardTitle>
                            <CardDescription>Percentage-based margin analysis with profitability indicators</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-96">
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsLineChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `${value}%`}
                                  />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend />
                                  <Line 
                                    type="monotone" 
                                    dataKey="marginPercent" 
                                    stroke={chartColors.marginPercent} 
                                    strokeWidth={4}
                                    name="Margin %"
                                    dot={{ fill: chartColors.marginPercent, strokeWidth: 2, r: 5 }}
                                  />
                                  {chartConfig.showMovingAverage && (
                                    <Line 
                                      type="monotone" 
                                      dataKey="movingAverage" 
                                      stroke={chartColors.movingAverage} 
                                      strokeWidth={3}
                                      strokeDasharray="5 5"
                                      name="7-Day Moving Average"
                                      dot={false}
                                    />
                                  )}
                                  {/* Break-even reference line */}
                                  <Line 
                                    type="monotone" 
                                    dataKey={() => 0} 
                                    stroke="#ef4444" 
                                    strokeWidth={2}
                                    strokeDasharray="2 2"
                                    name="Break-even Line"
                                    dot={false}
                                  />
                                </RechartsLineChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Volume vs Margin Correlation */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Volume vs Margin Correlation
                            </CardTitle>
                            <CardDescription>Relationship between shipment volume and margin performance</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-96">
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  />
                                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend />
                                  <Bar 
                                    yAxisId="right"
                                    dataKey="count" 
                                    fill={chartColors.cumulative}
                                    fillOpacity={0.6}
                                    name="Shipment Count"
                                  />
                                  <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="margin" 
                                    stroke={chartColors.margin} 
                                    strokeWidth={3}
                                    name="Daily Margin"
                                    dot={{ fill: chartColors.margin, strokeWidth: 2, r: 4 }}
                                  />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Time-Series Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  No margin trend data found for the selected filters. Try adjusting your date range or brand selection.
                </p>
                <Button onClick={fetchAnalytics} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Margin Logs</CardTitle>
              <CardDescription>Detailed margin calculations for each shipment</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="border rounded p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {log.awbNumber || log.box?.awbNumber || log.customerOrder?.awbNumber || 'No AWB'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.brand.name} • {formatDate(log.calculatedAt)}
                            </div>
                            {log.origin && log.destination && (
                              <div className="text-sm text-muted-foreground">
                                {log.origin} → {log.destination}
                              </div>
                            )}
                          </div>
                          <Badge variant={log.margin > 0 ? "default" : "destructive"}>
                            {formatPercent(log.marginPercent)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer Price:</span>
                            <div className="font-medium">{formatCurrency(log.customerPrice)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">DTDC Cost:</span>
                            <div className="font-medium">{formatCurrency(log.dtdcCost)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Margin:</span>
                            <div className={`font-medium ${log.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(log.margin)}
                            </div>
                          </div>
                        </div>
                        {log.notes && (
                          <div className="text-sm text-muted-foreground">
                            Note: {log.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(pagination.page - 1)}
                        disabled={pagination.page <= 1 || loading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No margin logs found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === 'SUPER_ADMIN' && (
          <TabsContent value="summary" className="space-y-4">
            {summary && (
              <>
                {/* Overall Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Margin</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totalMargin)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totalCosts)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Margin %</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatPercent(summary.averageMarginPercent)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Brand Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Brand Performance</CardTitle>
                    <CardDescription>Margin performance by brand</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.brandBreakdown.map((brand, index) => (
                        <div key={index} className="border rounded p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{brand.brandName}</div>
                            <Badge variant={brand.totalMargin > 0 ? "default" : "destructive"}>
                              {formatPercent(brand.averageMarginPercent)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Margin:</span>
                              <div className="font-medium">{formatCurrency(brand.totalMargin)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Revenue:</span>
                              <div className="font-medium">{formatCurrency(brand.totalRevenue)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Costs:</span>
                              <div className="font-medium">{formatCurrency(brand.totalCosts)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Shipments:</span>
                              <div className="font-medium">{brand.shipmentCount}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}