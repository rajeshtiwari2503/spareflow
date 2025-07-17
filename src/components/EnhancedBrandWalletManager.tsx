import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Filter,
  Shield,
  Zap,
  Star,
  Lock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

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

interface RazorpayOrder {
  id: string;
  razorpayOrderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  status: string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

interface EnhancedBrandWalletManagerProps {
  brandId: string;
}

const EnhancedBrandWalletManager: React.FC<EnhancedBrandWalletManagerProps> = ({ brandId }) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const { toast } = useToast();

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpay = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          setRazorpayLoaded(true);
          resolve(true);
        };
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    if (!window.Razorpay) {
      loadRazorpay();
    } else {
      setRazorpayLoaded(true);
    }
  }, []);

  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
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
      } else {
        console.error('Failed to fetch wallet data:', response.status, await response.text());
        toast({
          title: "Error",
          description: "Failed to fetch wallet data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [brandId, selectedTimeRange]);

  // Create Razorpay order
  const createRazorpayOrder = async (amount: number): Promise<RazorpayOrder | null> => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch('/api/wallet/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment order');
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to create payment order",
        variant: "destructive"
      });
      return null;
    }
  };

  // Verify payment
  const verifyPayment = async (paymentData: any): Promise<boolean> => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch('/api/wallet/razorpay/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment verification failed');
      }

      const data = await response.json();
      
      toast({
        title: "Payment Successful",
        description: `₹${data.data.amount} has been added to your wallet`,
        variant: "default"
      });

      // Refresh wallet data
      await fetchWalletData();
      return true;
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Payment Verification Failed",
        description: error instanceof Error ? error.message : "Failed to verify payment",
        variant: "destructive"
      });
      return false;
    }
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(rechargeAmount);
    
    if (amount < 10 || amount > 100000) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be between ₹10 and ₹1,00,000",
        variant: "destructive"
      });
      return;
    }

    if (!razorpayLoaded) {
      toast({
        title: "Payment Gateway Loading",
        description: "Please wait for payment gateway to load",
        variant: "destructive"
      });
      return;
    }

    setPaymentProcessing(true);

    try {
      // Create Razorpay order
      const order = await createRazorpayOrder(amount);
      if (!order) {
        setPaymentProcessing(false);
        return;
      }

      // Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag',
        amount: order.amountInPaise,
        currency: order.currency,
        name: 'SpareFlow',
        description: `Wallet Recharge - ₹${amount}`,
        order_id: order.razorpayOrderId,
        prefill: {
          name: order.customerDetails.name,
          email: order.customerDetails.email,
          contact: order.customerDetails.phone
        },
        theme: {
          color: '#3B82F6'
        },
        handler: async function (response: any) {
          // Payment successful, verify on backend
          const verificationData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            order_id: order.id
          };

          const verified = await verifyPayment(verificationData);
          if (verified) {
            setRechargeAmount('');
            setShowPaymentDialog(false);
          }
          setPaymentProcessing(false);
        },
        modal: {
          ondismiss: function() {
            setPaymentProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by user",
              variant: "destructive"
            });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Error initiating payment:', error);
      setPaymentProcessing(false);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment",
        variant: "destructive"
      });
    }
  };

  // Quick recharge amounts
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000];

  // Calculate statistics
  const totalCredits = walletData?.totalCredit || 0;
  const totalDebits = walletData?.totalDebit || 0;
  const recentTransactions = walletData?.transactions?.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
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

        <Card className="border-l-4 border-l-blue-500">
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

        <Card className="border-l-4 border-l-red-500">
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

        <Card className="border-l-4 border-l-purple-500">
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recharge" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Recharge Wallet
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transaction History
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
                Recharge Wallet with Razorpay
              </CardTitle>
              <CardDescription>
                Add funds to your wallet securely using Razorpay payment gateway
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
                      min="10"
                      max="100000"
                      step="1"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      placeholder="Enter amount (₹10 - ₹1,00,000)"
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum: ₹10 | Maximum: ₹1,00,000
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Quick Select</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setRechargeAmount(amount.toString())}
                          className="text-sm"
                        >
                          ₹{amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleRazorpayPayment}
                    disabled={paymentProcessing || !rechargeAmount || !razorpayLoaded}
                    className="w-full"
                    size="lg"
                  >
                    {paymentProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : !razorpayLoaded ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Loading Payment Gateway...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Pay with Razorpay
                      </>
                    )}
                  </Button>

                  {/* Payment Security Info */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-900">Secure Payment</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Your payment is secured by Razorpay with 256-bit SSL encryption. 
                          We support UPI, Cards, Net Banking, and Wallets.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-2">Current Balance</h3>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{walletData?.balance?.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  {rechargeAmount && parseFloat(rechargeAmount) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <h3 className="font-medium text-blue-900 mb-2">After Recharge</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        ₹{((walletData?.balance || 0) + parseFloat(rechargeAmount || '0')).toFixed(2)}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        +₹{parseFloat(rechargeAmount).toFixed(2)} will be added
                      </p>
                    </motion.div>
                  )}

                  {/* Payment Methods */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Accepted Payment Methods</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Credit/Debit Cards
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        UPI (GPay, PhonePe)
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Net Banking
                      </div>
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Digital Wallets
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Funds will be added instantly to your wallet</p>
                    <p>• Use wallet balance for courier charges</p>
                    <p>• All transactions are secure and encrypted</p>
                    <p>• 24/7 customer support available</p>
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
                {recentTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-gray-500">
                                {new Date(transaction.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={transaction.type === 'CREDIT' ? 'default' : 'destructive'}
                              className="flex items-center gap-1 w-fit"
                            >
                              {transaction.type === 'CREDIT' ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownLeft className="w-3 h-3" />
                              )}
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm font-medium">{transaction.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'CREDIT' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              ₹{transaction.balanceAfter.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}>
                              {transaction.status}
                            </Badge>
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
                      ₹{recentTransactions.length > 0 ? 
                        ((totalCredits + totalDebits) / recentTransactions.length).toFixed(2) : 
                        '0.00'
                      }
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
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'CREDIT' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${
                        transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'CREDIT' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
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

export default EnhancedBrandWalletManager;