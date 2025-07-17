'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  Calculator,
  CreditCard
} from 'lucide-react';

interface DTDCDashboardProps {
  brandId: string;
}

interface WalletInfo {
  balance: number;
  totalSpent: number;
  lastRecharge: string | null;
}

interface CostEstimate {
  baseCost: number;
  weightCost: number;
  totalCost: number;
  currency: string;
}

interface TrackingData {
  boxId: string;
  boxNumber: number;
  awbNumber: string;
  status: string;
  currentTracking: {
    status: string;
    location: string;
    timestamp: string;
    description: string;
    isLive: boolean;
  } | null;
  trackingUrl: string;
  liveTrackingAvailable: boolean;
}

export default function DTDCDashboard({ brandId }: DTDCDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pincode Check State
  const [pincodeCheck, setPincodeCheck] = useState({
    origin: '400069',
    destination: '',
    result: null as any,
    loading: false
  });

  // Cost Estimate State
  const [costEstimate, setCostEstimate] = useState({
    weight: 1,
    pieces: 1,
    result: null as CostEstimate | null,
    affordability: null as any,
    loading: false
  });

  // Batch AWB State
  const [batchAWB, setBatchAWB] = useState({
    boxIds: '',
    results: null as any,
    loading: false
  });

  // Cancellation State
  const [cancellation, setCancellation] = useState({
    awbNumbers: '',
    reason: '',
    results: null as any,
    loading: false
  });

  // Load wallet info and tracking data
  useEffect(() => {
    loadWalletInfo();
    loadTrackingData();
  }, [brandId]);

  const loadWalletInfo = async () => {
    try {
      const response = await fetch(`/api/admin/wallet?brandId=${brandId}`);
      if (response.ok) {
        const data = await response.json();
        setWalletInfo(data.wallet);
      }
    } catch (error) {
      console.error('Error loading wallet info:', error);
    }
  };

  const loadTrackingData = async () => {
    try {
      const response = await fetch(`/api/tracking/get-tracking?userId=${brandId}&role=BRAND&liveTracking=true`);
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data.data);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  };

  const checkPincodeServiceability = async () => {
    if (!pincodeCheck.destination) {
      setError('Please enter destination pincode');
      return;
    }

    setPincodeCheck(prev => ({ ...prev, loading: true }));
    setError(null);

    try {
      const response = await fetch('/api/dtdc/pincode-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgPincode: pincodeCheck.origin,
          desPincode: pincodeCheck.destination
        })
      });

      const data = await response.json();
      setPincodeCheck(prev => ({ ...prev, result: data }));
    } catch (error) {
      setError('Error checking pincode serviceability');
    } finally {
      setPincodeCheck(prev => ({ ...prev, loading: false }));
    }
  };

  const calculateCostEstimate = async () => {
    setCostEstimate(prev => ({ ...prev, loading: true }));
    setError(null);

    try {
      const response = await fetch('/api/dtdc/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          weight: costEstimate.weight,
          pieces: costEstimate.pieces,
          checkAffordability: true
        })
      });

      const data = await response.json();
      setCostEstimate(prev => ({ 
        ...prev, 
        result: data.costEstimate,
        affordability: data.affordability
      }));
    } catch (error) {
      setError('Error calculating cost estimate');
    } finally {
      setCostEstimate(prev => ({ ...prev, loading: false }));
    }
  };

  const generateBatchAWB = async () => {
    if (!batchAWB.boxIds.trim()) {
      setError('Please enter box IDs');
      return;
    }

    setBatchAWB(prev => ({ ...prev, loading: true }));
    setError(null);

    try {
      const boxIds = batchAWB.boxIds.split(',').map(id => id.trim()).filter(id => id);
      
      const response = await fetch('/api/dtdc/batch-awb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxIds })
      });

      const data = await response.json();
      setBatchAWB(prev => ({ ...prev, results: data }));
      
      // Reload tracking data to show new AWBs
      loadTrackingData();
      loadWalletInfo();
    } catch (error) {
      setError('Error generating batch AWB');
    } finally {
      setBatchAWB(prev => ({ ...prev, loading: false }));
    }
  };

  const cancelShipments = async () => {
    if (!cancellation.awbNumbers.trim()) {
      setError('Please enter AWB numbers');
      return;
    }

    setCancellation(prev => ({ ...prev, loading: true }));
    setError(null);

    try {
      const awbNumbers = cancellation.awbNumbers.split(',').map(awb => awb.trim()).filter(awb => awb);
      
      const response = await fetch('/api/dtdc/cancel-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          awbNumbers,
          reason: cancellation.reason
        })
      });

      const data = await response.json();
      setCancellation(prev => ({ ...prev, results: data }));
      
      // Reload tracking data to show cancelled shipments
      loadTrackingData();
      loadWalletInfo();
    } catch (error) {
      setError('Error cancelling shipments');
    } finally {
      setCancellation(prev => ({ ...prev, loading: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED': return 'bg-green-500';
      case 'IN_TRANSIT': return 'bg-blue-500';
      case 'OUT_FOR_DELIVERY': return 'bg-orange-500';
      case 'PICKED_UP': return 'bg-purple-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Wallet Overview */}
      {walletInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Wallet Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ₹{walletInfo.balance.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Current Balance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ₹{walletInfo.totalSpent.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {walletInfo.lastRecharge 
                    ? new Date(walletInfo.lastRecharge).toLocaleDateString()
                    : 'Never'
                  }
                </div>
                <div className="text-sm text-gray-500">Last Recharge</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pincode">Pincode Check</TabsTrigger>
          <TabsTrigger value="estimate">Cost Estimate</TabsTrigger>
          <TabsTrigger value="batch">Batch AWB</TabsTrigger>
          <TabsTrigger value="cancel">Cancel Shipments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Recent Shipments
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadTrackingData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trackingData.slice(0, 10).map((item) => (
                  <div key={item.boxId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="font-medium">Box #{item.boxNumber}</div>
                        <div className="text-sm text-gray-500">{item.awbNumber}</div>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      {item.liveTrackingAvailable && (
                        <Badge variant="outline" className="text-green-600">
                          Live
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.currentTracking && (
                        <div className="text-right text-sm">
                          <div className="font-medium">{item.currentTracking.location}</div>
                          <div className="text-gray-500">
                            {new Date(item.currentTracking.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      {item.trackingUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={item.trackingUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {trackingData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No shipments found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pincode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pincode Serviceability Check
              </CardTitle>
              <CardDescription>
                Check if DTDC delivers to a specific pincode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin-pincode">Origin Pincode</Label>
                  <Input
                    id="origin-pincode"
                    value={pincodeCheck.origin}
                    onChange={(e) => setPincodeCheck(prev => ({ ...prev, origin: e.target.value }))}
                    placeholder="400069"
                  />
                </div>
                <div>
                  <Label htmlFor="destination-pincode">Destination Pincode</Label>
                  <Input
                    id="destination-pincode"
                    value={pincodeCheck.destination}
                    onChange={(e) => setPincodeCheck(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="110001"
                  />
                </div>
              </div>
              <Button 
                onClick={checkPincodeServiceability}
                disabled={pincodeCheck.loading}
                className="w-full"
              >
                {pincodeCheck.loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                Check Serviceability
              </Button>

              {pincodeCheck.result && (
                <Alert className={pincodeCheck.result.serviceable ? 'border-green-500' : 'border-red-500'}>
                  {pincodeCheck.result.serviceable ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>
                    {pincodeCheck.result.serviceable 
                      ? `Serviceable! Estimated delivery: ${pincodeCheck.result.estimated_days || 3} days`
                      : 'Not serviceable to this pincode'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Shipping Cost Estimate
              </CardTitle>
              <CardDescription>
                Calculate shipping costs and check wallet affordability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={costEstimate.weight}
                    onChange={(e) => setCostEstimate(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="pieces">Number of Pieces</Label>
                  <Input
                    id="pieces"
                    type="number"
                    min="1"
                    value={costEstimate.pieces}
                    onChange={(e) => setCostEstimate(prev => ({ ...prev, pieces: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <Button 
                onClick={calculateCostEstimate}
                disabled={costEstimate.loading}
                className="w-full"
              >
                {costEstimate.loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Calculate Cost
              </Button>

              {costEstimate.result && (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold">₹{costEstimate.result.baseCost}</div>
                          <div className="text-sm text-gray-500">Base Cost</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold">₹{costEstimate.result.weightCost}</div>
                          <div className="text-sm text-gray-500">Weight Charges</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">₹{costEstimate.result.totalCost}</div>
                          <div className="text-sm text-gray-500">Total Cost</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {costEstimate.affordability && (
                    <Alert className={costEstimate.affordability.canAfford ? 'border-green-500' : 'border-red-500'}>
                      {costEstimate.affordability.canAfford ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <AlertDescription>
                        {costEstimate.affordability.canAfford 
                          ? `You can afford this shipment. Current balance: ₹${costEstimate.affordability.currentBalance}`
                          : `Insufficient balance. Need ₹${costEstimate.affordability.shortfall} more.`
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Batch AWB Generation
              </CardTitle>
              <CardDescription>
                Generate AWB numbers for multiple boxes at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="box-ids">Box IDs (comma-separated)</Label>
                <Input
                  id="box-ids"
                  value={batchAWB.boxIds}
                  onChange={(e) => setBatchAWB(prev => ({ ...prev, boxIds: e.target.value }))}
                  placeholder="box-id-1, box-id-2, box-id-3"
                />
              </div>
              <Button 
                onClick={generateBatchAWB}
                disabled={batchAWB.loading}
                className="w-full"
              >
                {batchAWB.loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Truck className="h-4 w-4 mr-2" />
                )}
                Generate Batch AWB
              </Button>

              {batchAWB.results && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {batchAWB.results.message}
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold">{batchAWB.results.summary.total}</div>
                          <div className="text-sm text-gray-500">Total</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-green-600">{batchAWB.results.summary.successful}</div>
                          <div className="text-sm text-gray-500">Successful</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-red-600">{batchAWB.results.summary.failed}</div>
                          <div className="text-sm text-gray-500">Failed</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-blue-600">{batchAWB.results.summary.successRate}%</div>
                          <div className="text-sm text-gray-500">Success Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Cancel Shipments
              </CardTitle>
              <CardDescription>
                Cancel shipments and get automatic refunds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="awb-numbers">AWB Numbers (comma-separated)</Label>
                <Input
                  id="awb-numbers"
                  value={cancellation.awbNumbers}
                  onChange={(e) => setCancellation(prev => ({ ...prev, awbNumbers: e.target.value }))}
                  placeholder="AWB123, AWB456, AWB789"
                />
              </div>
              <div>
                <Label htmlFor="cancel-reason">Reason for Cancellation</Label>
                <Input
                  id="cancel-reason"
                  value={cancellation.reason}
                  onChange={(e) => setCancellation(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Customer request, wrong address, etc."
                />
              </div>
              <Button 
                onClick={cancelShipments}
                disabled={cancellation.loading}
                variant="destructive"
                className="w-full"
              >
                {cancellation.loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Cancel Shipments
              </Button>

              {cancellation.results && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {cancellation.results.message}
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold">{cancellation.results.summary.total}</div>
                          <div className="text-sm text-gray-500">Total</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-green-600">{cancellation.results.summary.cancelled}</div>
                          <div className="text-sm text-gray-500">Cancelled</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-red-600">{cancellation.results.summary.failed}</div>
                          <div className="text-sm text-gray-500">Failed</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}