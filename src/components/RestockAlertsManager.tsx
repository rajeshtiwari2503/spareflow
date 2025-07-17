import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package, 
  TrendingUp, 
  ShoppingCart,
  Loader2,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface ForecastingAlert {
  id: string;
  partId: string;
  brandId: string;
  district: string;
  forecastedDemand: number;
  availableStock: number;
  recommendedQuantity: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  part: {
    id: string;
    code: string;
    name: string;
    description?: string;
    price: number;
    msl: number;
    brand: {
      id: string;
      name: string;
    };
  };
}

interface RestockAlertsManagerProps {
  brandId: string;
  userRole: 'BRAND' | 'DISTRIBUTOR';
}

export function RestockAlertsManager({ brandId, userRole }: RestockAlertsManagerProps) {
  const [alerts, setAlerts] = useState<ForecastingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchAlerts();
  }, [brandId, selectedStatus]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ brandId });
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus.toUpperCase());
      }

      const response = await fetch(`/api/ai-forecasting/restock-alerts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      } else {
        console.error('Failed to fetch restock alerts');
      }
    } catch (error) {
      console.error('Error fetching restock alerts:', error);
    }
    setLoading(false);
  };

  const handleAlertAction = async (alertId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [alertId]: true }));
    try {
      const response = await fetch('/api/ai-forecasting/restock-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          action,
          distributorId: 'dist-1' // Default distributor
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Alert ${action}d successfully:`, data.message);
        fetchAlerts(); // Refresh the list
      } else {
        const error = await response.json();
        console.error(`Error ${action}ing alert:`, error.error);
      }
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error);
    }
    setActionLoading(prev => ({ ...prev, [alertId]: false }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPriorityLevel = (alert: ForecastingAlert) => {
    const demandRatio = alert.forecastedDemand / alert.availableStock;
    if (demandRatio >= 2) return 'critical';
    if (demandRatio >= 1.5) return 'high';
    if (demandRatio >= 1.2) return 'medium';
    return 'low';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-600">High</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-yellow-600">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (selectedStatus === 'all') return true;
    return alert.status === selectedStatus.toUpperCase();
  });

  const summary = {
    total: alerts.length,
    pending: alerts.filter(a => a.status === 'PENDING').length,
    approved: alerts.filter(a => a.status === 'APPROVED').length,
    rejected: alerts.filter(a => a.status === 'REJECTED').length,
    critical: alerts.filter(a => getPriorityLevel(a) === 'critical').length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading restock alerts...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{summary.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{summary.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{summary.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold">{summary.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {summary.critical > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical Alert:</strong> {summary.critical} part{summary.critical > 1 ? 's' : ''} require immediate attention due to high demand projections.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {userRole === 'BRAND' ? 'Restock Alerts List' : 'Pending Purchase Orders'}
              </CardTitle>
              <CardDescription>
                {userRole === 'BRAND' 
                  ? 'Review AI-generated restock recommendations and approve purchase orders'
                  : 'View approved purchase orders that need fulfillment'
                }
              </CardDescription>
            </div>
            <Button onClick={fetchAlerts} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({summary.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({summary.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({summary.rejected})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus} className="space-y-4">
              {filteredAlerts.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Demand vs Stock</TableHead>
                        <TableHead>Recommended Qty</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        {userRole === 'BRAND' && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.map((alert) => {
                        const priority = getPriorityLevel(alert);
                        return (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{alert.part.code}</p>
                                <p className="text-sm text-gray-600">{alert.part.name}</p>
                                <p className="text-xs text-gray-500">MSL: {alert.part.msl} months</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{alert.district}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm">Demand: {alert.forecastedDemand}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm">Stock: {alert.availableStock}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Ratio: {(alert.forecastedDemand / alert.availableStock).toFixed(2)}x
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{alert.recommendedQuantity}</span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Est. Cost: ${(alert.recommendedQuantity * alert.part.price).toFixed(2)}
                              </p>
                            </TableCell>
                            <TableCell>
                              {getPriorityBadge(priority)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(alert.status)}
                                {getStatusBadge(alert.status)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(alert.createdAt).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            {userRole === 'BRAND' && (
                              <TableCell>
                                {alert.status === 'PENDING' ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={() => handleAlertAction(alert.id, 'approve')}
                                      disabled={actionLoading[alert.id]}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {actionLoading[alert.id] ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <ThumbsUp className="w-3 h-3" />
                                      )}
                                    </Button>
                                    <Button
                                      onClick={() => handleAlertAction(alert.id, 'reject')}
                                      disabled={actionLoading[alert.id]}
                                      size="sm"
                                      variant="outline"
                                    >
                                      {actionLoading[alert.id] ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <ThumbsDown className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {selectedStatus !== 'all' ? selectedStatus.toLowerCase() + ' ' : ''}alerts found
                  </h3>
                  <p className="text-gray-600">
                    {selectedStatus === 'pending' 
                      ? 'All restock alerts have been processed.'
                      : 'Run AI forecasting to generate restock recommendations.'
                    }
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}