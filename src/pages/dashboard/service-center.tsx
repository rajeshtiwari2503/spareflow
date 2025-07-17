import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Package, RotateCcw, Warehouse, Truck, CheckCircle, Plus, Eye, Loader2, Brain,
  AlertTriangle, Clock, TrendingUp, BarChart3, Bell, Search, Filter,
  Calendar, MapPin, User, FileText, Camera, Download, Upload,
  Zap, Target, Activity, DollarSign, Users, Settings, LogOut, Edit,
  Save, X, Phone, Mail, Building, MapPinIcon, Shield, Key
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getAuthToken, makeAuthenticatedRequest, removeAuthToken } from '@/lib/client-auth';
import { useAuth } from '@/contexts/AuthContext';
import DIYSupportAgent from '@/components/DIYSupportAgent';
import RequestBrandAccess from '@/components/RequestBrandAccess';
import { AuthorizationGuard, AuthorizationStatusBanner } from '@/components/AuthorizationGuard';
import { useAuthorization } from '@/hooks/useAuthorization';
import ServiceCenterProfileManager from '@/components/ServiceCenterProfileManager';

interface IncomingBox {
  id: string;
  shipmentId: string;
  boxNumber: number;
  awbNumber?: string;
  weight: number;
  status: string;
  boxParts: BoxPart[];
}

interface BoxPart {
  id: string;
  partId: string;
  quantity: number;
  received: boolean;
  part: {
    id: string;
    code: string;
    name: string;
    description: string;
  };
}

interface LocalInventory {
  id: string;
  partId: string;
  quantity: number;
  part: {
    id: string;
    code: string;
    name: string;
    price: number;
  };
}

interface ReverseRequest {
  id: string;
  partId: string;
  reason: string;
  returnReason?: string;
  costResponsibility?: string;
  courierCost?: number;
  paidBy?: string;
  quantity: number;
  status: string;
  createdAt: string;
  part: {
    name: string;
    code: string;
  };
}

// Enhanced interfaces for new functionality
interface SpareRequest {
  id: string;
  requestNumber: string;
  partId: string;
  quantity: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPATCHED' | 'DELIVERED';
  reason?: string;
  notes?: string;
  requiredBy?: string;
  createdAt: string;
  part: {
    id: string;
    code: string;
    name: string;
    price: number;
    brand: {
      name: string;
    };
  };
}

interface ServiceCenterInventory {
  id: string;
  partId: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitCost: number;
  location?: string;
  stockStatus: 'LOW' | 'NORMAL' | 'HIGH';
  stockPercentage: number;
  lastRestocked?: string;
  lastConsumed?: string;
  part: {
    id: string;
    code: string;
    name: string;
    category?: string;
    brand: {
      name: string;
    };
  };
}

interface ShipmentReceived {
  id: string;
  awbNumber: string;
  courierName?: string;
  status: 'PENDING' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'DISCREPANCY';
  expectedParts: any[];
  receivedParts: any[];
  receivedAt?: string;
  receivedBy?: string;
  discrepancyNotes?: string;
  images: string[];
  labelUrl?: string;
  isOverdue: boolean;
  createdAt: string;
}

interface DashboardStats {
  totalInventoryValue: number;
  lowStockItems: number;
  pendingShipments: number;
  pendingRequests: number;
  monthlyConsumption: number;
  averageResponseTime: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  serviceCenterProfile?: {
    id: string;
    centerName: string;
    gstNumber?: string;
    contactPerson?: string;
    serviceTypes?: string[];
    isVerified: boolean;
    addresses: Address[];
  };
}

interface Address {
  id: string;
  street: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export default function ServiceCenterDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  
  // Authorization hook
  const { authStatus, loading: authLoading } = useAuthorization();
  
  // State management
  const [spareRequests, setSpareRequests] = useState<SpareRequest[]>([]);
  const [inventory, setInventory] = useState<ServiceCenterInventory[]>([]);
  const [shipmentsReceived, setShipmentsReceived] = useState<ShipmentReceived[]>([]);
  const [reverseRequests, setReverseRequests] = useState<ReverseRequest[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInventoryValue: 0,
    lowStockItems: 0,
    pendingShipments: 0,
    pendingRequests: 0,
    monthlyConsumption: 0,
    averageResponseTime: 0
  });
  
  // Profile management state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Dialog states
  const [isSpareRequestOpen, setIsSpareRequestOpen] = useState(false);
  const [isInventoryUpdateOpen, setIsInventoryUpdateOpen] = useState(false);
  const [isReverseRequestOpen, setIsReverseRequestOpen] = useState(false);
  const [isShipmentReceiveOpen, setIsShipmentReceiveOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [serviceCenterProfileId, setServiceCenterProfileId] = useState<string>('');

  // Helper function to handle unauthorized actions
  const handleUnauthorizedAction = (actionName: string) => {
    toast({
      title: "Authorization Required",
      description: `You need brand authorization to ${actionName}. Please request brand access first.`,
      variant: "destructive"
    });
    setActiveTab('request-access');
  };

  // Profile management functions
  const fetchUserProfile = async () => {
    setIsProfileLoading(true);
    try {
      const response = await makeAuthenticatedRequest('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
        
        // Set the real user ID and service center profile ID
        setCurrentUserId(data.user.id);
        if (data.user.serviceCenterProfile?.id) {
          setServiceCenterProfileId(data.user.serviceCenterProfile.id);
        }
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleUpdateProfile = async (formData: any) => {
    try {
      const response = await makeAuthenticatedRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUserProfile();
        setIsEditingProfile(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleChangePassword = async (formData: any) => {
    try {
      const response = await makeAuthenticatedRequest('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsChangePasswordOpen(false);
        toast({
          title: "Password Changed",
          description: "Your password has been changed successfully.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    logout('manual');
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (serviceCenterProfileId) {
      fetchAllData();
    }
  }, [serviceCenterProfileId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSpareRequests(),
        fetchInventory(),
        fetchShipmentsReceived(),
        fetchReverseRequests(),
        fetchDashboardStats()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpareRequests = async () => {
    try {
      const response = await fetch(`/api/service-center/spare-requests?serviceCenterProfileId=${serviceCenterProfileId}`);
      const data = await response.json();
      setSpareRequests(data.spareRequests || []);
    } catch (error) {
      console.error('Error fetching spare requests:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch(`/api/service-center/inventory?serviceCenterProfileId=${serviceCenterProfileId}`);
      const data = await response.json();
      setInventory(data.inventory || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchShipmentsReceived = async () => {
    try {
      const response = await fetch(`/api/service-center/shipments-received?serviceCenterProfileId=${serviceCenterProfileId}`);
      const data = await response.json();
      setShipmentsReceived(data.shipments || []);
    } catch (error) {
      console.error('Error fetching shipments received:', error);
    }
  };

  const fetchReverseRequests = async () => {
    try {
      const response = await fetch('/api/reverse-requests');
      const data = await response.json();
      setReverseRequests(data || []);
    } catch (error) {
      console.error('Error fetching reverse requests:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`/api/service-center/dashboard-stats?serviceCenterProfileId=${serviceCenterProfileId}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data.stats || {
          totalInventoryValue: 0,
          lowStockItems: 0,
          pendingShipments: 0,
          pendingRequests: 0,
          monthlyConsumption: 0,
          averageResponseTime: 0
        });
      } else {
        throw new Error('Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default values on error
      setDashboardStats({
        totalInventoryValue: 0,
        lowStockItems: 0,
        pendingShipments: 0,
        pendingRequests: 0,
        monthlyConsumption: 0,
        averageResponseTime: 0
      });
    }
  };

  const handleCreateSpareRequest = async (formData: any) => {
    // Check authorization before proceeding
    if (!authStatus?.isAuthorized) {
      handleUnauthorizedAction('create spare requests');
      return;
    }

    try {
      // Validate required fields
      if (!formData.partId || !formData.quantity) {
        throw new Error('Please fill in all required fields');
      }

      const response = await fetch('/api/service-center/spare-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceCenterProfileId,
          quantity: Number(formData.quantity)
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create spare request');
      }

      await fetchSpareRequests();
      setIsSpareRequestOpen(false);
      toast({
        title: "Spare Request Created",
        description: "Your spare request has been submitted successfully.",
      });
    } catch (error: any) {
      console.error('Error creating spare request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create spare request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInventoryUpdate = async (formData: any) => {
    try {
      const response = await fetch('/api/service-center/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceCenterProfileId
        }),
      });
      
      if (response.ok) {
        await fetchInventory();
        setIsInventoryUpdateOpen(false);
        toast({
          title: "Inventory Updated",
          description: "Inventory has been updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast({
        title: "Error",
        description: "Failed to update inventory. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShipmentReceive = async (formData: any) => {
    try {
      const response = await fetch('/api/service-center/shipments-received', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        await Promise.all([fetchShipmentsReceived(), fetchInventory()]);
        setIsShipmentReceiveOpen(false);
        toast({
          title: "Shipment Updated",
          description: "Shipment status has been updated and inventory adjusted.",
        });
      }
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast({
        title: "Error",
        description: "Failed to update shipment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateReverseRequest = async (formData: any) => {
    try {
      // Validate required fields
      if (!formData.partId || !formData.returnReason) {
        throw new Error('Please fill in all required fields including return reason');
      }

      const response = await fetch('/api/reverse-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceCenterId: currentUserId,
          quantity: Number(formData.quantity) || 1
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create return request');
      }

      const result = await response.json();
      
      await fetchReverseRequests();
      setIsReverseRequestOpen(false);
      
      // Show enhanced success message with cost information
      if (result.success && result.costInfo) {
        toast({
          title: "Return Request Created Successfully",
          description: `${result.costInfo.message}. Your request has been submitted for approval.`,
        });
      } else {
        toast({
          title: "Return Request Created",
          description: "Your return request has been submitted for approval.",
        });
      }
    } catch (error: any) {
      console.error('Error creating reverse request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create return request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // DIY Support Agent handlers
  const handleCreateReverseRequestFromAI = async (partId: string, reason: string) => {
    try {
      const response = await fetch('/api/ai-support/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_REVERSE_REQUEST',
          userId: currentUserId,
          userRole: 'SERVICE_CENTER',
          partId,
          reason,
          quantity: 1
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Reverse Request Created",
          description: `Request for ${result.request.partName} has been submitted for brand approval.`,
        });
        fetchReverseRequests();
      } else {
        toast({
          title: "Request Failed",
          description: result.error || "Failed to create reverse request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating reverse request:', error);
      toast({
        title: "Error",
        description: "Failed to create reverse request. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Service Center Dashboard</h1>
                <p className="text-gray-600">Comprehensive spare parts management and logistics control</p>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                
                {/* User Profile Menu */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 p-2"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.serviceCenterProfile?.centerName ? `/api/avatar/${userProfile.id}` : undefined} />
                      <AvatarFallback>
                        {userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SC'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{userProfile?.name || 'Service Center'}</p>
                      <p className="text-xs text-gray-500">{userProfile?.serviceCenterProfile?.centerName || 'Loading...'}</p>
                    </div>
                  </Button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{userProfile?.name}</p>
                          <p className="text-xs text-gray-500">{userProfile?.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setShowUserMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile Settings
                        </button>
                        <button
                          onClick={() => {
                            setIsChangePasswordOpen(true);
                            setShowUserMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Change Password
                        </button>
                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              handleLogout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Authorization Status Banner */}
          <AuthorizationStatusBanner className="mb-6" />

          {/* Dashboard Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                    <p className="text-2xl font-bold text-gray-900">₹{dashboardStats.totalInventoryValue.toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">+12.5%</span>
                  <span className="text-gray-500 ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.lowStockItems}</p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-red-600">Requires attention</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Shipments</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.pendingShipments}</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Truck className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <Clock className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-orange-600">2 overdue</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.pendingRequests}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-gray-500">Avg response: {dashboardStats.averageResponseTime}h</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-10">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="spare-requests" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Spare Requests
              </TabsTrigger>
              <TabsTrigger value="incoming-shipments" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Incoming Shipments
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Returns
              </TabsTrigger>
              <TabsTrigger value="request-access" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Request Brand Access
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="ai-support" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Support
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates across all modules</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Shipment AWB123456 received</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Spare request SR-001 approved</p>
                          <p className="text-xs text-gray-500">4 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Low stock alert: Engine Filter</p>
                          <p className="text-xs text-gray-500">6 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        variant="outline" 
                        className="h-20 flex-col"
                        onClick={() => {
                          if (!authStatus?.isAuthorized) {
                            handleUnauthorizedAction('create spare requests');
                            return;
                          }
                          setIsSpareRequestOpen(true);
                        }}
                      >
                        <Plus className="h-6 w-6 mb-2" />
                        New Request
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex-col"
                        onClick={() => setIsShipmentReceiveOpen(true)}
                      >
                        <CheckCircle className="h-6 w-6 mb-2" />
                        Receive Shipment
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex-col"
                        onClick={() => setIsInventoryUpdateOpen(true)}
                      >
                        <Package className="h-6 w-6 mb-2" />
                        Update Stock
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex-col"
                        onClick={() => {
                          if (!authStatus?.isAuthorized) {
                            handleUnauthorizedAction('create return requests');
                            return;
                          }
                          setIsReverseRequestOpen(true);
                        }}
                      >
                        <RotateCcw className="h-6 w-6 mb-2" />
                        Return Parts
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Key performance indicators for this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Inventory Turnover</span>
                        <span className="text-sm text-gray-500">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Request Fulfillment</span>
                        <span className="text-sm text-gray-500">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">On-time Delivery</span>
                        <span className="text-sm text-gray-500">78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Support Tab */}
            <TabsContent value="ai-support" className="space-y-6">
              <DIYSupportAgent
                userId={currentUserId}
                userRole="SERVICE_CENTER"
                onCreateReverseRequest={handleCreateReverseRequestFromAI}
              />
            </TabsContent>

            {/* Other tabs would be implemented here with similar structure */}
            {/* For brevity, I'll add placeholders for the remaining tabs */}
            
            <TabsContent value="spare-requests" className="space-y-6">
              <AuthorizationGuard 
                feature="spare requests"
                onRequestAccess={() => setActiveTab('request-access')}
              >
                <SpareRequestsModule 
                  requests={spareRequests}
                  onCreateRequest={() => {
                    if (!authStatus?.isAuthorized) {
                      handleUnauthorizedAction('create spare requests');
                      return;
                    }
                    setIsSpareRequestOpen(true);
                  }}
                  onRefresh={fetchSpareRequests}
                />
              </AuthorizationGuard>
            </TabsContent>

            <TabsContent value="incoming-shipments" className="space-y-6">
              <AuthorizationGuard 
                feature="shipment management"
                onRequestAccess={() => setActiveTab('request-access')}
              >
                <IncomingShipmentsModule 
                  shipments={shipmentsReceived}
                  onReceiveShipment={() => setIsShipmentReceiveOpen(true)}
                  onRefresh={fetchShipmentsReceived}
                />
              </AuthorizationGuard>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <InventoryModule 
                inventory={inventory}
                onUpdateInventory={() => setIsInventoryUpdateOpen(true)}
                onRefresh={fetchInventory}
              />
            </TabsContent>

            <TabsContent value="returns" className="space-y-6">
              <AuthorizationGuard 
                feature="return requests"
                onRequestAccess={() => setActiveTab('request-access')}
              >
                <ReturnsModule 
                  requests={reverseRequests}
                  onCreateReturn={() => {
                    if (!authStatus?.isAuthorized) {
                      handleUnauthorizedAction('create return requests');
                      return;
                    }
                    setIsReverseRequestOpen(true);
                  }}
                  onRefresh={fetchReverseRequests}
                />
              </AuthorizationGuard>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <NotificationsModule />
            </TabsContent>

            <TabsContent value="request-access" className="space-y-6">
              <RequestBrandAccess userRole="SERVICE_CENTER" />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsModule stats={dashboardStats} />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Profile Management
                  </CardTitle>
                  <CardDescription>
                    Manage your personal information and service center details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={`/api/avatar/${userProfile?.id}`} />
                        <AvatarFallback>
                          {userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SC'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{userProfile?.name || 'Loading...'}</h3>
                        <p className="text-sm text-gray-600">{userProfile?.email}</p>
                        <p className="text-sm text-gray-500">
                          {userProfile?.serviceCenterProfile?.centerName || 'Service Center'}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setIsProfileManagerOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                  
                  {userProfile?.serviceCenterProfile && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Service Center Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Center Name:</span>
                            <span>{userProfile.serviceCenterProfile.centerName || 'Not set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contact Person:</span>
                            <span>{userProfile.serviceCenterProfile.contactPerson || 'Not set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">GST Number:</span>
                            <span>{userProfile.serviceCenterProfile.gstNumber || 'Not set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Verification Status:</span>
                            <Badge variant={userProfile.serviceCenterProfile.isVerified ? 'default' : 'destructive'}>
                              {userProfile.serviceCenterProfile.isVerified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span>{userProfile.phone || 'Not set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span>{userProfile.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Addresses:</span>
                            <span>{userProfile.serviceCenterProfile.addresses?.length || 0} saved</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Dialogs */}
          <SpareRequestDialog 
            open={isSpareRequestOpen}
            onOpenChange={setIsSpareRequestOpen}
            onSubmit={handleCreateSpareRequest}
          />

          <InventoryUpdateDialog 
            open={isInventoryUpdateOpen}
            onOpenChange={setIsInventoryUpdateOpen}
            onSubmit={handleInventoryUpdate}
          />

          <ShipmentReceiveDialog 
            open={isShipmentReceiveOpen}
            onOpenChange={setIsShipmentReceiveOpen}
            onSubmit={handleShipmentReceive}
            shipments={shipmentsReceived.filter(s => s.status === 'PENDING')}
          />

          <ReverseRequestDialog 
            open={isReverseRequestOpen}
            onOpenChange={setIsReverseRequestOpen}
            onSubmit={handleCreateReverseRequest}
          />

          {/* Service Center Profile Manager */}
          <ServiceCenterProfileManager
            isOpen={isProfileManagerOpen}
            onClose={() => setIsProfileManagerOpen(false)}
            onProfileUpdate={fetchUserProfile}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Component implementations for the enhanced dashboard modules

function SpareRequestsModule({ requests, onCreateRequest, onRefresh }: {
  requests: SpareRequest[];
  onCreateRequest: () => void;
  onRefresh: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'DISPATCHED': return 'bg-blue-100 text-blue-800';
      case 'DELIVERED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Spare Requests</CardTitle>
            <CardDescription>Manage your spare part requests to brands and distributors</CardDescription>
          </div>
          <Button onClick={onCreateRequest}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="DISPATCHED">Dispatched</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Part</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-sm">{request.requestNumber}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.part.name}</p>
                    <p className="text-sm text-gray-500">{request.part.code}</p>
                  </div>
                </TableCell>
                <TableCell>{request.quantity}</TableCell>
                <TableCell>
                  <Badge className={getUrgencyColor(request.urgency)}>
                    {request.urgency}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>{request.part.brand.name}</TableCell>
                <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IncomingShipmentsModule({ shipments, onReceiveShipment, onRefresh }: {
  shipments: ShipmentReceived[];
  onReceiveShipment: () => void;
  onRefresh: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_RECEIVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PARTIALLY_RECEIVED': return 'bg-blue-100 text-blue-800';
      case 'DISCREPANCY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Incoming Shipments</CardTitle>
            <CardDescription>Track and receive incoming shipments with DTDC integration</CardDescription>
          </div>
          <Button onClick={onReceiveShipment}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Receive Shipment
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shipments.map((shipment) => (
            <Card key={shipment.id} className={`border-2 ${shipment.isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">AWB: {shipment.awbNumber}</CardTitle>
                    <p className="text-sm text-gray-500">
                      Courier: {shipment.courierName || 'DTDC'} • 
                      Expected: {shipment.expectedParts.length} parts
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(shipment.status)}>
                      {shipment.status.replace('_', ' ')}
                    </Badge>
                    {shipment.isOverdue && (
                      <Badge variant="destructive">
                        <Clock className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Expected Parts</p>
                    <div className="space-y-1">
                      {shipment.expectedParts.slice(0, 3).map((part: any, index: number) => (
                        <p key={index} className="text-sm text-gray-600">
                          {part.partName} (Qty: {part.quantity})
                        </p>
                      ))}
                      {shipment.expectedParts.length > 3 && (
                        <p className="text-sm text-gray-500">
                          +{shipment.expectedParts.length - 3} more...
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Received Parts</p>
                    <div className="space-y-1">
                      {shipment.receivedParts.slice(0, 3).map((part: any, index: number) => (
                        <p key={index} className="text-sm text-gray-600">
                          {part.partName} (Qty: {part.quantity})
                        </p>
                      ))}
                      {shipment.receivedParts.length === 0 && (
                        <p className="text-sm text-gray-500">Not received yet</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {shipment.labelUrl && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Label
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryModule({ inventory, onUpdateInventory, onRefresh }: {
  inventory: ServiceCenterInventory[];
  onUpdateInventory: () => void;
  onRefresh: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.part.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && item.stockStatus === 'LOW') ||
                        (stockFilter === 'normal' && item.stockStatus === 'NORMAL') ||
                        (stockFilter === 'high' && item.stockStatus === 'HIGH');
    return matchesSearch && matchesStock;
  });

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'LOW': return 'bg-red-100 text-red-800';
      case 'NORMAL': return 'bg-green-100 text-green-800';
      case 'HIGH': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>Monitor and manage your spare parts inventory</CardDescription>
          </div>
          <Button onClick={onUpdateInventory}>
            <Package className="h-4 w-4 mr-2" />
            Update Stock
          </Button>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="normal">Normal Stock</SelectItem>
              <SelectItem value="high">High Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono">{item.part.code}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.part.name}</p>
                    <p className="text-sm text-gray-500">{item.part.brand.name}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.currentStock}</span>
                    <div className="w-20">
                      <Progress value={item.stockPercentage} className="h-2" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStockStatusColor(item.stockStatus)}>
                    {item.stockStatus}
                  </Badge>
                </TableCell>
                <TableCell>{item.location || 'Not specified'}</TableCell>
                <TableCell>
                  {item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Package className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReturnsModule({ requests, onCreateReturn, onRefresh }: {
  requests: ReverseRequest[];
  onCreateReturn: () => void;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Return Management</CardTitle>
            <CardDescription>Manage return requests with auto reverse pickup booking</CardDescription>
          </div>
          <Button onClick={onCreateReturn}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Create Return
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Part</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono">{request.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.part?.name || 'Unknown Part'}</p>
                    <p className="text-sm text-gray-500">{request.part?.code || request.partId}</p>
                  </div>
                </TableCell>
                <TableCell>{request.reason}</TableCell>
                <TableCell>
                  <Badge variant={request.status === 'APPROVED' ? 'default' : 'secondary'}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NotificationsModule() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK_ALERT':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'SHIPMENT_EXPECTED':
      case 'SHIPMENT_RECEIVED':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'SPARE_REQUEST':
        return <Package className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications & Alerts</CardTitle>
          <CardDescription>Stay updated with shipment ETA, stock alerts, and return approvals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications & Alerts</CardTitle>
        <CardDescription>Stay updated with shipment ETA, stock alerts, and return approvals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Alert 
                key={notification.id} 
                className={`cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                {getNotificationIcon(notification.type)}
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`font-medium ${!notification.isRead ? 'text-blue-900' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsModule({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
          <CardDescription>Comprehensive insights into your service center operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Monthly Consumption</p>
              <p className="text-2xl font-bold">₹{stats.monthlyConsumption.toLocaleString()}</p>
              <Progress value={75} className="h-2" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Average Response Time</p>
              <p className="text-2xl font-bold">{stats.averageResponseTime}h</p>
              <Progress value={60} className="h-2" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Inventory Efficiency</p>
              <p className="text-2xl font-bold">92%</p>
              <Progress value={92} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dialog Components
function SpareRequestDialog({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    partId: '',
    quantity: 1,
    urgency: 'MEDIUM',
    reason: '',
    notes: '',
    requiredBy: ''
  });
  const [availableParts, setAvailableParts] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableParts();
    }
  }, [open]);

  const fetchAvailableParts = async () => {
    try {
      const response = await fetch('/api/parts');
      const data = await response.json();
      setAvailableParts(data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      partId: '',
      quantity: 1,
      urgency: 'MEDIUM',
      reason: '',
      notes: '',
      requiredBy: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Spare Request</DialogTitle>
          <DialogDescription>Request spare parts from brands or distributors</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Part</Label>
            <Select value={formData.partId} onValueChange={(value) => setFormData({ ...formData, partId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a part" />
              </SelectTrigger>
              <SelectContent>
                {availableParts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.code} - {part.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Why do you need this part?"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
            />
          </div>
          <Button type="submit" className="w-full" disabled={!formData.partId}>
            <Plus className="h-4 w-4 mr-2" />
            Create Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InventoryUpdateDialog({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    partId: '',
    currentStock: '',
    minStockLevel: '',
    maxStockLevel: '',
    unitCost: '',
    location: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      partId: '',
      currentStock: '',
      minStockLevel: '',
      maxStockLevel: '',
      unitCost: '',
      location: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Inventory</DialogTitle>
          <DialogDescription>Add or update inventory levels for parts</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Part ID</Label>
            <Input
              value={formData.partId}
              onChange={(e) => setFormData({ ...formData, partId: e.target.value })}
              placeholder="Enter part ID"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Level</Label>
              <Input
                type="number"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Level</Label>
              <Input
                type="number"
                value={formData.maxStockLevel}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Storage location"
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            <Package className="h-4 w-4 mr-2" />
            Update Inventory
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShipmentReceiveDialog({ open, onOpenChange, onSubmit, shipments }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  shipments: ShipmentReceived[];
}) {
  const [selectedShipment, setSelectedShipment] = useState('');
  const [receivedParts, setReceivedParts] = useState<any[]>([]);
  const [status, setStatus] = useState('FULLY_RECEIVED');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: selectedShipment,
      receivedParts,
      status,
      receivedBy,
      discrepancyNotes: notes
    });
    setSelectedShipment('');
    setReceivedParts([]);
    setStatus('FULLY_RECEIVED');
    setReceivedBy('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Shipment</DialogTitle>
          <DialogDescription>Mark shipment as received and update inventory</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Shipment</Label>
            <Select value={selectedShipment} onValueChange={setSelectedShipment}>
              <SelectTrigger>
                <SelectValue placeholder="Choose pending shipment" />
              </SelectTrigger>
              <SelectContent>
                {shipments.map((shipment) => (
                  <SelectItem key={shipment.id} value={shipment.id}>
                    AWB: {shipment.awbNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULLY_RECEIVED">Fully Received</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                <SelectItem value="DISCREPANCY">Discrepancy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Received By</Label>
            <Input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Staff member name"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any discrepancies or notes..."
            />
          </div>
          <Button type="submit" className="w-full" disabled={!selectedShipment}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Receipt
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReverseRequestDialog({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    partId: '',
    reason: '',
    returnReason: '',
    quantity: 1
  });
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [costResponsibility, setCostResponsibility] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchAvailableParts();
    }
  }, [open]);

  // Update cost responsibility when return reason changes
  useEffect(() => {
    if (formData.returnReason) {
      const responsibility = determineReturnCostResponsibility(formData.returnReason);
      setCostResponsibility(responsibility);
    } else {
      setCostResponsibility('');
    }
  }, [formData.returnReason]);

  const fetchAvailableParts = async () => {
    try {
      const response = await fetch('/api/parts');
      const data = await response.json();
      setAvailableParts(data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  // Function to determine cost responsibility (same as API)
  const determineReturnCostResponsibility = (returnReason: string): string => {
    switch(returnReason) {
      case 'DEFECTIVE':
      case 'WRONG_PART':
      case 'QUALITY_ISSUE':
      case 'DAMAGED':
        return 'BRAND';
      case 'EXCESS_STOCK':
      case 'INVENTORY_CLEANUP':
        return 'SERVICE_CENTER';
      case 'CUSTOMER_RETURN':
        return 'CUSTOMER';
      default:
        return 'SERVICE_CENTER';
    }
  };

  const getCostResponsibilityColor = (responsibility: string) => {
    switch(responsibility) {
      case 'BRAND': return 'text-green-600 bg-green-50';
      case 'SERVICE_CENTER': return 'text-orange-600 bg-orange-50';
      case 'CUSTOMER': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      partId: '',
      reason: '',
      returnReason: '',
      quantity: 1
    });
    setCostResponsibility('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Return Request</DialogTitle>
          <DialogDescription>Request return pickup with automatic cost allocation</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Part</Label>
            <Select value={formData.partId} onValueChange={(value) => setFormData({ ...formData, partId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a part to return" />
              </SelectTrigger>
              <SelectContent>
                {availableParts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.code} - {part.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Return Reason <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.returnReason} 
              onValueChange={(value) => setFormData({ ...formData, returnReason: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select return reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFECTIVE">Defective Part (Brand Pays)</SelectItem>
                <SelectItem value="WRONG_PART">Wrong Part Received (Brand Pays)</SelectItem>
                <SelectItem value="DAMAGED">Damaged in Transit (Brand Pays)</SelectItem>
                <SelectItem value="QUALITY_ISSUE">Quality Issue (Brand Pays)</SelectItem>
                <SelectItem value="EXCESS_STOCK">Excess Inventory (Service Center Pays)</SelectItem>
                <SelectItem value="INVENTORY_CLEANUP">Inventory Cleanup (Service Center Pays)</SelectItem>
                <SelectItem value="CUSTOMER_RETURN">Customer Return (Customer Pays)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cost Responsibility Display */}
          {costResponsibility && (
            <div className={`p-3 rounded-lg border ${getCostResponsibilityColor(costResponsibility)}`}>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Courier Cost Responsibility:</span>
              </div>
              <p className="text-sm mt-1">
                <strong>{costResponsibility.replace('_', ' ')}</strong> will bear the courier cost for this return
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Describe the issue or reason for return..."
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!formData.partId || !formData.returnReason}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Create Return Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}