import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, CreditCard, Truck, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, 
  RefreshCw, Search, Filter, Calendar, Download, Upload, AlertTriangle, 
  DollarSign, TrendingUp, Activity, Settings, Info, ExternalLink, 
  Copy, Archive, Star, Target, PieChart, LineChart, BarChart, Loader2,
  Clock, Bell, MapPin, Package, Users, Database, Shield, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Enhanced interfaces for wallet and courier management
interface BrandWallet {
  id: string;
  brandId: string;
  balance: number;
  totalSpent: number;
  lastRecharge: string | null;
  brand: {
    id: string;
    name: string;
    email: string;
  };
  transactions: WalletTransaction[];
  createdAt: string;
  updatedAt: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  refShipmentId: string | null;
  refOrderId: string | null;
  balanceAfter: number;
  createdAt: string;
  wallet?: {
    brand: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface CourierPricing {
  id: string;
  brandId: string;
  perBoxRate: number;
  isActive: boolean;
  brand: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CourierLog {
  id: string;
  awbNumber: string;
  status: string;
  origin: string;
  destination: string;
  weight: number;
  cost: number;
  timestamp: string;
  errorMessage?: string;
  retryCount: number;
  brand: {
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface WalletStats {
  totalWallets: number;
  totalBalance: number;
  totalSpent: number;
  activeWallets: number;
  lowBalanceWallets: number;
  recentTransactions: number;
}

interface CourierStats {
  totalApiCalls: number;
  successfulCalls: number;
  failedCalls: number;
  retryCount: number;
  averageResponseTime: number;
  totalCost: number;
}

function SuperAdminDashboardPart2() {
  // State management
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Wallet management states
  const [wallets, setWallets] = useState<BrandWallet[]>([]);
  const [walletLogs, setWalletLogs] = useState<WalletTransaction[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [walletLogsLoading, setWalletLogsLoading] = useState(false);
  const [walletActionLoading, setWalletActionLoading] = useState<string | null>(null);
  
  // Courier management states
  const [courierPricing, setCourierPricing] = useState<CourierPricing[]>([]);
  const [courierLogs, setCourierLogs] = useState<CourierLog[]>([]);
  const [courierStats, setCourierStats] = useState<CourierStats | null>(null);
  const [defaultCourierRate, setDefaultCourierRate] = useState<number>(50);
  const [courierLoading, setCourierLoading] = useState(false);
  const [courierLogsLoading, setCourierLogsLoading] = useState(false);
  const [courierActionLoading, setCourierActionLoading] = useState<string | null>(null);
  
  // Form states
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedBrandForRecharge, setSelectedBrandForRecharge] = useState('');
  const [selectedBrandForPricing, setSelectedBrandForPricing] = useState('');
  const [newCourierRate, setNewCourierRate] = useState('');
  const [newDefaultRate, setNewDefaultRate] = useState('');
  
  // Filter and search states
  const [walletSearchTerm, setWalletSearchTerm] = useState('');
  const [walletFilterStatus, setWalletFilterStatus] = useState('ALL');
  const [courierSearchTerm, setCourierSearchTerm] = useState('');
  const [courierFilterStatus, setCourierFilterStatus] = useState('ALL');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState('ALL');
  
  // Users for dropdowns
  const [users, setUsers] = useState<User[]>([]);

  // Initialize component
  useEffect(() => {
    setMounted(true);
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchWallets(),
        fetchCourierPricing(),
        fetchCourierLogs()
      ]);
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for dropdowns
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  // Wallet Management Functions
  const fetchWallets = async () => {
    setWalletsLoading(true);
    try {
      const response = await fetch('/api/admin/wallet');
      if (!response.ok) throw new Error('Failed to fetch wallets');
      const data = await response.json();
      
      setWallets(data.wallets || []);
      
      // Calculate wallet statistics
      const stats: WalletStats = {
        totalWallets: data.wallets?.length || 0,
        totalBalance: data.wallets?.reduce((sum: number, w: BrandWallet) => sum + w.balance, 0) || 0,
        totalSpent: data.wallets?.reduce((sum: number, w: BrandWallet) => sum + w.totalSpent, 0) || 0,
        activeWallets: data.wallets?.filter((w: BrandWallet) => w.balance > 0).length || 0,
        lowBalanceWallets: data.wallets?.filter((w: BrandWallet) => w.balance < 1000).length || 0,
        recentTransactions: data.wallets?.reduce((sum: number, w: BrandWallet) => sum + (w.transactions?.length || 0), 0) || 0
      };
      setWalletStats(stats);
      
      toast.success('Wallets loaded successfully');
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toast.error('Failed to fetch wallets');
    } finally {
      setWalletsLoading(false);
    }
  };

  const fetchWalletLogs = async () => {
    setWalletLogsLoading(true);
    try {
      const response = await fetch('/api/admin/wallet-logs');
      if (!response.ok) throw new Error('Failed to fetch wallet logs');
      const data = await response.json();
      setWalletLogs(data.transactions || []);
      toast.success('Wallet logs loaded successfully');
    } catch (error) {
      console.error('Error fetching wallet logs:', error);
      toast.error('Failed to fetch wallet logs');
    } finally {
      setWalletLogsLoading(false);
    }
  };

  const handleWalletRecharge = async () => {
    if (!selectedBrandForRecharge || !rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      toast.error('Please select a brand and enter a valid amount');
      return;
    }

    const brand = users.find(u => u.id === selectedBrandForRecharge);
    if (!brand) {
      toast.error('Selected brand not found');
      return;
    }

    setWalletActionLoading(selectedBrandForRecharge);
    try {
      const response = await fetch('/api/admin/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recharge',
          brandId: selectedBrandForRecharge,
          amount: parseFloat(rechargeAmount),
          description: `Admin recharge of ₹${rechargeAmount} for ${brand.name}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recharge wallet');
      }

      const result = await response.json();
      
      // Update local state
      setWallets(prev => prev.map(w => 
        w.brandId === selectedBrandForRecharge ? result.wallet : w
      ));
      
      // Reset form
      setRechargeAmount('');
      setSelectedBrandForRecharge('');
      
      toast.success(`Wallet recharged successfully! New balance: ₹${result.wallet.balance.toLocaleString()}`);
      
      // Refresh data
      fetchWallets();
      fetchWalletLogs();
    } catch (error: any) {
      console.error('Error recharging wallet:', error);
      toast.error(error.message || 'Failed to recharge wallet');
    } finally {
      setWalletActionLoading(null);
    }
  };

  // Courier Management Functions
  const fetchCourierPricing = async () => {
    setCourierLoading(true);
    try {
      const response = await fetch('/api/admin/courier-pricing');
      if (!response.ok) throw new Error('Failed to fetch courier pricing');
      const data = await response.json();
      
      setCourierPricing(data.courierPricing || []);
      setDefaultCourierRate(data.defaultRate || 50);
      
      toast.success('Courier pricing loaded successfully');
    } catch (error) {
      console.error('Error fetching courier pricing:', error);
      toast.error('Failed to fetch courier pricing');
    } finally {
      setCourierLoading(false);
    }
  };

  const fetchCourierLogs = async () => {
    setCourierLogsLoading(true);
    try {
      const response = await fetch('/api/admin/courier-logs');
      if (!response.ok) throw new Error('Failed to fetch courier logs');
      const data = await response.json();
      
      setCourierLogs(data.logs || []);
      
      // Calculate courier statistics
      const logs = data.logs || [];
      const stats: CourierStats = {
        totalApiCalls: logs.length,
        successfulCalls: logs.filter((l: CourierLog) => l.status === 'SUCCESS').length,
        failedCalls: logs.filter((l: CourierLog) => l.status === 'FAILED').length,
        retryCount: logs.reduce((sum: number, l: CourierLog) => sum + l.retryCount, 0),
        averageResponseTime: 120, // Mock data
        totalCost: logs.reduce((sum: number, l: CourierLog) => sum + l.cost, 0)
      };
      setCourierStats(stats);
      
      toast.success('Courier logs loaded successfully');
    } catch (error) {
      console.error('Error fetching courier logs:', error);
      toast.error('Failed to fetch courier logs');
    } finally {
      setCourierLogsLoading(false);
    }
  };

  const handleCourierPricingUpdate = async (brandId: string, perBoxRate: number) => {
    const brand = users.find(u => u.id === brandId);
    if (!brand) {
      toast.error('Brand not found');
      return;
    }

    setCourierActionLoading(brandId);
    try {
      const response = await fetch('/api/admin/courier-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setPricing',
          brandId,
          perBoxRate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update courier pricing');
      }

      const result = await response.json();
      
      // Update local state
      setCourierPricing(prev => {
        const existing = prev.find(p => p.brandId === brandId);
        if (existing) {
          return prev.map(p => p.brandId === brandId ? result.pricing : p);
        } else {
          return [...prev, result.pricing];
        }
      });
      
      toast.success(`Courier pricing updated for ${brand.name}: ₹${perBoxRate}/box`);
    } catch (error: any) {
      console.error('Error updating courier pricing:', error);
      toast.error(error.message || 'Failed to update courier pricing');
    } finally {
      setCourierActionLoading(null);
    }
  };

  const handleDefaultRateUpdate = async () => {
    if (!newDefaultRate || parseFloat(newDefaultRate) <= 0) {
      toast.error('Please enter a valid default rate');
      return;
    }

    setCourierActionLoading('default');
    try {
      const response = await fetch('/api/admin/courier-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setDefaultRate',
          perBoxRate: parseFloat(newDefaultRate)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update default rate');
      }

      const result = await response.json();
      setDefaultCourierRate(result.defaultRate);
      setNewDefaultRate('');
      
      toast.success(`Default courier rate updated to ₹${result.defaultRate}/box`);
    } catch (error: any) {
      console.error('Error updating default rate:', error);
      toast.error(error.message || 'Failed to update default rate');
    } finally {
      setCourierActionLoading(null);
    }
  };

  const handleCourierRetry = async (logId: string) => {
    setCourierActionLoading(logId);
    try {
      const response = await fetch('/api/admin/courier-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retry',
          logId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retry courier call');
      }

      toast.success('Courier API call retried successfully');
      fetchCourierLogs(); // Refresh logs
    } catch (error: any) {
      console.error('Error retrying courier call:', error);
      toast.error(error.message || 'Failed to retry courier call');
    } finally {
      setCourierActionLoading(null);
    }
  };

  // Filter functions
  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.brand.name.toLowerCase().includes(walletSearchTerm.toLowerCase()) ||
                         wallet.brand.email.toLowerCase().includes(walletSearchTerm.toLowerCase());
    const matchesStatus = walletFilterStatus === 'ALL' || 
                         (walletFilterStatus === 'HIGH_BALANCE' && wallet.balance >= 5000) ||
                         (walletFilterStatus === 'LOW_BALANCE' && wallet.balance < 1000) ||
                         (walletFilterStatus === 'ZERO_BALANCE' && wallet.balance === 0);
    
    return matchesSearch && matchesStatus;
  });

  const filteredCourierPricing = courierPricing.filter(pricing => {
    const matchesSearch = pricing.brand.name.toLowerCase().includes(courierSearchTerm.toLowerCase()) ||
                         pricing.brand.email.toLowerCase().includes(courierSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredCourierLogs = courierLogs.filter(log => {
    const matchesSearch = log.awbNumber.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
                         log.brand.name.toLowerCase().includes(logSearchTerm.toLowerCase());
    const matchesStatus = logFilterStatus === 'ALL' || log.status === logFilterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const brandUsers = users.filter(u => u.role === 'BRAND');

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Wallet & Courier Management...</p>
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
            <p className="text-gray-600">Part 2: Wallet & Courier Management</p>
          </div>

          <Tabs defaultValue="wallet" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wallet" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet Management
              </TabsTrigger>
              <TabsTrigger value="courier" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Courier Management
              </TabsTrigger>
            </TabsList>

            {/* Wallet Management Tab */}
            <TabsContent value="wallet" className="space-y-6">
              {/* Wallet Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Wallet className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Wallets</p>
                        <p className="text-2xl font-bold">
                          {walletsLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            walletStats?.totalWallets || 0
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Balance</p>
                        <p className="text-2xl font-bold">
                          ₹{walletsLoading ? '...' : (walletStats?.totalBalance || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Spent</p>
                        <p className="text-2xl font-bold">
                          ₹{walletsLoading ? '...' : (walletStats?.totalSpent || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Wallets</p>
                        <p className="text-2xl font-bold">
                          {walletsLoading ? '...' : walletStats?.activeWallets || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Low Balance</p>
                        <p className="text-2xl font-bold">
                          {walletsLoading ? '...' : walletStats?.lowBalanceWallets || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold">
                          {walletsLoading ? '...' : walletStats?.recentTransactions || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Wallet Recharge Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-green-500" />
                    Wallet Recharge
                  </CardTitle>
                  <CardDescription>Add funds to brand wallets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Select Brand</Label>
                      <Select value={selectedBrandForRecharge} onValueChange={setSelectedBrandForRecharge}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brandUsers.map(brand => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        min="1"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Button 
                        onClick={handleWalletRecharge} 
                        disabled={!selectedBrandForRecharge || !rechargeAmount || walletActionLoading === selectedBrandForRecharge}
                        className="w-full"
                      >
                        {walletActionLoading === selectedBrandForRecharge ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Recharge Wallet
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Button 
                        variant="outline"
                        onClick={fetchWallets}
                        disabled={walletsLoading}
                        className="w-full"
                      >
                        {walletsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Management Table */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Brand Wallets
                      </CardTitle>
                      <CardDescription>Manage brand wallet balances and transactions</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={fetchWalletLogs} disabled={walletLogsLoading}>
                        {walletLogsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        View Logs
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search wallets by brand name or email..."
                          value={walletSearchTerm}
                          onChange={(e) => setWalletSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={walletFilterStatus} onValueChange={setWalletFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by balance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Wallets</SelectItem>
                        <SelectItem value="HIGH_BALANCE">High Balance (≥₹5,000)</SelectItem>
                        <SelectItem value="LOW_BALANCE">Low Balance (&lt;₹1,000)</SelectItem>
                        <SelectItem value="ZERO_BALANCE">Zero Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Results Summary */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Showing {filteredWallets.length} of {wallets.length} wallets
                    </p>
                  </div>

                  {/* Wallets Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand</TableHead>
                          <TableHead>Current Balance</TableHead>
                          <TableHead>Total Spent</TableHead>
                          <TableHead>Last Recharge</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {walletsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500">Loading wallets...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredWallets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {walletSearchTerm || walletFilterStatus !== 'ALL' 
                                  ? 'No wallets match your filters' 
                                  : 'No wallets found'
                                }
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredWallets.map((wallet) => (
                            <TableRow key={wallet.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div>
                                  <p className="font-medium">{wallet.brand.name}</p>
                                  <p className="text-sm text-gray-500">{wallet.brand.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    wallet.balance >= 5000 ? 'default' : 
                                    wallet.balance >= 1000 ? 'secondary' : 
                                    wallet.balance > 0 ? 'outline' : 'destructive'
                                  }
                                  className="font-mono"
                                >
                                  ₹{wallet.balance.toLocaleString()}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono">
                                ₹{wallet.totalSpent.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {wallet.lastRecharge ? (
                                  <div>
                                    <p className="text-sm">{new Date(wallet.lastRecharge).toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-500">{new Date(wallet.lastRecharge).toLocaleTimeString()}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Never</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={wallet.balance > 0 ? 'default' : 'secondary'}>
                                  {wallet.balance > 0 ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" title="View Details">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Wallet Details - {wallet.brand.name}</DialogTitle>
                                      </DialogHeader>
                                      <WalletDetailsView wallet={wallet} />
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBrandForRecharge(wallet.brandId);
                                      setRechargeAmount('1000');
                                    }}
                                    title="Quick Recharge"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Courier Management Tab */}
            <TabsContent value="courier" className="space-y-6">
              {/* Courier Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                        <p className="text-2xl font-bold">
                          {courierLogsLoading ? '...' : courierStats?.totalApiCalls || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Successful</p>
                        <p className="text-2xl font-bold">
                          {courierLogsLoading ? '...' : courierStats?.successfulCalls || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Failed</p>
                        <p className="text-2xl font-bold">
                          {courierLogsLoading ? '...' : courierStats?.failedCalls || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <RefreshCw className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Retries</p>
                        <p className="text-2xl font-bold">
                          {courierLogsLoading ? '...' : courierStats?.retryCount || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Response</p>
                        <p className="text-2xl font-bold">
                          {courierLogsLoading ? '...' : `${courierStats?.averageResponseTime || 0}ms`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Cost</p>
                        <p className="text-2xl font-bold">
                          ₹{courierLogsLoading ? '...' : (courierStats?.totalCost || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Default Rate Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-500" />
                    Default Courier Rate
                  </CardTitle>
                  <CardDescription>Set the default per-box rate for new brands</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Current Default Rate</Label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">₹{defaultCourierRate}/box</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>New Default Rate (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Enter new rate"
                        value={newDefaultRate}
                        onChange={(e) => setNewDefaultRate(e.target.value)}
                        min="1"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Button 
                        onClick={handleDefaultRateUpdate}
                        disabled={!newDefaultRate || courierActionLoading === 'default'}
                        className="w-full"
                      >
                        {courierActionLoading === 'default' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Update Default
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Courier Pricing Management */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Brand Courier Pricing
                      </CardTitle>
                      <CardDescription>Manage per-box courier rates for each brand</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={fetchCourierPricing} disabled={courierLoading}>
                        {courierLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search brands by name or email..."
                          value={courierSearchTerm}
                          onChange={(e) => setCourierSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Courier Pricing Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand</TableHead>
                          <TableHead>Rate per Box</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courierLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500">Loading courier pricing...</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {/* Existing pricing */}
                            {filteredCourierPricing.map((pricing) => (
                              <TableRow key={pricing.id} className="hover:bg-gray-50">
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{pricing.brand.name}</p>
                                    <p className="text-sm text-gray-500">{pricing.brand.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono">
                                    ₹{pricing.perBoxRate}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={pricing.isActive ? 'default' : 'secondary'}>
                                    {pricing.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(pricing.updatedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" title="Edit Rate">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Update Courier Rate - {pricing.brand.name}</DialogTitle>
                                        </DialogHeader>
                                        <CourierPricingForm 
                                          pricing={pricing}
                                          onSubmit={handleCourierPricingUpdate}
                                          loading={courierActionLoading === pricing.brandId}
                                        />
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            
                            {/* Brands without pricing */}
                            {brandUsers
                              .filter(brand => !courierPricing.find(p => p.brandId === brand.id))
                              .filter(brand => 
                                brand.name.toLowerCase().includes(courierSearchTerm.toLowerCase()) ||
                                brand.email.toLowerCase().includes(courierSearchTerm.toLowerCase())
                              )
                              .map((brand) => (
                                <TableRow key={brand.id} className="hover:bg-gray-50">
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{brand.name}</p>
                                      <p className="text-sm text-gray-500">{brand.email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                      Default (₹{defaultCourierRate})
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">Not Set</Badge>
                                  </TableCell>
                                  <TableCell>-</TableCell>
                                  <TableCell>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" title="Set Custom Rate">
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Set Courier Rate - {brand.name}</DialogTitle>
                                        </DialogHeader>
                                        <CourierPricingForm 
                                          pricing={null}
                                          brandId={brand.id}
                                          brandName={brand.name}
                                          defaultRate={defaultCourierRate}
                                          onSubmit={handleCourierPricingUpdate}
                                          loading={courierActionLoading === brand.id}
                                        />
                                      </DialogContent>
                                    </Dialog>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Courier Logs */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        DTDC Integration Logs
                      </CardTitle>
                      <CardDescription>Monitor courier API calls and troubleshoot issues</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={fetchCourierLogs} disabled={courierLogsLoading}>
                        {courierLogsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Logs
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search by AWB number or brand..."
                          value={logSearchTerm}
                          onChange={(e) => setLogSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={logFilterStatus} onValueChange={setLogFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="RETRY">Retry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Courier Logs Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>AWB Number</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Retries</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courierLogsLoading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500">Loading courier logs...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredCourierLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {logSearchTerm || logFilterStatus !== 'ALL' 
                                  ? 'No logs match your filters' 
                                  : 'No courier logs found'
                                }
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCourierLogs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm">{log.awbNumber}</TableCell>
                              <TableCell>{log.brand.name}</TableCell>
                              <TableCell>
                                <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}>
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{log.origin} → {log.destination}</p>
                                </div>
                              </TableCell>
                              <TableCell>{log.weight} kg</TableCell>
                              <TableCell className="font-mono">₹{log.cost}</TableCell>
                              <TableCell>
                                {log.retryCount > 0 && (
                                  <Badge variant="outline">{log.retryCount}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" title="View Details">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Courier Log Details</DialogTitle>
                                      </DialogHeader>
                                      <CourierLogDetailsView log={log} />
                                    </DialogContent>
                                  </Dialog>
                                  
                                  {log.status === 'FAILED' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleCourierRetry(log.id)}
                                      disabled={courierActionLoading === log.id}
                                      title="Retry API Call"
                                    >
                                      {courierActionLoading === log.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

// Wallet Details View Component
function WalletDetailsView({ wallet }: { wallet: BrandWallet }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-3xl font-bold text-green-600">₹{wallet.balance.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-3xl font-bold text-red-600">₹{wallet.totalSpent.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-500">Brand Name</Label>
          <p className="text-sm text-gray-900">{wallet.brand.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Email</Label>
          <p className="text-sm text-gray-900">{wallet.brand.email}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Last Recharge</Label>
          <p className="text-sm text-gray-900">
            {wallet.lastRecharge ? new Date(wallet.lastRecharge).toLocaleString() : 'Never'}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Wallet Created</Label>
          <p className="text-sm text-gray-900">{new Date(wallet.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <Label className="text-sm font-medium text-gray-500 mb-3 block">Recent Transactions</Label>
        <div className="max-h-64 overflow-y-auto border rounded-lg">
          {wallet.transactions && wallet.transactions.length > 0 ? (
            wallet.transactions.map((txn) => (
              <div key={txn.id} className="flex justify-between items-center p-3 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{txn.description}</p>
                  <p className="text-xs text-gray-500">{new Date(txn.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <Badge variant={txn.type === 'CREDIT' ? 'default' : 'destructive'}>
                    {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: ₹{txn.balanceAfter.toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Courier Pricing Form Component
function CourierPricingForm({ 
  pricing, 
  brandId, 
  brandName, 
  defaultRate, 
  onSubmit, 
  loading 
}: { 
  pricing: CourierPricing | null;
  brandId?: string;
  brandName?: string;
  defaultRate?: number;
  onSubmit: (brandId: string, rate: number) => void;
  loading: boolean;
}) {
  const [rate, setRate] = useState(pricing?.perBoxRate?.toString() || defaultRate?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rate && parseFloat(rate) > 0) {
      onSubmit(pricing?.brandId || brandId!, parseFloat(rate));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Brand</Label>
        <p className="text-sm text-gray-600">{pricing?.brand.name || brandName}</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="rate">Rate per Box (₹)</Label>
        <Input
          id="rate"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Enter rate per box"
          min="1"
          step="0.01"
          required
        />
        {defaultRate && !pricing && (
          <p className="text-xs text-gray-500">Current default rate: ₹{defaultRate}</p>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading || !rate} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {pricing ? 'Updating...' : 'Setting...'}
            </>
          ) : (
            <>
              <Settings className="h-4 w-4 mr-2" />
              {pricing ? 'Update Rate' : 'Set Rate'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Courier Log Details View Component
function CourierLogDetailsView({ log }: { log: CourierLog }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-500">AWB Number</Label>
          <p className="text-sm font-mono text-gray-900">{log.awbNumber}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Brand</Label>
          <p className="text-sm text-gray-900">{log.brand.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Status</Label>
          <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}>
            {log.status}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Retry Count</Label>
          <p className="text-sm text-gray-900">{log.retryCount}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Origin</Label>
          <p className="text-sm text-gray-900">{log.origin}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Destination</Label>
          <p className="text-sm text-gray-900">{log.destination}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Weight</Label>
          <p className="text-sm text-gray-900">{log.weight} kg</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-500">Cost</Label>
          <p className="text-sm text-gray-900">₹{log.cost}</p>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-gray-500">Timestamp</Label>
        <p className="text-sm text-gray-900">{new Date(log.timestamp).toLocaleString()}</p>
      </div>

      {log.errorMessage && (
        <div>
          <Label className="text-sm font-medium text-gray-500">Error Message</Label>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{log.errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminDashboardPart2Page() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <SuperAdminDashboardPart2 />
    </ProtectedRoute>
  );
}

// Prevent static generation for this page since it requires authentication
export async function getServerSideProps() {
  return {
    props: {}
  };
}