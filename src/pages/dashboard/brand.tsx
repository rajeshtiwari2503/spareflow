import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  Video, 
  CheckCircle, 
  Plus, 
  Upload, 
  ArrowRight, 
  ArrowLeft,
  Box,
  ShoppingCart,
  Save,
  Check,
  AlertCircle,
  Eye,
  FileText,
  Download,
  Loader2,
  QrCode,
  MapPin,
  RotateCcw,
  Clock,
  XCircle,
  Brain,
  BarChart3,
  Zap,
  Bell,
  AlertTriangle,
  TrendingUp,
  Search,
  Wallet,
  DollarSign,
  Activity,
  Users,
  Settings,
  RefreshCw,
  Send,
  CreditCard,
  History,
  TrendingDown,
  Printer,
  ExternalLink,
  Calendar,
  Target,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Info,
  Shield,
  Lock,
  Building
} from 'lucide-react';
import { TrackingDashboard } from '@/components/TrackingDashboard';
import { RestockAlertsManager } from '@/components/RestockAlertsManager';
import UnifiedShipmentManager from '@/components/UnifiedShipmentManager';
import EnhancedShipmentDashboard from '@/components/EnhancedShipmentDashboard';
import EnhancedPartCatalog from '@/components/EnhancedPartCatalog';
import SimplePartCatalog from '@/components/SimplePartCatalog';
import SimplifiedInventoryManager from '@/components/SimplifiedInventoryManager';
import FixedEnhancedInventoryManager from '@/components/FixedEnhancedInventoryManager';

import EnhancedBrandWalletManager from '@/components/EnhancedBrandWalletManager';
import { NotificationCenter } from '@/components/NotificationCenter';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import EnhancedAuthorizedNetworkManager from '@/components/EnhancedAuthorizedNetworkManager';
import ComprehensiveProfileManager from '@/components/ComprehensiveProfileManager';
import BrandOverviewDashboard from '@/components/BrandOverviewDashboard';
import EnhancedBrandAnalyticsDashboard from '@/components/EnhancedBrandAnalyticsDashboard';
import EnhancedBrandNotificationSystem from '@/components/EnhancedBrandNotificationSystem';
import EnhancedBrandSettingsConfiguration from '@/components/EnhancedBrandSettingsConfiguration';
import EnhancedBrandPricingDisplay from '@/components/EnhancedBrandPricingDisplay';
import ComprehensiveCourierPricingDisplay from '@/components/ComprehensiveCourierPricingDisplay';
import BrandInventoryDashboard from '@/components/BrandInventoryDashboard';
import ERPGradeInventoryManager from '@/components/ERPGradeInventoryManager';
import ComprehensiveInventoryManager from '@/components/ComprehensiveInventoryManager';
import AIInventoryInsights from '@/components/AIInventoryInsights';
import { useToast } from '@/components/ui/use-toast';
import DashboardHeader from '@/components/DashboardHeader';

// Interfaces
interface DashboardStats {
  walletBalance: number;
  totalShipments: number;
  pendingShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  totalParts: number;
  lowStockParts: number;
  totalRevenue: number;
  monthlyGrowth: number;
  totalReturns: number;
  pendingReturns: number;
}

interface MSLAlert {
  id: string;
  partName: string;
  partCode: string;
  currentStock: number;
  msl: number;
  serviceCenterName: string;
  urgency: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface RecentActivity {
  id: string;
  type: 'shipment' | 'return' | 'wallet' | 'part' | 'order';
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  amount?: number;
}

interface ServiceCenter {
  id: string;
  name: string;
  address: string;
  pincode: string;
  phone: string;
  email: string;
}

interface Part {
  id: string;
  name: string;
  code: string;
  price: number;
  weight: number;
  msl: number;
  description?: string;
  diyVideoUrl?: string;
}

interface ShipmentForm {
  serviceCenterId: string;
  parts: Array<{ partId: string; quantity: number }>;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  numBoxes: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
}

interface ReturnRequest {
  id: string;
  serviceCenterName: string;
  partName: string;
  partCode: string;
  reason: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'picked' | 'received';
  createdAt: string;
  awbNumber?: string;
  estimatedValue: number;
}



// Return Management Component
const ReturnManagementModule: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/reverse-requests');
      if (response.ok) {
        const data = await response.json();
        setReturns(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnAction = async (returnId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/reverse-requests/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        toast({
          title: `Return ${action}d successfully`,
          description: `The return request has been ${action}d and the service center will be notified.`
        });
        fetchReturns();
      } else {
        toast({
          title: `Failed to ${action} return`,
          description: 'Please try again later.',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing return:`, error);
      toast({
        title: "Error",
        description: `Network error while ${action}ing return.`,
        variant: "destructive"
      });
    }
  };

  const generateReturnLabel = async (returnId: string) => {
    try {
      const response = await fetch(`/api/reverse-labels/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reverseRequestId: returnId })
      });

      if (response.ok) {
        const data = await response.json();
        // Open label in new window
        const labelWindow = window.open('', '_blank');
        if (labelWindow) {
          labelWindow.document.write(data.labelHTML);
          labelWindow.document.close();
          labelWindow.focus();
        }
        toast({
          title: "Return label generated",
          description: "The return label has been opened in a new window for printing."
        });
      }
    } catch (error) {
      console.error('Error generating return label:', error);
      toast({
        title: "Error generating label",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const filteredReturns = returns.filter(returnReq => {
    if (filter === 'all') return true;
    return returnReq.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'picked': return 'outline';
      case 'received': return 'default';
      default: return 'secondary';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5" />
              <span>Return Management</span>
            </CardTitle>
            <CardDescription>Manage return requests from service centers</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Returns</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="picked">In Transit</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchReturns} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading returns...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No return requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReturns.map((returnReq) => (
              <motion.div
                key={returnReq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-semibold">{returnReq.partName}</h4>
                      <p className="text-sm text-gray-600">{returnReq.partCode}</p>
                    </div>
                    <Badge variant={getStatusColor(returnReq.status)}>
                      {returnReq.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{returnReq.estimatedValue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{new Date(returnReq.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-xs text-gray-500">Service Center</Label>
                    <p className="text-sm font-medium">{returnReq.serviceCenterName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Quantity</Label>
                    <p className="text-sm font-medium">{returnReq.quantity} units</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Reason</Label>
                    <p className="text-sm font-medium">{returnReq.reason.replace('_', ' ')}</p>
                  </div>
                </div>

                {returnReq.awbNumber && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">Return AWB Generated</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {returnReq.awbNumber}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {returnReq.status === 'pending' && 'Awaiting your approval'}
                      {returnReq.status === 'approved' && 'Approved - Ready for pickup'}
                      {returnReq.status === 'picked' && 'In transit to your facility'}
                      {returnReq.status === 'received' && 'Received and processed'}
                      {returnReq.status === 'rejected' && 'Request was rejected'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {returnReq.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReturnAction(returnReq.id, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReturnAction(returnReq.id, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </>
                    )}
                    
                    {returnReq.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateReturnLabel(returnReq.id)}
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Print Label
                      </Button>
                    )}

                    {returnReq.awbNumber && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://www.dtdc.in/tracking/track.asp?strAWBNo=${returnReq.awbNumber}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Track
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Notifications Panel Component
const NotificationsPanel: React.FC<{ notifications: any[] }> = ({ notifications }) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{notification.timestamp}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                  )}
                </div>
              </div>
            ))}
            {notifications.length > 5 && (
              <Button variant="outline" size="sm" className="w-full">
                View All Notifications ({notifications.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


// Error boundary wrapper for part catalog
function PartCatalogWrapper({ brandId, onPartCreated, onPartUpdated }: {
  brandId: string;
  onPartCreated?: (part: any) => void;
  onPartUpdated?: (part: any) => void;
}) {
  const [useSimple, setUseSimple] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
    setUseSimple(false);
    
    // Reset loading state after component mounts
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [brandId]);

  const handleError = (error: Error) => {
    console.error('Error in PartCatalogWrapper:', error);
    setHasError(true);
    setErrorMessage(error.message || 'An unexpected error occurred');
    setUseSimple(true);
    
    toast({
      title: "Part Catalog Error",
      description: "Switching to simple catalog mode due to technical issues",
      variant: "destructive"
    });
  };

  const resetError = () => {
    setHasError(false);
    setErrorMessage('');
    setUseSimple(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading inventory...</span>
      </div>
    );
  }

  if (useSimple || hasError) {
    return (
      <div className="space-y-4">
        {hasError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Enhanced catalog error: {errorMessage}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetError}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Enhanced Again
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => setUseSimple(true)}
                  >
                    Continue with Simple Version
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-700 text-sm">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Using simplified inventory view. Some advanced features may not be available.
          </p>
        </div>
        
        <SimplePartCatalog 
          brandId={brandId}
          onPartCreated={onPartCreated}
          onPartUpdated={onPartUpdated}
        />
      </div>
    );
  }

  // Wrap EnhancedPartCatalog in a try-catch to handle runtime errors
  try {
    return (
      <ErrorBoundary onError={handleError}>
        <EnhancedPartCatalog 
          brandId={brandId}
          onPartCreated={onPartCreated}
          onPartUpdated={onPartUpdated}
        />
      </ErrorBoundary>
    );
  } catch (error) {
    handleError(error as Error);
    return (
      <SimplePartCatalog 
        brandId={brandId}
        onPartCreated={onPartCreated}
        onPartUpdated={onPartUpdated}
      />
    );
  }
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="text-yellow-800 font-semibold">Component Error</h3>
            </div>
            <p className="text-yellow-700 text-sm">
              The enhanced inventory system encountered an error. Please try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Brand Dashboard Component
function BrandDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    walletBalance: 0,
    totalShipments: 0,
    pendingShipments: 0,
    inTransitShipments: 0,
    deliveredShipments: 0,
    totalParts: 0,
    lowStockParts: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    totalReturns: 0,
    pendingReturns: 0
  });
  const [mslAlerts, setMslAlerts] = useState<MSLAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/brand/dashboard-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(prev => ({ ...prev, ...statsData.metrics }));
      }

      // Fetch MSL alerts
      const alertsResponse = await fetch('/api/ai-forecasting/restock-alerts');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setMslAlerts(alertsData.alerts || []);
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/auth/activity');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      }

      // Fetch notifications
      const notificationsResponse = await fetch('/api/ai-forecasting/notifications?brandId=brand-1');
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.notifications || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();

    // Listen for navigation events from UnifiedShipmentManager
    const handleNavigateToShipments = (event: CustomEvent) => {
      const { tab } = event.detail;
      setActiveTab('shipments');
      // If we need to navigate to a specific sub-tab, we can handle that here
      if (tab === 'shipment-dashboard') {
        // The shipments tab will default to the dashboard view
        setTimeout(() => {
          // Find and click the dashboard tab if needed
          const dashboardTab = document.querySelector('[value="dashboard"]');
          if (dashboardTab) {
            (dashboardTab as HTMLElement).click();
          }
        }, 100);
      }
    };

    window.addEventListener('navigateToShipments', handleNavigateToShipments as EventListener);

    return () => {
      window.removeEventListener('navigateToShipments', handleNavigateToShipments as EventListener);
    };
  }, [fetchDashboardData]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Brand Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedRoute allowedRoles={['BRAND']}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <DashboardHeader 
            title="Brand Dashboard" 
            description={`Welcome back, ${user.name} - Manual Entry Override Protection Active`}
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                <Lock className="h-4 w-4" />
                <span>Security Enhanced</span>
              </div>
              <UnifiedNotificationCenter />
              <Button 
                onClick={fetchDashboardData}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </DashboardHeader>

          {/* Security Notice */}
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Enhanced Security Active:</strong> All recipient details are restricted to your authorized service centers and distributors. 
              Manual entry of custom recipients is prevented to ensure compliance and security.
            </AlertDescription>
          </Alert>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-11 lg:w-auto lg:grid-cols-11">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="shipments" className="flex items-center space-x-2">
                <Truck className="h-4 w-4" />
                <span>Shipments</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Inventory</span>
              </TabsTrigger>
              <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>AI Insights</span>
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex items-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span>Wallet</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Courier Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex items-center space-x-2">
                <RotateCcw className="h-4 w-4" />
                <span>Returns</span>
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Network</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <BrandOverviewDashboard onNavigate={setActiveTab} />
            </TabsContent>

            {/* Shipments Tab */}
            <TabsContent value="shipments" className="space-y-6">
              <Tabs defaultValue="unified" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="unified" className="flex items-center space-x-2">
                    <Truck className="h-4 w-4" />
                    <span>Create Shipments</span>
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Shipment Dashboard</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="unified" className="space-y-6">
                  <UnifiedShipmentManager />
                </TabsContent>

                <TabsContent value="dashboard" className="space-y-6">
                  <EnhancedShipmentDashboard 
                    brandId={user?.id || 'brand-1'}
                    userId={user?.id || 'brand-1'}
                    userRole="BRAND"
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-6">
              <Tabs defaultValue="comprehensive" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comprehensive" className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Comprehensive Inventory</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-powered" className="flex items-center space-x-2">
                    <Brain className="h-4 w-4" />
                    <span>AI-Powered Insights</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comprehensive" className="space-y-6">
                  <ComprehensiveInventoryManager 
                    brandId={user?.id || 'brand-1'}
                    onNavigate={setActiveTab}
                  />
                </TabsContent>

                <TabsContent value="ai-powered" className="space-y-6">
                  <AIInventoryInsights 
                    brandId={user?.id || 'brand-1'}
                    onNavigate={setActiveTab}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="ai-insights" className="space-y-6">
              <AIInventoryInsights 
                brandId={user?.id || 'brand-1'}
                onNavigate={setActiveTab}
              />
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              <EnhancedBrandWalletManager brandId={user?.id || 'brand-1'} />
            </TabsContent>

            {/* Courier Pricing Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <Tabs defaultValue="comprehensive" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comprehensive" className="flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <ArrowLeft className="h-4 w-4" />
                    <span>Forward & Reverse Pricing</span>
                  </TabsTrigger>
                  <TabsTrigger value="current" className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4" />
                    <span>Current Pricing Config</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comprehensive" className="space-y-6">
                  <ComprehensiveCourierPricingDisplay brandId={user?.id || 'brand-1'} />
                </TabsContent>

                <TabsContent value="current" className="space-y-6">
                  <EnhancedBrandPricingDisplay />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Returns Tab */}
            <TabsContent value="returns" className="space-y-6">
              <ReturnManagementModule />
            </TabsContent>

            {/* Authorized Network Tab */}
            <TabsContent value="network" className="space-y-6">
              <EnhancedAuthorizedNetworkManager />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <EnhancedBrandAnalyticsDashboard 
                brandId={user?.id || 'brand-1'}
                onNavigate={setActiveTab}
              />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <EnhancedBrandNotificationSystem 
                brandId={user?.id || 'brand-1'}
                onNavigate={setActiveTab}
              />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <EnhancedBrandSettingsConfiguration 
                brandId={user?.id || 'brand-1'}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default BrandDashboard;

// Force SSR to prevent hydration mismatch issues
export async function getServerSideProps() {
  return {
    props: {}
  };
}