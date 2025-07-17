import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Package,
  Truck,
  Weight,
  DollarSign,
  Activity,
  Zap
} from 'lucide-react';

interface ShipmentInvestigation {
  shipment: {
    id: string;
    status: string;
    awbNumber?: string;
    totalWeight?: number;
    totalValue?: number;
    estimatedCost?: number;
    actualCost?: number;
    recipientType: string;
    createdAt: string;
    dtdcData?: any;
  };
  calculations: {
    expectedWeight: number;
    expectedValue: number;
    weightDifference?: number;
  };
  partDetails: Array<{
    partId: string;
    partCode: string;
    partName: string;
    unitWeight: number;
    unitPrice: number;
    quantity: number;
    totalWeight: number;
    totalValue: number;
  }>;
  boxAnalysis: {
    totalBoxes: number;
    boxIssues: Array<{
      boxId: string;
      boxNumber: string;
      issue: string;
      expectedWeight: number;
      currentWeight?: number;
    }>;
  };
  walletTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  trackingInfo?: any;
  issues: string[];
  recommendations: string[];
  recipient: {
    type: string;
    name?: string;
    address?: any;
  };
}

interface MonitoringSummary {
  totalShipments: number;
  problematicShipments: number;
  awbPendingCount: number;
  missingAwbCount: number;
  zeroWeightCount: number;
  recentFailures: number;
  healthScore: number;
}

interface ShipmentAnalysis {
  shipment: {
    id: string;
    status: string;
    awbNumber?: string;
    totalWeight?: number;
    totalValue?: number;
    createdAt: string;
    brand: string;
    recipient?: string;
    boxCount: number;
  };
  calculations: {
    expectedWeight: number;
    expectedValue: number;
  };
  issues: string[];
  recommendations: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function ShipmentInvestigationDashboard() {
  const [activeTab, setActiveTab] = useState('investigate');
  const [shipmentId, setShipmentId] = useState('');
  const [investigation, setInvestigation] = useState<ShipmentInvestigation | null>(null);
  const [monitoring, setMonitoring] = useState<{
    summary: MonitoringSummary;
    analysis: ShipmentAnalysis[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load monitoring data on component mount
  useEffect(() => {
    if (activeTab === 'monitor') {
      loadMonitoringData();
    }
  }, [activeTab]);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/shipment-monitor');
      const data = await response.json();

      if (data.success) {
        setMonitoring(data);
      } else {
        setError(data.error || 'Failed to load monitoring data');
      }
    } catch (err) {
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const investigateShipment = async () => {
    if (!shipmentId.trim()) {
      setError('Please enter a shipment ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/debug/shipment-investigation?shipmentId=${shipmentId}`);
      const data = await response.json();

      if (data.success) {
        setInvestigation(data);
        setSuccess('Shipment investigation completed');
      } else {
        setError(data.error || 'Investigation failed');
      }
    } catch (err) {
      setError('Failed to investigate shipment');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, shipmentId?: string, data?: any) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/debug/shipment-investigation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          shipmentId: shipmentId || investigation?.shipment.id,
          data
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message || 'Action completed successfully');
        
        // Refresh investigation data
        if (investigation) {
          investigateShipment();
        }
      } else {
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      setError('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  const autoFixAll = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/shipment-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'auto_fix_all'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Auto-fix completed: ${result.summary.successful}/${result.summary.total} shipments fixed`);
        loadMonitoringData(); // Refresh monitoring data
      } else {
        setError(result.error || 'Auto-fix failed');
      }
    } catch (err) {
      setError('Failed to perform auto-fix');
    } finally {
      setLoading(false);
    }
  };

  const formatWeight = (weightInKg: number | null | undefined): string => {
    if (!weightInKg || weightInKg === 0) return '0g';
    if (weightInKg >= 1) return `${weightInKg.toFixed(2)}kg`;
    return `${Math.round(weightInKg * 1000)}g`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'default';
      case 'CONFIRMED': return 'default';
      case 'AWB_PENDING': return 'destructive';
      case 'PENDING': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shipment Investigation & Monitoring</h1>
          <p className="text-muted-foreground">
            Investigate shipment issues and monitor system health
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="investigate">Investigate Shipment</TabsTrigger>
          <TabsTrigger value="monitor">System Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="investigate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Shipment Investigation
              </CardTitle>
              <CardDescription>
                Enter a shipment ID to investigate issues and perform fixes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter shipment ID (e.g., h6kazbwx)"
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && investigateShipment()}
                />
                <Button onClick={investigateShipment} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Investigate
                </Button>
              </div>
            </CardContent>
          </Card>

          {investigation && (
            <div className="grid gap-6">
              {/* Shipment Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Shipment Overview</span>
                    <Badge variant={getStatusColor(investigation.shipment.status)}>
                      {investigation.shipment.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">AWB Number</p>
                      <p className="font-medium">{investigation.shipment.awbNumber || 'Not Generated'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{formatWeight(investigation.shipment.totalWeight)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Value</p>
                      <p className="font-medium">₹{investigation.shipment.totalValue?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recipient</p>
                      <p className="font-medium">{investigation.recipient.name || 'Unknown'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issues and Recommendations */}
              {(investigation.issues.length > 0 || investigation.recommendations.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Issues Found ({investigation.issues.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {investigation.issues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-600">
                        <CheckCircle className="h-5 w-5" />
                        Recommendations ({investigation.recommendations.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {investigation.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => performAction('fix_weight')}
                      disabled={loading}
                      variant="outline"
                    >
                      <Weight className="h-4 w-4 mr-2" />
                      Fix Weight
                    </Button>
                    <Button
                      onClick={() => performAction('retry_awb')}
                      disabled={loading}
                      variant="outline"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Retry AWB
                    </Button>
                    <Button
                      onClick={() => performAction('sync_tracking')}
                      disabled={loading}
                      variant="outline"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Sync Tracking
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Weight Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Weight Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Stored Weight</p>
                      <p className="font-medium">{formatWeight(investigation.shipment.totalWeight)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Calculated Weight</p>
                      <p className="font-medium">{formatWeight(investigation.calculations.expectedWeight)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Difference</p>
                      <p className="font-medium">
                        {investigation.calculations.weightDifference 
                          ? formatWeight(Math.abs(investigation.calculations.weightDifference))
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {investigation.boxAnalysis.boxIssues.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Box Issues</h4>
                      <div className="space-y-2">
                        {investigation.boxAnalysis.boxIssues.map((boxIssue, index) => (
                          <div key={index} className="p-2 bg-muted rounded text-sm">
                            <span className="font-medium">Box {boxIssue.boxNumber}:</span> {boxIssue.issue}
                            <span className="text-muted-foreground ml-2">
                              (Expected: {formatWeight(boxIssue.expectedWeight)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Part Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Part Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Part Code</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Unit Weight</th>
                          <th className="text-right p-2">Total Weight</th>
                          <th className="text-right p-2">Unit Price</th>
                          <th className="text-right p-2">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investigation.partDetails.map((part, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-medium">{part.partCode}</td>
                            <td className="p-2">{part.partName}</td>
                            <td className="p-2 text-right">{part.quantity}</td>
                            <td className="p-2 text-right">{formatWeight(part.unitWeight / 1000)}</td>
                            <td className="p-2 text-right">{formatWeight(part.totalWeight / 1000)}</td>
                            <td className="p-2 text-right">₹{part.unitPrice.toFixed(2)}</td>
                            <td className="p-2 text-right">₹{part.totalValue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          {monitoring && (
            <>
              {/* Health Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Health Score</p>
                        <p className="text-2xl font-bold">{monitoring.summary.healthScore.toFixed(1)}%</p>
                      </div>
                      <Activity className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Shipments</p>
                        <p className="text-2xl font-bold">{monitoring.summary.totalShipments}</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">AWB Pending</p>
                        <p className="text-2xl font-bold text-orange-600">{monitoring.summary.awbPendingCount}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Recent Failures</p>
                        <p className="text-2xl font-bold text-red-600">{monitoring.summary.recentFailures}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>System Actions</CardTitle>
                  <CardDescription>
                    Perform bulk operations to fix shipment issues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={autoFixAll} disabled={loading}>
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Auto-Fix All Issues
                    </Button>
                    <Button onClick={loadMonitoringData} variant="outline" disabled={loading}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Problematic Shipments */}
              <Card>
                <CardHeader>
                  <CardTitle>Problematic Shipments</CardTitle>
                  <CardDescription>
                    Shipments requiring attention ({monitoring.analysis.length})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monitoring.analysis.map((analysis, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{analysis.shipment.id}</span>
                            <Badge variant={getSeverityColor(analysis.severity)}>
                              {analysis.severity}
                            </Badge>
                            <Badge variant={getStatusColor(analysis.shipment.status)}>
                              {analysis.shipment.status}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShipmentId(analysis.shipment.id);
                              setActiveTab('investigate');
                            }}
                          >
                            Investigate
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Brand:</span> {analysis.shipment.brand}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Weight:</span> {formatWeight(analysis.shipment.totalWeight)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">AWB:</span> {analysis.shipment.awbNumber || 'Missing'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Boxes:</span> {analysis.shipment.boxCount}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-destructive">Issues:</p>
                          <ul className="text-sm text-muted-foreground">
                            {analysis.issues.map((issue, i) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}