import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Download,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

interface InventoryItem {
  id: string;
  partId: string;
  onHandQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  lastRestocked: string | null;
  lastIssued: string | null;
  averageCost: number | null;
  lastCost: number | null;
  part: {
    id: string;
    code: string;
    name: string;
    partNumber: string | null;
    minStockLevel: number;
    maxStockLevel: number | null;
    category: string | null;
    price: number;
    weight: number | null;
  };
}

interface LedgerEntry {
  id: string;
  actionType: string;
  quantity: number;
  source: string;
  destination: string;
  referenceNote: string | null;
  createdAt: string;
  balanceAfter: number;
  unitCost: number | null;
  totalValue: number | null;
  part: {
    code: string;
    name: string;
    partNumber: string | null;
  };
  shipment?: {
    awbNumber: string | null;
    status: string;
  };
}

interface DashboardData {
  summary: {
    totalParts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
  inventory: InventoryItem[];
  recentMovements: LedgerEntry[];
  alerts: Array<{
    type: string;
    partId: string;
    partCode: string;
    partName: string;
    currentStock: number;
    minStockLevel: number;
    severity: string;
  }>;
}

const BrandInventoryDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddStock, setShowAddStock] = useState(false);
  const [showConsumeStock, setShowConsumeStock] = useState(false);
  const [selectedPart, setSelectedPart] = useState<InventoryItem | null>(null);

  // Form states
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('sku', searchTerm);
      if (filterType === 'lowStock') params.append('lowStock', 'true');

      const response = await fetch(`/api/brand/inventory/dashboard?${params}`);
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        console.error('Failed to fetch dashboard data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [searchTerm, filterType]);

  const handleInventoryAction = async (actionType: 'ADD' | 'CONSUMED') => {
    if (!selectedPart || !quantity) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/brand/inventory/ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partId: selectedPart.partId,
          actionType,
          quantity: parseInt(quantity),
          source: actionType === 'ADD' ? 'SYSTEM' : 'BRAND',
          destination: actionType === 'ADD' ? 'BRAND' : 'SYSTEM',
          referenceNote: notes || `Manual ${actionType.toLowerCase()} entry`,
          unitCost: unitCost ? parseFloat(unitCost) : null
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setQuantity('');
        setUnitCost('');
        setNotes('');
        setSelectedPart(null);
        setShowAddStock(false);
        setShowConsumeStock(false);
        
        // Refresh data
        fetchDashboardData();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Failed to update inventory');
    } finally {
      setActionLoading(false);
    }
  };

  const exportLedger = async () => {
    try {
      const response = await fetch('/api/brand/inventory/ledger?limit=1000');
      const result = await response.json();
      
      if (result.success) {
        // Convert to CSV
        const csvContent = [
          ['Date', 'Part Code', 'Part Name', 'Action', 'Quantity', 'Source', 'Destination', 'Balance After', 'Unit Cost', 'Total Value', 'Notes'].join(','),
          ...result.data.entries.map((entry: LedgerEntry) => [
            new Date(entry.createdAt).toLocaleDateString(),
            entry.part.code,
            entry.part.name,
            entry.actionType,
            entry.quantity,
            entry.source,
            entry.destination,
            entry.balanceAfter,
            entry.unitCost || '',
            entry.totalValue || '',
            entry.referenceNote || ''
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-ledger-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting ledger:', error);
    }
  };

  const getStockStatusBadge = (item: InventoryItem) => {
    if (item.onHandQuantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.onHandQuantity <= item.part.minStockLevel) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  const getActionTypeBadge = (actionType: string) => {
    const variants: Record<string, any> = {
      'ADD': 'default',
      'TRANSFER_OUT': 'secondary',
      'TRANSFER_IN': 'default',
      'REVERSE_IN': 'default',
      'REVERSE_OUT': 'secondary',
      'CONSUMED': 'destructive'
    };

    return <Badge variant={variants[actionType] || 'outline'}>{actionType}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load inventory data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Brand Inventory Control</h1>
          <p className="text-muted-foreground">Complete traceability of spare part movement</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportLedger} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Ledger
          </Button>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.totalParts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardData.summary.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dashboardData.summary.lowStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData.summary.outOfStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {dashboardData.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.alerts.map((alert, index) => (
                <Alert key={index} className={alert.severity === 'CRITICAL' ? 'border-red-500' : 'border-yellow-500'}>
                  <AlertDescription>
                    <strong>{alert.partCode}</strong> - {alert.partName}: 
                    {alert.type === 'OUT_OF_STOCK' ? ' Out of stock' : ` Low stock (${alert.currentStock} remaining, min: ${alert.minStockLevel})`}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="movements">Recent Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, part name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="lowStock">Low Stock Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Overview</CardTitle>
              <CardDescription>Current stock levels per SKU</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Code</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>On Hand</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Restocked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.part.code}</TableCell>
                      <TableCell>{item.part.name}</TableCell>
                      <TableCell>{item.part.category || 'N/A'}</TableCell>
                      <TableCell>{item.onHandQuantity}</TableCell>
                      <TableCell>{item.availableQuantity}</TableCell>
                      <TableCell>{item.part.minStockLevel}</TableCell>
                      <TableCell>{getStockStatusBadge(item)}</TableCell>
                      <TableCell>
                        {item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog open={showAddStock && selectedPart?.id === item.id} onOpenChange={(open) => {
                            setShowAddStock(open);
                            if (open) setSelectedPart(item);
                            else setSelectedPart(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Stock</DialogTitle>
                                <DialogDescription>
                                  Add inventory for {item.part.code} - {item.part.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Quantity</label>
                                  <Input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Enter quantity to add"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Unit Cost (Optional)</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={unitCost}
                                    onChange={(e) => setUnitCost(e.target.value)}
                                    placeholder="Enter unit cost"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Notes (Optional)</label>
                                  <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter notes"
                                  />
                                </div>
                                <Button 
                                  onClick={() => handleInventoryAction('ADD')}
                                  disabled={!quantity || actionLoading}
                                  className="w-full"
                                >
                                  {actionLoading ? 'Adding...' : 'Add Stock'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showConsumeStock && selectedPart?.id === item.id} onOpenChange={(open) => {
                            setShowConsumeStock(open);
                            if (open) setSelectedPart(item);
                            else setSelectedPart(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Minus className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Consume/Scrap Stock</DialogTitle>
                                <DialogDescription>
                                  Remove inventory for {item.part.code} - {item.part.name}
                                  <br />
                                  Available: {item.onHandQuantity} units
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Quantity</label>
                                  <Input
                                    type="number"
                                    max={item.onHandQuantity}
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Enter quantity to consume"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Reason</label>
                                  <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter reason for consumption/scrap"
                                  />
                                </div>
                                <Button 
                                  onClick={() => handleInventoryAction('CONSUMED')}
                                  disabled={!quantity || actionLoading}
                                  className="w-full"
                                  variant="destructive"
                                >
                                  {actionLoading ? 'Processing...' : 'Consume Stock'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inventory Movements</CardTitle>
              <CardDescription>Latest inventory transactions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Part Code</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{new Date(movement.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{movement.part.code}</TableCell>
                      <TableCell>{getActionTypeBadge(movement.actionType)}</TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>{movement.source}</TableCell>
                      <TableCell>{movement.destination}</TableCell>
                      <TableCell>{movement.balanceAfter}</TableCell>
                      <TableCell>{movement.referenceNote || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandInventoryDashboard;