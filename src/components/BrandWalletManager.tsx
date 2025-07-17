import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus,
  DollarSign,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  History,
  Settings,
  Download,
  Eye,
  Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface WalletData {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastRecharge: string | null;
  currentBalance: number;
  totalCredit: number;
  totalDebit: number;
  createdAt: string;
  updatedAt: string;
  transactions: WalletTransaction[];
}

interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
  status: string;
  balanceAfter: number;
}

interface WalletLog {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
  status: string;
  balanceAfter: number;
}

interface CourierPricing {
  id: string;
  brandId: string;
  baseRate: number;
  weightMultiplier: number;
  distanceMultiplier: number;
  isActive: boolean;
  createdAt: string;
}

interface BrandWalletManagerProps {
  brandId: string;
}

const BrandWalletManager: React.FC<BrandWalletManagerProps> = ({ brandId }) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [walletLogs, setWalletLogs] = useState<WalletLog[]>([]);
  const [courierPricing, setCourierPricing] = useState<CourierPricing | null>(null);
  const [loading, setLoading] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');

  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
      // Get token from cookies for authentication
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/brand/wallet`, { headers });
      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
        // Set wallet logs from the wallet data transactions
        setWalletLogs(data.wallet.transactions || []);
      } else {
        console.error('Failed to fetch wallet data:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  // Fetch wallet logs (now integrated with wallet data)
  const fetchWalletLogs = async () => {
    // This is now handled in fetchWalletData since transactions are included
    // But we can still have this for backward compatibility or separate calls if needed
    if (walletData && walletData.transactions) {
      setWalletLogs(walletData.transactions);
    }
  };

  // Fetch courier pricing
  const fetchCourierPricing = async () => {
    try {
      // Get token from cookies for authentication
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/brand/courier-pricing`, { headers });
      if (response.ok) {
        const data = await response.json();
        setCourierPricing(data.pricing);
      } else {
        console.error('Failed to fetch courier pricing:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching courier pricing:', error);
    }
  };

  useEffect(() => {
    fetchWalletData();
    fetchWalletLogs();
    fetchCourierPricing();
  }, [brandId, selectedTimeRange]);

  // Recharge wallet
  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // Get token from cookies for authentication
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/brand/wallet', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(rechargeAmount),
          paymentMethod: 'manual',
          transactionId: `manual_${Date.now()}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRechargeAmount('');
        fetchWalletData();
        fetchWalletLogs();
        alert('Wallet recharged successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error recharging wallet:', error);
      alert('Failed to recharge wallet');
    }
    setLoading(false);
  };

  // Calculate statistics - use API data when available, fallback to calculated values
  const totalCredits = walletData?.totalCredit || walletLogs
    .filter(log => log.type === 'CREDIT')
    .reduce((sum, log) => sum + log.amount, 0);

  const totalDebits = walletData?.totalDebit || walletLogs
    .filter(log => log.type === 'DEBIT')
    .reduce((sum, log) => sum + log.amount, 0);

  const recentTransactions = walletLogs.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{walletData?.balance?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{totalCredits.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{totalDebits.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Recharge</p>
                <p className="text-sm font-medium">
                  {walletData?.lastRecharge 
                    ? new Date(walletData.lastRecharge).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recharge" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recharge" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Recharge Wallet
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transaction History
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Courier Pricing
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recharge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Recharge Wallet
              </CardTitle>
              <CardDescription>
                Add funds to your wallet for courier charges and other services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rechargeAmount">Recharge Amount (₹)</Label>
                    <Input
                      id="rechargeAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[500, 1000, 2000, 5000, 10000, 25000].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setRechargeAmount(amount.toString())}
                      >
                        ₹{amount}
                      </Button>
                    ))}
                  </div>

                  <Button 
                    onClick={handleRecharge} 
                    disabled={loading || !rechargeAmount}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Recharge Wallet
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">Current Balance</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      ₹{walletData?.balance?.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  {rechargeAmount && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-green-50 rounded-lg border border-green-200"
                    >
                      <h3 className="font-medium text-green-900 mb-2">After Recharge</h3>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{((walletData?.balance || 0) + parseFloat(rechargeAmount || '0')).toFixed(2)}
                      </p>
                    </motion.div>
                  )}

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Funds will be added instantly to your wallet</p>
                    <p>• Use wallet balance for courier charges</p>
                    <p>• All transactions are secure and encrypted</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>
                    View all wallet transactions and activity
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {walletLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {walletLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-gray-500">
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={log.type === 'CREDIT' ? 'default' : 'destructive'}
                              className="flex items-center gap-1 w-fit"
                            >
                              {log.type === 'CREDIT' ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownLeft className="w-3 h-3" />
                              )}
                              {log.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm font-medium">{log.description}</p>
                              {log.refShipmentId && (
                                <p className="text-xs text-gray-500">
                                  Shipment: {log.refShipmentId.slice(0, 8)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              log.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {log.type === 'CREDIT' ? '+' : '-'}₹{log.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              ₹{log.balanceAfter.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.refShipmentId && (
                              <Button variant="outline" size="sm">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-600">Your wallet transaction history will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Courier Pricing Configuration
              </CardTitle>
              <CardDescription>
                View and manage your courier pricing settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courierPricing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Base Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        ₹{courierPricing.baseRate.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Per shipment</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Weight Multiplier</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {courierPricing.weightMultiplier}x
                      </p>
                      <p className="text-xs text-gray-500">Per kg</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">Distance Multiplier</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {courierPricing.distanceMultiplier}x
                      </p>
                      <p className="text-xs text-gray-500">Per km</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={courierPricing.isActive ? 'default' : 'secondary'}>
                      {courierPricing.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Last updated: {new Date(courierPricing.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <Separator />

                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-yellow-900">Pricing Information</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your courier charges are calculated based on the base rate plus weight and distance multipliers. 
                          Contact support to modify these rates.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pricing configuration</h3>
                  <p className="text-gray-600">Contact support to set up your courier pricing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Spending Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Credits</span>
                    <span className="font-medium text-green-600">₹{totalCredits.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Debits</span>
                    <span className="font-medium text-red-600">₹{totalDebits.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Net Balance</span>
                    <span className="font-medium">₹{(totalCredits - totalDebits).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Transaction</span>
                    <span className="font-medium">
                      ₹{walletLogs.length > 0 ? (totalCredits + totalDebits) / walletLogs.length : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.type === 'CREDIT' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{log.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${
                        log.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.type === 'CREDIT' ? '+' : '-'}₹{log.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {recentTransactions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No recent transactions
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandWalletManager;