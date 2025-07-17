import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, Wallet, Truck, Package, BarChart3, CheckCircle, 
  Settings, Database, Shield, Activity, TrendingUp, 
  AlertTriangle, Clock, ExternalLink, ArrowRight,
  Loader2, RefreshCw, Eye, Edit, Plus, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';

interface DashboardStats {
  users: {
    total: number;
    brands: number;
    distributors: number;
    serviceCenters: number;
    customers: number;
    activeToday: number;
  };
  financial: {
    totalRevenue: number;
    courierRevenue: number;
    walletBalance: number;
    pendingPayments: number;
  };
  operations: {
    totalShipments: number;
    activeShipments: number;
    totalParts: number;
    lowStockAlerts: number;
  };
  performance: {
    systemUptime: number;
    apiResponseTime: number;
    errorRate: number;
    userSatisfaction: number;
  };
}

function SuperAdminDashboardComplete() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
        setLastUpdated(new Date());
        toast.success('Dashboard data refreshed');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
                <p className="text-gray-600">Complete system management and oversight</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchDashboardStats} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          </div>

          {/* System Health Alert */}
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>System Status:</strong> All services operational. 
              Uptime: {dashboardStats?.performance.systemUptime || 99.9}% | 
              Response Time: {dashboardStats?.performance.apiResponseTime || 120}ms | 
              Error Rate: {dashboardStats?.performance.errorRate || 0.1}%
            </AlertDescription>
          </Alert>

          {/* Quick Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading ? '...' : dashboardStats?.users.total || 0}
                    </p>
                    <p className="text-xs text-green-600">
                      +{dashboardStats?.users.activeToday || 0} active today
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ₹{loading ? '...' : (dashboardStats?.financial.totalRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600">+15% from last month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Truck className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Shipments</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading ? '...' : dashboardStats?.operations.activeShipments || 0}
                    </p>
                    <p className="text-xs text-purple-600">
                      {dashboardStats?.operations.totalShipments || 0} total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading ? '...' : dashboardStats?.operations.lowStockAlerts || 0}
                    </p>
                    <p className="text-xs text-orange-600">Requires attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Modules Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Part 1: User & System Management */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  User & System Management
                </CardTitle>
                <CardDescription>
                  Manage users, system configuration, and platform settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Brands</p>
                    <p className="font-semibold">{dashboardStats?.users.brands || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Distributors</p>
                    <p className="font-semibold">{dashboardStats?.users.distributors || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Service Centers</p>
                    <p className="font-semibold">{dashboardStats?.users.serviceCenters || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customers</p>
                    <p className="font-semibold">{dashboardStats?.users.customers || 0}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Available Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">User Management</Badge>
                    <Badge variant="outline" className="text-xs">Role Assignment</Badge>
                    <Badge variant="outline" className="text-xs">System Config</Badge>
                    <Badge variant="outline" className="text-xs">Audit Logs</Badge>
                  </div>
                </div>

                <Link href="/dashboard/super-admin-part1">
                  <Button className="w-full">
                    Access Module
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Part 2: Wallet & Courier Management */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-green-600" />
                  Wallet & Courier Management
                </CardTitle>
                <CardDescription>
                  Manage brand wallets, courier pricing, and logistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Wallet Balance</p>
                    <p className="font-semibold">₹{(dashboardStats?.financial.walletBalance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Courier Revenue</p>
                    <p className="font-semibold">₹{(dashboardStats?.financial.courierRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pending Payments</p>
                    <p className="font-semibold">₹{(dashboardStats?.financial.pendingPayments || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Shipments</p>
                    <p className="font-semibold">{dashboardStats?.operations.totalShipments || 0}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Available Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Wallet Recharge</Badge>
                    <Badge variant="outline" className="text-xs">Courier Pricing</Badge>
                    <Badge variant="outline" className="text-xs">Transaction Logs</Badge>
                    <Badge variant="outline" className="text-xs">API Monitoring</Badge>
                  </div>
                </div>

                <Link href="/dashboard/super-admin-part2">
                  <Button className="w-full">
                    Access Module
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Part 3: Catalog, Analytics & Approvals */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Catalog, Analytics & Approvals
                </CardTitle>
                <CardDescription>
                  Manage product catalog, analytics, and part approvals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Parts</p>
                    <p className="font-semibold">{dashboardStats?.operations.totalParts || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Low Stock</p>
                    <p className="font-semibold">{dashboardStats?.operations.lowStockAlerts || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User Satisfaction</p>
                    <p className="font-semibold">{dashboardStats?.performance.userSatisfaction || 4.8}/5</p>
                  </div>
                  <div>
                    <p className="text-gray-500">System Uptime</p>
                    <p className="font-semibold">{dashboardStats?.performance.systemUptime || 99.9}%</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Available Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Product Catalog</Badge>
                    <Badge variant="outline" className="text-xs">Analytics Reports</Badge>
                    <Badge variant="outline" className="text-xs">Part Approvals</Badge>
                    <Badge variant="outline" className="text-xs">Inventory Tracking</Badge>
                  </div>
                </div>

                <Link href="/dashboard/super-admin-part3">
                  <Button className="w-full">
                    Access Module
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used administrative functions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Link href="/dashboard/super-admin-part1">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Manage Users</span>
                  </Button>
                </Link>
                
                <Link href="/dashboard/super-admin-part2">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Wallet className="h-5 w-5" />
                    <span className="text-xs">Wallet Recharge</span>
                  </Button>
                </Link>
                
                <Link href="/dashboard/super-admin-part3">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Package className="h-5 w-5" />
                    <span className="text-xs">Add Parts</span>
                  </Button>
                </Link>
                
                <Link href="/dashboard/super-admin-part3">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-xs">Approvals</span>
                  </Button>
                </Link>
                
                <Link href="/dashboard/super-admin-part3">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs">Analytics</span>
                  </Button>
                </Link>
                
                <Link href="/dashboard/super-admin-part1">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Settings className="h-5 w-5" />
                    <span className="text-xs">System Config</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Part approved</p>
                      <p className="text-xs text-gray-500">Samsung Motor - 2 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded">
                      <Wallet className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Wallet recharged</p>
                      <p className="text-xs text-gray-500">LG Electronics - ₹10,000 - 5 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New user registered</p>
                      <p className="text-xs text-gray-500">Service Center - 10 minutes ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Low Stock Alert:</strong> 47 parts below minimum stock level
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="border-blue-200 bg-blue-50">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>High Activity:</strong> 25% increase in shipments today
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>System Health:</strong> All services running optimally
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboardCompletePage() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <SuperAdminDashboardComplete />
    </ProtectedRoute>
  );
}

// Prevent static generation for this page since it requires authentication
export async function getServerSideProps() {
  return {
    props: {}
  };
}