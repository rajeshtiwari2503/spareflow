import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Calendar,
  Target,
  DollarSign,
  Package,
  Truck,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  LineChart,
  Filter,
  FileText,
  Share2,
  Zap
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalShipments: number;
    averageOrderValue: number;
    customerSatisfaction: number;
    revenueGrowth: number;
    shipmentGrowth: number;
  };
  performance: {
    deliverySuccess: number;
    onTimeDelivery: number;
    returnRate: number;
    customerRetention: number;
  };
  trends: {
    dailyRevenue: Array<{ date: string; revenue: number; shipments: number }>;
    topParts: Array<{ name: string; code: string; revenue: number; quantity: number }>;
    regionPerformance: Array<{ region: string; shipments: number; revenue: number }>;
  };
  forecasting: {
    predictedRevenue: number;
    predictedShipments: number;
    stockAlerts: number;
    recommendations: Array<{ type: string; message: string; priority: 'high' | 'medium' | 'low' }>;
  };
}

interface EnhancedBrandAnalyticsDashboardProps {
  brandId: string;
  onNavigate?: (tab: string) => void;
}

const EnhancedBrandAnalyticsDashboard: React.FC<EnhancedBrandAnalyticsDashboardProps> = ({
  brandId,
  onNavigate
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeView, setActiveView] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [brandId, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch real analytics data from API
      const response = await fetch(`/api/brand/analytics?timeRange=${timeRange}`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        throw new Error(`Failed to fetch analytics: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true);
      
      const response = await fetch('/api/brand/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          format, 
          timeRange, 
          brandId,
          data: analyticsData 
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brand-analytics-${timeRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: `Analytics report exported as ${format.toUpperCase()}`
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load analytics data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const { overview, performance, trends, forecasting } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
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
          
          <Button variant="outline" onClick={() => exportReport('excel')} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          
          <Button variant="outline" onClick={() => exportReport('pdf')} disabled={exporting}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          
          <Button onClick={fetchAnalyticsData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="forecasting">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{overview.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    +{overview.revenueGrowth}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Shipments</p>
                    <p className="text-2xl font-bold">{overview.totalShipments.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    +{overview.shipmentGrowth}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold">₹{overview.averageOrderValue}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <Activity className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-500">Stable</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer Rating</p>
                    <p className="text-2xl font-bold">{overview.customerSatisfaction}/5</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <span className="text-sm text-gray-500">Excellent rating</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Parts */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Parts</CardTitle>
              <CardDescription>Best selling parts by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.topParts.map((part, index) => (
                  <div key={part.code} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{part.name}</p>
                        <p className="text-sm text-gray-600">{part.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{part.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{part.quantity} units</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Delivery Success Rate</span>
                    <span className="text-sm font-bold">{performance.deliverySuccess}%</span>
                  </div>
                  <Progress value={performance.deliverySuccess} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">On-Time Delivery</span>
                    <span className="text-sm font-bold">{performance.onTimeDelivery}%</span>
                  </div>
                  <Progress value={performance.onTimeDelivery} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Customer Retention</span>
                    <span className="text-sm font-bold">{performance.customerRetention}%</span>
                  </div>
                  <Progress value={performance.customerRetention} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trends.regionPerformance.map((region) => (
                    <div key={region.region} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{region.region}</p>
                        <p className="text-sm text-gray-600">{region.shipments} shipments</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{region.revenue.toLocaleString()}</p>
                        <Badge variant="outline" className="text-xs">
                          {((region.revenue / overview.totalRevenue) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart visualization would be implemented here</p>
                  <p className="text-sm text-gray-400">Integration with charting library required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="forecasting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  AI Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Next Month Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{forecasting.predictedRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-700">
                    +{((forecasting.predictedRevenue - overview.totalRevenue) / overview.totalRevenue * 100).toFixed(1)}% projected growth
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">Predicted Shipments</p>
                  <p className="text-2xl font-bold text-green-600">
                    {forecasting.predictedShipments.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700">
                    +{((forecasting.predictedShipments - overview.totalShipments) / overview.totalShipments * 100).toFixed(1)}% increase expected
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {forecasting.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{rec.message}</p>
                          <p className="text-xs text-gray-500 mt-1 capitalize">{rec.type} optimization</p>
                        </div>
                        <Badge 
                          variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Stock Alert:</strong> {forecasting.stockAlerts} parts are predicted to go below MSL in the next 30 days.
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2" 
                onClick={() => onNavigate?.('inventory')}
              >
                View Inventory →
              </Button>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedBrandAnalyticsDashboard;