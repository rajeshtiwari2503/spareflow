// Admin Controls for Courier Transactions
// Comprehensive management of all courier-related transactions and overrides

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  IndianRupee, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  User,
  Package,
  Truck,
  CreditCard,
  Settings,
  BarChart3,
  TrendingUp,
  Clock,
  Shield,
  FileText,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface CourierTransaction {
  id: string;
  type: 'FORWARD' | 'REVERSE' | 'DISTRIBUTOR_SHIPPING';
  userId: string;
  userName: string;
  userRole: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  referenceId: string;
  referenceType: 'SHIPMENT' | 'RETURN' | 'PURCHASE_ORDER';
  awbNumber?: string;
  courierPartner: string;
  origin: string;
  destination: string;
  weight: number;
  costResponsibility: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
  adminOverride?: boolean;
  overrideReason?: string;
  overrideBy?: string;
}

interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  pendingAmount: number;
  completedAmount: number;
  refundedAmount: number;
  brandTransactions: number;
  serviceCenterTransactions: number;
  distributorTransactions: number;
}

interface AdminCourierTransactionManagerProps {
  adminId: string;
}

const AdminCourierTransactionManager: React.FC<AdminCourierTransactionManagerProps> = ({ adminId }) => {
  const [transactions, setTransactions] = useState<CourierTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<CourierTransaction | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  // Filter states
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<string>('30');
  const [searchTerm, setSearchTerm] = useState('');

  // Override form states
  const [overrideAmount, setOverrideAmount] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');

  // Load courier transactions
  const fetchCourierTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterRole !== 'ALL') params.append('role', filterRole);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterType !== 'ALL') params.append('type', filterType);
      params.append('days', dateRange);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/courier-transactions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching courier transactions:', error);
      toast.error('Failed to fetch courier transactions');
    } finally {
      setLoading(false);
    }
  };

  // Process admin override
  const processAdminOverride = async () => {
    if (!selectedTransaction || !overrideAmount || !overrideReason) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/courier-transactions/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
          newAmount: parseFloat(overrideAmount),
          reason: overrideReason,
          adminId
        })
      });

      if (!response.ok) throw new Error('Failed to process override');
      
      toast.success('Admin override processed successfully');
      setShowOverrideDialog(false);
      setOverrideAmount('');
      setOverrideReason('');
      fetchCourierTransactions();
    } catch (error) {
      console.error('Error processing override:', error);
      toast.error('Failed to process admin override');
    }
  };

  // Process refund
  const processRefund = async () => {
    if (!selectedTransaction || !refundReason) {
      toast.error('Please provide refund reason');
      return;
    }

    try {
      const response = await fetch('/api/admin/courier-transactions/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
          reason: refundReason,
          adminId
        })
      });

      if (!response.ok) throw new Error('Failed to process refund');
      
      toast.success('Refund processed successfully');
      setShowRefundDialog(false);
      setRefundReason('');
      fetchCourierTransactions();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    }
  };

  // Force create courier transaction (admin override)
  const forceCreateTransaction = async (transactionData: any) => {
    try {
      const response = await fetch('/api/admin/courier-transactions/force-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionData,
          adminId,
          forceCreate: true
        })
      });

      if (!response.ok) throw new Error('Failed to force create transaction');
      
      toast.success('Transaction created with admin override');
      fetchCourierTransactions();
    } catch (error) {
      console.error('Error force creating transaction:', error);
      toast.error('Failed to force create transaction');
    }
  };

  // Export transactions
  const exportTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'ALL') params.append('role', filterRole);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterType !== 'ALL') params.append('type', filterType);
      params.append('days', dateRange);
      params.append('format', 'csv');

      const response = await fetch(`/api/admin/courier-transactions/export?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export transactions');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courier-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Failed to export transactions');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'REFUNDED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'BRAND': return 'bg-purple-100 text-purple-800';
      case 'SERVICE_CENTER': return 'bg-orange-100 text-orange-800';
      case 'DISTRIBUTOR': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FORWARD': return 'bg-green-100 text-green-800';
      case 'REVERSE': return 'bg-red-100 text-red-800';
      case 'DISTRIBUTOR_SHIPPING': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchCourierTransactions();
  }, [filterRole, filterStatus, filterType, dateRange]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading courier transactions...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Courier Transaction Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor, manage, and override all courier-related transactions
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="controls">Admin Controls</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                        <p className="text-2xl font-bold">{summary?.totalTransactions || 0}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold">₹{summary?.totalAmount?.toLocaleString() || '0'}</p>
                      </div>
                      <IndianRupee className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Amount</p>
                        <p className="text-2xl font-bold text-yellow-600">₹{summary?.pendingAmount?.toLocaleString() || '0'}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Amount</p>
                        <p className="text-2xl font-bold text-green-600">₹{summary?.completedAmount?.toLocaleString() || '0'}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Role-wise Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Brand Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {summary?.brandTransactions || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Forward shipments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Service Center Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {summary?.serviceCenterTransactions || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Returns & distributor orders</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distributor Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {summary?.distributorTransactions || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Direct shipments</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">{transaction.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.type} • {transaction.courierPartner}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{transaction.amount.toLocaleString()}</p>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by user, AWB, or reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      <SelectItem value="BRAND">Brand</SelectItem>
                      <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                      <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="FORWARD">Forward</SelectItem>
                      <SelectItem value="REVERSE">Reverse</SelectItem>
                      <SelectItem value="DISTRIBUTOR_SHIPPING">Distributor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchCourierTransactions} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={exportTransactions} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Transactions Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{transaction.userName}</p>
                              <Badge className={getRoleColor(transaction.userRole)}>
                                {transaction.userRole}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(transaction.type)}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">₹{transaction.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.weight}kg • {transaction.courierPartner}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                            {transaction.adminOverride && (
                              <div className="flex items-center mt-1">
                                <Shield className="h-3 w-3 text-orange-500 mr-1" />
                                <span className="text-xs text-orange-600">Override</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono text-sm">{transaction.referenceId}</p>
                              {transaction.awbNumber && (
                                <p className="text-xs text-muted-foreground">{transaction.awbNumber}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{transaction.origin}</p>
                              <p className="text-muted-foreground">↓</p>
                              <p>{transaction.destination}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{new Date(transaction.createdAt).toLocaleDateString()}</p>
                              <p className="text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setShowTransactionDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {transaction.status === 'PENDING' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setShowOverrideDialog(true);
                                  }}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              )}
                              {transaction.status === 'COMPLETED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setShowRefundDialog(true);
                                  }}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <BarChart3 className="h-16 w-16 mb-4" />
                      <p>Transaction trends chart would be displayed here</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <TrendingUp className="h-16 w-16 mb-4" />
                      <p>Cost distribution chart would be displayed here</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Admin Controls Tab */}
            <TabsContent value="controls" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Force Create Transaction</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Create courier transaction with admin override
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      <Shield className="h-4 w-4 mr-2" />
                      Force Create Transaction
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Bulk Operations</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Process multiple transactions at once
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button className="w-full" variant="outline">
                        Bulk Approve
                      </Button>
                      <Button className="w-full" variant="outline">
                        Bulk Refund
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <Label>User</Label>
                  <p>{selectedTransaction.userName} ({selectedTransaction.userRole})</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge className={getTypeColor(selectedTransaction.type)}>
                    {selectedTransaction.type}
                  </Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedTransaction.status)}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="text-lg font-bold">₹{selectedTransaction.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Cost Responsibility</Label>
                  <p>{selectedTransaction.costResponsibility}</p>
                </div>
              </div>
              {selectedTransaction.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.notes}</p>
                </div>
              )}
              {selectedTransaction.adminOverride && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Admin Override Applied</strong><br />
                    Reason: {selectedTransaction.overrideReason}<br />
                    By: {selectedTransaction.overrideBy}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Override</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Override transaction amount and processing
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="overrideAmount">New Amount (₹)</Label>
              <Input
                id="overrideAmount"
                type="number"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder="Enter new amount"
              />
            </div>
            <div>
              <Label htmlFor="overrideReason">Override Reason</Label>
              <Textarea
                id="overrideReason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this override is necessary"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                Cancel
              </Button>
              <Button onClick={processAdminOverride}>
                Apply Override
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Refund transaction amount to user wallet
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refundReason">Refund Reason</Label>
              <Textarea
                id="refundReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Explain the reason for this refund"
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will refund ₹{selectedTransaction?.amount.toLocaleString()} to {selectedTransaction?.userName}'s wallet.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                Cancel
              </Button>
              <Button onClick={processRefund} variant="destructive">
                Process Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourierTransactionManager;