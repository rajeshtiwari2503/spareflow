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
import DIYSupportAgent from '@/components/DIYSupportAgent';
import RequestBrandAccess from '@/components/RequestBrandAccess';
import { AuthorizationGuard, AuthorizationStatusBanner } from '@/components/AuthorizationGuard';
import { useAuthorization } from '@/hooks/useAuthorization';

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

interface DashboardStats {
  totalInventoryValue: number;
  lowStockItems: number;
  pendingShipments: number;
  pendingRequests: number;
  monthlyConsumption: number;
  averageResponseTime: number;
}

export default function ServiceCenterDashboard() {
  const router = useRouter();
  
  // Authorization hook
  const { authStatus, loading: authLoading } = useAuthorization();
  
  // Profile management state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInventoryValue: 45250.75,
    lowStockItems: 8,
    pendingShipments: 3,
    pendingRequests: 5,
    monthlyConsumption: 12500.00,
    averageResponseTime: 2.5
  });

  // Profile management functions
  const fetchUserProfile = async () => {
    setIsProfileLoading(true);
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleUpdateProfile = async (formData: any) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`,
        },
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
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`,
        },
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`,
        },
      });
      
      // Clear local storage and cookies
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      localStorage.clear();
      
      // Redirect to login
      router.push('/auth/login');
      
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Force logout even if API call fails
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      localStorage.clear();
      router.push('/auth/login');
    }
  };

  useEffect(() => {
    fetchUserProfile();
    setLoading(false);
  }, []);

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
                      <Button variant="outline" className="h-20 flex-col">
                        <Plus className="h-6 w-6 mb-2" />
                        New Request
                      </Button>
                      <Button variant="outline" className="h-20 flex-col">
                        <CheckCircle className="h-6 w-6 mb-2" />
                        Receive Shipment
                      </Button>
                      <Button variant="outline" className="h-20 flex-col">
                        <Package className="h-6 w-6 mb-2" />
                        Update Stock
                      </Button>
                      <Button variant="outline" className="h-20 flex-col">
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

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <ProfileModule 
                userProfile={userProfile}
                isLoading={isProfileLoading}
                isEditing={isEditingProfile}
                onEdit={() => setIsEditingProfile(true)}
                onCancel={() => setIsEditingProfile(false)}
                onUpdate={handleUpdateProfile}
              />
            </TabsContent>

            {/* Other tabs */}
            <TabsContent value="spare-requests" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Spare Requests</CardTitle>
                  <CardDescription>Manage your spare part requests to brands and distributors</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Spare requests functionality will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="incoming-shipments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Incoming Shipments</CardTitle>
                  <CardDescription>Track and receive incoming shipments</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Incoming shipments functionality will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Management</CardTitle>
                  <CardDescription>Monitor and manage your spare parts inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Inventory management functionality will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="returns" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Return Management</CardTitle>
                  <CardDescription>Manage return requests with auto reverse pickup booking</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Return management functionality will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="request-access" className="space-y-6">
              <RequestBrandAccess userRole="SERVICE_CENTER" />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications & Alerts</CardTitle>
                  <CardDescription>Stay updated with shipment ETA, stock alerts, and return approvals</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Notifications functionality will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>Comprehensive insights into your service center operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Analytics functionality will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-support" className="space-y-6">
              <DIYSupportAgent
                userId="service-center-user-id"
                userRole="SERVICE_CENTER"
                onCreateReverseRequest={() => {}}
              />
            </TabsContent>
          </Tabs>

          {/* Change Password Dialog */}
          <ChangePasswordDialog 
            open={isChangePasswordOpen}
            onOpenChange={setIsChangePasswordOpen}
            onSubmit={handleChangePassword}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Profile Management Component
function ProfileModule({ userProfile, isLoading, isEditing, onEdit, onCancel, onUpdate }: {
  userProfile: UserProfile | null;
  isLoading: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    centerName: '',
    gstNumber: '',
    contactPerson: '',
    serviceTypes: [] as string[],
    addresses: [] as any[]
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        centerName: userProfile.serviceCenterProfile?.centerName || '',
        gstNumber: userProfile.serviceCenterProfile?.gstNumber || '',
        contactPerson: userProfile.serviceCenterProfile?.contactPerson || '',
        serviceTypes: userProfile.serviceCenterProfile?.serviceTypes || [],
        addresses: userProfile.serviceCenterProfile?.addresses || []
      });
    }
  }, [userProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userProfile?.serviceCenterProfile?.centerName ? `/api/avatar/${userProfile.id}` : undefined} />
                <AvatarFallback className="text-lg">
                  {userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SC'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{userProfile?.name}</CardTitle>
                <CardDescription className="text-lg">
                  {userProfile?.serviceCenterProfile?.centerName || 'Service Center'}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={userProfile?.serviceCenterProfile?.isVerified ? 'default' : 'secondary'}>
                    {userProfile?.serviceCenterProfile?.isVerified ? (
                      <>
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      'Unverified'
                    )}
                  </Badge>
                  <Badge variant="outline">{userProfile?.role}</Badge>
                </div>
              </div>
            </div>
            <Button onClick={onEdit} disabled={isEditing}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={onCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{userProfile?.name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-medium">{userProfile?.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{userProfile?.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Center Information */}
        <Card>
          <CardHeader>
            <CardTitle>Service Center Details</CardTitle>
            <CardDescription>Your service center information</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Center Name</Label>
                  <Input
                    value={formData.centerName}
                    onChange={(e) => setFormData({ ...formData, centerName: e.target.value })}
                    placeholder="Enter center name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    placeholder="Enter GST number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Enter contact person name"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Center Name</p>
                    <p className="font-medium">{userProfile?.serviceCenterProfile?.centerName || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">GST Number</p>
                    <p className="font-medium">{userProfile?.serviceCenterProfile?.gstNumber || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Person</p>
                    <p className="font-medium">{userProfile?.serviceCenterProfile?.contactPerson || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
          <CardDescription>Your service center addresses</CardDescription>
        </CardHeader>
        <CardContent>
          {userProfile?.serviceCenterProfile?.addresses?.length ? (
            <div className="space-y-4">
              {userProfile.serviceCenterProfile.addresses.map((address, index) => (
                <div key={address.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-4 w-4 text-gray-500 mt-1" />
                      <div>
                        <p className="font-medium">
                          {address.isDefault && <Badge variant="outline" className="mr-2">Default</Badge>}
                          Address {index + 1}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {address.street}, {address.area && `${address.area}, `}
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                        <p className="text-sm text-gray-500">{address.country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No addresses added yet</p>
              <Button variant="outline" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChangePasswordDialog({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<any>({});

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Update your account password for security</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="Enter your current password"
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-600">{errors.currentPassword}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Enter your new password"
            />
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm your new password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}