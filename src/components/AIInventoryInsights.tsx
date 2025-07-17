import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Zap,
  Target,
  BarChart3,
  Activity,
  Bell,
  Lightbulb,
  Search,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Package,
  MapPin,
  Users,
  Star,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Settings,
  Filter,
  Info,
  Sparkles,
  Bot,
  MessageSquare,
  ShoppingCart,
  Truck,
  Warehouse,
  PieChart,
  LineChart,
  BarChart,
  Gauge,
  Flame,
  Snowflake,
  Shield,
  Wrench,
  FileText,
  Mail,
  Phone,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Enhanced interfaces for AI-powered inventory insights
interface AIForecast {
  partId: string;
  partCode: string;
  partName: string;
  currentStock: number;
  currentMSL: number;
  projectedDemand: number;
  recommendedMSL: number;
  needsReorder: boolean;
  confidence: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  seasonality: 'HIGH' | 'MEDIUM' | 'LOW';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedActions: string[];
  historicalData: {
    avgMonthlyDemand: number;
    peakDemand: number;
    lowDemand: number;
    volatility: number;
  };
}

interface AIInsight {
  id: string;
  type: 'FORECAST' | 'OPTIMIZATION' | 'ANOMALY' | 'RECOMMENDATION';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  impact: string;
  actionRequired: boolean;
  suggestedActions: string[];
  confidence: number;
  createdAt: string;
  category: string;
  affectedParts?: string[];
  potentialSavings?: number;
  riskMitigation?: string;
}

interface SmartAlert {
  id: string;
  type: 'STOCK_OUT' | 'LOW_STOCK' | 'OVERSTOCK' | 'DEMAND_SPIKE' | 'SUPPLIER_ISSUE' | 'QUALITY_ISSUE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  partId?: string;
  partName?: string;
  currentStock?: number;
  recommendedAction: string;
  estimatedImpact: string;
  timeToAction: string;
  isRead: boolean;
  createdAt: string;
  aiGenerated: boolean;
}

interface InventoryOptimization {
  totalValue: number;
  optimizedValue: number;
  potentialSavings: number;
  overstockedItems: number;
  understockedItems: number;
  optimalTurnoverRate: number;
  currentTurnoverRate: number;
  recommendations: {
    category: string;
    action: string;
    impact: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedSavings: number;
  }[];
}

interface AIInventoryInsightsProps {
  brandId: string;
  onNavigate?: (tab: string) => void;
}

const AIInventoryInsights: React.FC<AIInventoryInsightsProps> = ({
  brandId,
  onNavigate
}) => {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<AIForecast[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [optimization, setOptimization] = useState<InventoryOptimization | null>(null);
  
  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    message: string;
    timestamp: string;
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Fetch AI insights and forecasts
  const fetchAIData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [comprehensiveRes, forecastRes, alertsRes] = await Promise.all([
        // New comprehensive insights API
        fetch(`/api/ai-forecasting/comprehensive-insights?brandId=${brandId}&timeframe=${selectedTimeframe}&includeAI=true`),
        
        // Original forecast API for backward compatibility
        fetch(`/api/ai-forecasting/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId, days: parseInt(selectedTimeframe) })
        }),
        
        // Alerts API
        fetch(`/api/ai-forecasting/restock-alerts?brandId=${brandId}&limit=50`)
      ]);

      // Process comprehensive insights
      if (comprehensiveRes.ok) {
        const comprehensiveData = await comprehensiveRes.json();
        if (comprehensiveData.success) {
          // Use comprehensive insights directly
          setInsights(comprehensiveData.data.insights || []);
          
          // Generate optimization data from analytics
          if (comprehensiveData.data.analytics) {
            const analytics = comprehensiveData.data.analytics;
            const optimizationData: InventoryOptimization = {
              totalValue: analytics.totalValue,
              optimizedValue: analytics.totalValue - analytics.overstockValue,
              potentialSavings: analytics.overstockValue * 0.15,
              overstockedItems: Math.floor(analytics.overstockValue / 10000),
              understockedItems: Math.floor(analytics.stockoutRisk * analytics.totalParts),
              optimalTurnoverRate: 12,
              currentTurnoverRate: analytics.averageTurnover,
              recommendations: [
                {
                  category: 'Stock Optimization',
                  action: 'Optimize stock levels based on AI analysis',
                  impact: 'Reduce carrying costs and improve cash flow',
                  priority: 'HIGH',
                  estimatedSavings: analytics.overstockValue * 0.1
                },
                {
                  category: 'Demand Forecasting',
                  action: 'Implement AI-powered demand forecasting',
                  impact: 'Improve forecast accuracy and reduce stockouts',
                  priority: 'MEDIUM',
                  estimatedSavings: analytics.totalValue * 0.05
                },
                {
                  category: 'Supplier Management',
                  action: 'Optimize supplier relationships and lead times',
                  impact: 'Reduce procurement costs and improve reliability',
                  priority: 'MEDIUM',
                  estimatedSavings: analytics.totalValue * 0.03
                }
              ]
            };
            setOptimization(optimizationData);
          }
        }
      }

      // Process forecast data for forecasting tab
      if (forecastRes.ok) {
        const forecastData = await forecastRes.json();
        if (forecastData.success) {
          // Transform forecast data to match our interface
          const transformedForecasts: AIForecast[] = forecastData.forecasts.map((f: any) => ({
            partId: f.partId,
            partCode: f.partCode,
            partName: f.partName,
            currentStock: f.currentMSL, // Using MSL as current stock for demo
            currentMSL: f.currentMSL,
            projectedDemand: f.projectedDemand,
            recommendedMSL: f.recommendedMSL,
            needsReorder: f.needsReorder,
            confidence: f.confidence,
            trend: f.projectedDemand > f.currentMSL ? 'INCREASING' : 'DECREASING',
            seasonality: f.confidence > 0.8 ? 'HIGH' : f.confidence > 0.6 ? 'MEDIUM' : 'LOW',
            riskLevel: f.needsReorder ? 'HIGH' : 'LOW',
            suggestedActions: generateSuggestedActions(f),
            historicalData: {
              avgMonthlyDemand: f.projectedDemand,
              peakDemand: Math.round(f.projectedDemand * 1.5),
              lowDemand: Math.round(f.projectedDemand * 0.5),
              volatility: 1 - f.confidence
            }
          }));
          setForecasts(transformedForecasts);
          
          // If comprehensive insights failed, generate fallback insights
          if (!comprehensiveRes.ok) {
            const generatedInsights = generateInsightsFromForecasts(transformedForecasts);
            setInsights(generatedInsights);
            
            const optimizationData = generateOptimizationData(transformedForecasts);
            setOptimization(optimizationData);
          }
        }
      }

      // Process alerts
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        if (alertsData.success) {
          // Transform alerts to smart alerts
          const transformedAlerts: SmartAlert[] = alertsData.data.alerts.map((alert: any) => ({
            id: alert.id,
            type: 'LOW_STOCK',
            severity: alert.recommendedQuantity > 100 ? 'HIGH' : 'MEDIUM',
            title: `Restock Alert: ${alert.part.name}`,
            message: `Forecasted demand: ${alert.forecastedDemand}, Available: ${alert.availableStock}`,
            partId: alert.partId,
            partName: alert.part.name,
            currentStock: alert.availableStock,
            recommendedAction: `Order ${alert.recommendedQuantity} units`,
            estimatedImpact: `Potential stockout in ${Math.ceil(alert.availableStock / (alert.forecastedDemand / 30))} days`,
            timeToAction: alert.recommendedQuantity > 100 ? 'Immediate' : '1-2 days',
            isRead: false,
            createdAt: alert.createdAt || new Date().toISOString(),
            aiGenerated: true
          }));
          setAlerts(transformedAlerts);
        }
      }

    } catch (error) {
      console.error('Error fetching AI data:', error);
      toast({
        title: "Error",
        description: "Failed to load AI insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedTimeframe, toast]);

  useEffect(() => {
    fetchAIData();
  }, [fetchAIData]);

  // Generate suggested actions based on forecast
  const generateSuggestedActions = (forecast: any): string[] => {
    const actions: string[] = [];
    
    if (forecast.needsReorder) {
      actions.push(`Order ${forecast.recommendedMSL - forecast.currentMSL} units immediately`);
    }
    
    if (forecast.confidence < 0.6) {
      actions.push('Review historical data for better accuracy');
    }
    
    if (forecast.projectedDemand > forecast.currentMSL * 2) {
      actions.push('Consider bulk ordering for better pricing');
    }
    
    actions.push('Monitor demand patterns closely');
    
    return actions;
  };

  // Generate insights from forecasts
  const generateInsightsFromForecasts = (forecasts: AIForecast[]): AIInsight[] => {
    const insights: AIInsight[] = [];
    
    // Critical stock insights
    const criticalParts = forecasts.filter(f => f.riskLevel === 'CRITICAL' || f.needsReorder);
    if (criticalParts.length > 0) {
      insights.push({
        id: 'critical-stock',
        type: 'FORECAST',
        priority: 'CRITICAL',
        title: `${criticalParts.length} Parts Need Immediate Attention`,
        description: `Critical stock levels detected for ${criticalParts.length} parts that may cause service disruptions.`,
        impact: 'High risk of stockouts and service delays',
        actionRequired: true,
        suggestedActions: [
          'Review and approve restock orders',
          'Contact suppliers for expedited delivery',
          'Consider alternative suppliers'
        ],
        confidence: 0.95,
        createdAt: new Date().toISOString(),
        category: 'Stock Management',
        affectedParts: criticalParts.map(p => p.partName),
        riskMitigation: 'Immediate reordering required'
      });
    }

    // Demand trend insights
    const increasingDemand = forecasts.filter(f => f.trend === 'INCREASING').length;
    const decreasingDemand = forecasts.filter(f => f.trend === 'DECREASING').length;
    
    if (increasingDemand > decreasingDemand) {
      insights.push({
        id: 'demand-trend',
        type: 'FORECAST',
        priority: 'MEDIUM',
        title: 'Overall Demand Trending Upward',
        description: `${increasingDemand} parts showing increased demand vs ${decreasingDemand} decreasing.`,
        impact: 'Potential revenue growth opportunity',
        actionRequired: false,
        suggestedActions: [
          'Increase safety stock levels',
          'Negotiate better supplier terms',
          'Consider bulk purchasing'
        ],
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        category: 'Demand Analysis'
      });
    }

    // Optimization opportunities
    const overstockedParts = forecasts.filter(f => f.currentStock > f.recommendedMSL * 1.5);
    if (overstockedParts.length > 0) {
      const potentialSavings = overstockedParts.reduce((sum, part) => {
        return sum + ((part.currentStock - part.recommendedMSL) * 100); // Assuming ₹100 avg cost
      }, 0);
      
      insights.push({
        id: 'overstock-optimization',
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        title: 'Inventory Optimization Opportunity',
        description: `${overstockedParts.length} parts are overstocked, tying up capital.`,
        impact: 'Capital optimization and storage cost reduction',
        actionRequired: false,
        suggestedActions: [
          'Reduce reorder quantities',
          'Implement promotional pricing',
          'Review supplier minimum order quantities'
        ],
        confidence: 0.85,
        createdAt: new Date().toISOString(),
        category: 'Cost Optimization',
        affectedParts: overstockedParts.map(p => p.partName),
        potentialSavings
      });
    }

    return insights;
  };

  // Generate optimization data
  const generateOptimizationData = (forecasts: AIForecast[]): InventoryOptimization => {
    const totalValue = forecasts.reduce((sum, f) => sum + (f.currentStock * 100), 0); // Assuming ₹100 avg cost
    const optimizedValue = forecasts.reduce((sum, f) => sum + (f.recommendedMSL * 100), 0);
    const potentialSavings = totalValue - optimizedValue;
    
    return {
      totalValue,
      optimizedValue,
      potentialSavings: Math.max(0, potentialSavings),
      overstockedItems: forecasts.filter(f => f.currentStock > f.recommendedMSL * 1.2).length,
      understockedItems: forecasts.filter(f => f.needsReorder).length,
      optimalTurnoverRate: 12, // Monthly turnover
      currentTurnoverRate: 8,
      recommendations: [
        {
          category: 'Stock Levels',
          action: 'Optimize reorder points based on AI forecasts',
          impact: 'Reduce carrying costs by 15-20%',
          priority: 'HIGH',
          estimatedSavings: potentialSavings * 0.6
        },
        {
          category: 'Supplier Management',
          action: 'Negotiate flexible order quantities',
          impact: 'Improve cash flow and reduce waste',
          priority: 'MEDIUM',
          estimatedSavings: potentialSavings * 0.3
        },
        {
          category: 'Demand Planning',
          action: 'Implement seasonal adjustments',
          impact: 'Better demand prediction accuracy',
          priority: 'MEDIUM',
          estimatedSavings: potentialSavings * 0.1
        }
      ]
    };
  };

  // Handle AI chat
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      message: chatInput,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      // Simulate AI response (replace with actual AI API call)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponse = generateAIResponse(chatInput, forecasts, insights);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        message: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive"
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Generate AI response based on context
  const generateAIResponse = (query: string, forecasts: AIForecast[], insights: AIInsight[]): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('stock') || lowerQuery.includes('inventory')) {
      const criticalParts = forecasts.filter(f => f.needsReorder).length;
      return `Based on current analysis, you have ${criticalParts} parts that need immediate restocking. Your total inventory value is ₹${forecasts.reduce((sum, f) => sum + (f.currentStock * 100), 0).toLocaleString()}. Would you like me to prioritize the most critical items for you?`;
    }
    
    if (lowerQuery.includes('forecast') || lowerQuery.includes('demand')) {
      const highConfidence = forecasts.filter(f => f.confidence > 0.8).length;
      return `I've analyzed demand patterns for ${forecasts.length} parts with ${highConfidence} showing high confidence predictions. The overall trend shows ${forecasts.filter(f => f.trend === 'INCREASING').length} parts with increasing demand. Would you like specific recommendations for any particular category?`;
    }
    
    if (lowerQuery.includes('save') || lowerQuery.includes('cost') || lowerQuery.includes('optimize')) {
      const savings = insights.find(i => i.potentialSavings)?.potentialSavings || 0;
      return `I've identified potential savings of ₹${savings.toLocaleString()} through inventory optimization. This includes reducing overstock on ${forecasts.filter(f => f.currentStock > f.recommendedMSL * 1.2).length} items and improving turnover rates. Shall I create an optimization plan for you?`;
    }
    
    if (lowerQuery.includes('alert') || lowerQuery.includes('urgent')) {
      const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
      return `You currently have ${alerts.length} active alerts, with ${criticalAlerts} marked as critical. The most urgent items need attention within the next 24-48 hours to avoid stockouts. Would you like me to prioritize these for immediate action?`;
    }
    
    // Default response
    return `I can help you with inventory forecasting, stock optimization, demand analysis, and cost savings. Currently monitoring ${forecasts.length} parts with ${insights.length} actionable insights. What specific aspect of your inventory would you like to explore?`;
  };

  // Mark alert as read
  const markAlertAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING': return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'DECREASING': return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading AI Insights...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-purple-900">
                <Brain className="h-6 w-6" />
                <span>AI-Powered Inventory Insights</span>
                <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-700 border-purple-300">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              </CardTitle>
              <CardDescription className="text-purple-700">
                Intelligent forecasting, optimization, and automated insights for your inventory
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => setChatOpen(true)}
                variant="outline" 
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Bot className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              <Button onClick={fetchAIData} variant="outline" className="border-purple-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* AI Insights Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Insights</p>
                  <p className="text-2xl font-bold text-purple-900">{insights.length}</p>
                </div>
                <Lightbulb className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Smart Alerts</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {alerts.filter(a => !a.isRead).length}
                  </p>
                </div>
                <Bell className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Forecasted Parts</p>
                  <p className="text-2xl font-bold text-purple-900">{forecasts.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Potential Savings</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ₹{optimization?.potentialSavings.toLocaleString() || '0'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>AI Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Demand Forecasting</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4" />
            <span>Smart Insights</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Intelligent Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Optimization</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gauge className="h-5 w-5" />
                  <span>AI Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Forecast Accuracy</span>
                      <span>87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Stock Optimization</span>
                      <span>73%</span>
                    </div>
                    <Progress value={73} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Cost Reduction</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Service Level</span>
                      <span>95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>AI-Recommended Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.slice(0, 4).map((insight, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          insight.priority === 'CRITICAL' ? 'bg-red-500' :
                          insight.priority === 'HIGH' ? 'bg-orange-500' :
                          insight.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{insight.title}</p>
                          <p className="text-xs text-muted-foreground">{insight.category}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent AI Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent AI Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Brain className="h-8 w-8 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Demand Forecast Updated</p>
                    <p className="text-sm text-muted-foreground">
                      AI analyzed {forecasts.length} parts and identified {forecasts.filter(f => f.needsReorder).length} requiring immediate attention
                    </p>
                  </div>
                  <Badge variant="outline">2 min ago</Badge>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Lightbulb className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Optimization Opportunity Detected</p>
                    <p className="text-sm text-muted-foreground">
                      Potential savings of ₹{optimization?.potentialSavings.toLocaleString()} identified through stock optimization
                    </p>
                  </div>
                  <Badge variant="outline">5 min ago</Badge>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Bell className="h-8 w-8 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-medium">Smart Alert Generated</p>
                    <p className="text-sm text-muted-foreground">
                      {alerts.filter(a => a.severity === 'HIGH').length} high-priority alerts created for immediate action
                    </p>
                  </div>
                  <Badge variant="outline">10 min ago</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demand Forecasting Tab */}
        <TabsContent value="forecasting" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>AI Demand Forecasting ({forecasts.length})</span>
                  </CardTitle>
                  <CardDescription>
                    Machine learning-powered demand predictions with confidence intervals
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                      <SelectItem value="180">6 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search forecasts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="critical">Critical Items</SelectItem>
                    <SelectItem value="high-demand">High Demand</SelectItem>
                    <SelectItem value="seasonal">Seasonal Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Forecasts Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Details</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Forecasted Demand</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts
                    .filter(forecast => 
                      !searchTerm || 
                      forecast.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      forecast.partCode.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .filter(forecast => {
                      if (selectedCategory === 'all') return true;
                      if (selectedCategory === 'critical') return forecast.riskLevel === 'CRITICAL';
                      if (selectedCategory === 'high-demand') return forecast.projectedDemand > forecast.currentMSL;
                      if (selectedCategory === 'seasonal') return forecast.seasonality === 'HIGH';
                      return true;
                    })
                    .map((forecast) => (
                      <TableRow key={forecast.partId}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{forecast.partName}</p>
                              <p className="text-sm text-muted-foreground">{forecast.partCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{forecast.currentStock}</p>
                            <p className="text-sm text-muted-foreground">MSL: {forecast.currentMSL}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{forecast.projectedDemand}</p>
                            <p className="text-sm text-muted-foreground">
                              Recommended: {forecast.recommendedMSL}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTrendIcon(forecast.trend)}
                            <span className="text-sm">{forecast.trend}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={forecast.confidence * 100} className="w-16 h-2" />
                            <span className="text-sm">{Math.round(forecast.confidence * 100)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={forecast.riskLevel === 'CRITICAL' ? 'destructive' : 
                                   forecast.riskLevel === 'HIGH' ? 'destructive' : 'default'}
                          >
                            {forecast.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {forecast.needsReorder && (
                              <Button size="sm" variant="outline">
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Order
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {forecasts.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Forecasts Available</h3>
                  <p className="text-muted-foreground mb-4">
                    AI forecasting requires historical data to generate predictions.
                  </p>
                  <Button onClick={fetchAIData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Forecasts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>AI-Generated Insights ({insights.length})</span>
                  </CardTitle>
                  <CardDescription>
                    Intelligent analysis and actionable recommendations
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights
                  .filter(insight => selectedPriority === 'all' || insight.priority === selectedPriority)
                  .map((insight) => (
                    <Card key={insight.id} className={`border-l-4 ${getPriorityColor(insight.priority)}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1">
                              {insight.type === 'FORECAST' && <TrendingUp className="h-5 w-5 text-blue-600" />}
                              {insight.type === 'OPTIMIZATION' && <Zap className="h-5 w-5 text-green-600" />}
                              {insight.type === 'ANOMALY' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                              {insight.type === 'RECOMMENDATION' && <Lightbulb className="h-5 w-5 text-purple-600" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <CardTitle className="text-lg">{insight.title}</CardTitle>
                                <Badge variant="outline" className={getPriorityColor(insight.priority)}>
                                  {insight.priority}
                                </Badge>
                                {insight.actionRequired && (
                                  <Badge variant="destructive" className="text-xs">
                                    Action Required
                                  </Badge>
                                )}
                              </div>
                              <CardDescription>{insight.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">Confidence</p>
                              <p className="font-medium">{Math.round(insight.confidence * 100)}%</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Impact</p>
                            <p className="text-sm">{insight.impact}</p>
                          </div>
                          
                          {insight.potentialSavings && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Potential Savings</p>
                              <p className="text-sm font-medium text-green-600">
                                ₹{insight.potentialSavings.toLocaleString()}
                              </p>
                            </div>
                          )}
                          
                          {insight.affectedParts && insight.affectedParts.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Affected Parts</p>
                              <div className="flex flex-wrap gap-1">
                                {insight.affectedParts.slice(0, 3).map((part, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {part}
                                  </Badge>
                                ))}
                                {insight.affectedParts.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{insight.affectedParts.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Suggested Actions</p>
                            <ul className="space-y-1">
                              {insight.suggestedActions.map((action, index) => (
                                <li key={index} className="flex items-start space-x-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                              <Badge variant="outline" className="text-xs">
                                {insight.category}
                              </Badge>
                            </div>
                            <div className="flex space-x-1">
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                Details
                              </Button>
                              {insight.actionRequired && (
                                <Button size="sm">
                                  Take Action
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {insights.length === 0 && (
                <div className="text-center py-12">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
                  <p className="text-muted-foreground mb-4">
                    AI is analyzing your inventory data to generate insights.
                  </p>
                  <Button onClick={fetchAIData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intelligent Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Intelligent Alerts ({alerts.filter(a => !a.isRead).length})</span>
                  </CardTitle>
                  <CardDescription>
                    AI-powered alerts for proactive inventory management
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))}
                >
                  Mark All Read
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={`transition-all ${
                      !alert.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : 'border-l-4 border-l-gray-200'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-1">
                            {alert.type === 'STOCK_OUT' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                            {alert.type === 'LOW_STOCK' && <TrendingDown className="h-5 w-5 text-orange-600" />}
                            {alert.type === 'OVERSTOCK' && <TrendingUp className="h-5 w-5 text-blue-600" />}
                            {alert.type === 'DEMAND_SPIKE' && <Activity className="h-5 w-5 text-green-600" />}
                            {alert.type === 'SUPPLIER_ISSUE' && <Truck className="h-5 w-5 text-purple-600" />}
                            {alert.type === 'QUALITY_ISSUE' && <Shield className="h-5 w-5 text-red-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{alert.title}</h4>
                              <Badge 
                                variant={alert.severity === 'CRITICAL' ? 'destructive' : 
                                       alert.severity === 'HIGH' ? 'destructive' : 'default'}
                              >
                                {alert.severity}
                              </Badge>
                              {alert.aiGenerated && (
                                <Badge variant="outline" className="text-xs">
                                  <Bot className="w-3 h-3 mr-1" />
                                  AI Generated
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                            
                            {alert.partName && (
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                                <span>Part: {alert.partName}</span>
                                {alert.currentStock !== undefined && (
                                  <span>Current Stock: {alert.currentStock}</span>
                                )}
                              </div>
                            )}
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2">
                                <Wrench className="h-3 w-3 text-blue-600" />
                                <span className="font-medium">Recommended Action:</span>
                                <span>{alert.recommendedAction}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-orange-600" />
                                <span className="font-medium">Time to Action:</span>
                                <span>{alert.timeToAction}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Target className="h-3 w-3 text-green-600" />
                                <span className="font-medium">Estimated Impact:</span>
                                <span>{alert.estimatedImpact}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-1">
                            {!alert.isRead && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => markAlertAsRead(alert.id)}
                              >
                                Mark Read
                              </Button>
                            )}
                            <Button size="sm">
                              Take Action
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {alerts.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground mb-4">
                    AI monitoring is active. You'll be notified of any issues.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>All systems operating normally</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          {optimization && (
            <>
              {/* Optimization Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Current Inventory Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      ₹{optimization.totalValue.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total investment in inventory
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Optimized Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      ₹{optimization.optimizedValue.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI-recommended optimal value
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Potential Savings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      ₹{optimization.potentialSavings.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {((optimization.potentialSavings / optimization.totalValue) * 100).toFixed(1)}% reduction possible
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Optimization Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart className="h-5 w-5" />
                    <span>Optimization Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {optimization.overstockedItems}
                      </div>
                      <p className="text-sm text-muted-foreground">Overstocked Items</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {optimization.understockedItems}
                      </div>
                      <p className="text-sm text-muted-foreground">Understocked Items</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {optimization.currentTurnoverRate}x
                      </div>
                      <p className="text-sm text-muted-foreground">Current Turnover</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {optimization.optimalTurnoverRate}x
                      </div>
                      <p className="text-sm text-muted-foreground">Optimal Turnover</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Optimization Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>AI Optimization Recommendations</span>
                  </CardTitle>
                  <CardDescription>
                    Prioritized actions to optimize your inventory investment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimization.recommendations.map((rec, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline">{rec.category}</Badge>
                                <Badge 
                                  variant={rec.priority === 'HIGH' ? 'destructive' : 
                                         rec.priority === 'MEDIUM' ? 'default' : 'secondary'}
                                >
                                  {rec.priority} Priority
                                </Badge>
                              </div>
                              <h4 className="font-medium mb-1">{rec.action}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{rec.impact}</p>
                              <div className="flex items-center space-x-2 text-sm">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-600">
                                  Estimated Savings: ₹{rec.estimatedSavings.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <Button size="sm">
                              Implement
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Chat Assistant Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-purple-600" />
              <span>AI Inventory Assistant</span>
            </DialogTitle>
            <DialogDescription>
              Ask me anything about your inventory, forecasts, or optimization opportunities
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col h-96">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-2 text-purple-600" />
                  <p>Hello! I'm your AI inventory assistant.</p>
                  <p className="text-sm">Ask me about stock levels, forecasts, or optimization tips.</p>
                </div>
              )}
              
              {chatMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-purple-200' : 'text-muted-foreground'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat Input */}
            <div className="flex space-x-2 mt-4">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about inventory, forecasts, optimization..."
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                disabled={chatLoading}
              />
              <Button 
                onClick={handleChatSubmit} 
                disabled={chatLoading || !chatInput.trim()}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIInventoryInsights;