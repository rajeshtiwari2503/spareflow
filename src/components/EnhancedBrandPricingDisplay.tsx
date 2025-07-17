'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Calculator,
  Settings,
  History,
  Eye,
  DollarSign,
  Truck,
  Package,
  MapPin
} from 'lucide-react';

interface BrandPricingData {
  pricing: {
    id?: string;
    baseRate: number;
    weightMultiplier: number;
    platformMarkupPercentage: number;
    expressMultiplier: number;
    remoteAreaSurcharge: number;
    distanceMultiplier: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt: string;
    brandId?: string;
  };
  meta: {
    hasBrandSpecificPricing: boolean;
    usingDefaultPricing: boolean;
    source: string;
    pricingNote?: string;
    lastUpdated?: string;
    configuredByAdmin?: boolean;
  };
  rules: Array<{
    id: string;
    ruleName: string;
    baseRate: number;
    isActive: boolean;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    baseRate: number;
    weightMultiplier: number;
    distanceMultiplier: number;
    isActive: boolean;
    createdAt: string;
    isBrandSpecific: boolean;
    source: string;
  }>;
}

interface PricingCalculation {
  weight: number;
  pieces: number;
  pincode: string;
  serviceType: 'STANDARD' | 'EXPRESS';
  result?: {
    baseRate: number;
    weightCharges: number;
    serviceCharges: number;
    remoteAreaSurcharge: number;
    platformMarkup: number;
    finalTotal: number;
  };
}

const EnhancedBrandPricingDisplay: React.FC = () => {
  const [pricingData, setPricingData] = useState<BrandPricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculation, setCalculation] = useState<PricingCalculation>({
    weight: 1.0,
    pieces: 1,
    pincode: '110001',
    serviceType: 'STANDARD'
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/brand/courier-pricing');
      if (response.ok) {
        const data = await response.json();
        setPricingData(data);
      }
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async () => {
    if (!pricingData) return;

    try {
      const response = await fetch('/api/shipments/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipments: [{
            numBoxes: calculation.pieces,
            estimatedWeight: calculation.weight,
            priority: calculation.serviceType === 'EXPRESS' ? 'HIGH' : 'MEDIUM',
            recipientPincode: calculation.pincode,
            recipientType: 'SERVICE_CENTER',
            insurance: { type: 'NONE' }
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.estimates && data.estimates.length > 0) {
          const estimate = data.estimates[0];
          setCalculation(prev => ({
            ...prev,
            result: {
              baseRate: estimate.baseRate,
              weightCharges: estimate.weightCharges,
              serviceCharges: estimate.expressMultiplier,
              remoteAreaSurcharge: estimate.remoteAreaSurcharge,
              platformMarkup: estimate.platformMarkup,
              finalTotal: estimate.finalTotal
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
  };

  const getPricingSourceBadge = (source: string, configuredByAdmin?: boolean) => {
    switch (source) {
      case 'admin_configured':
        return <Badge variant="default" className="bg-blue-500">Admin Configured</Badge>;
      case 'system_default':
        return <Badge variant="secondary">System Default</Badge>;
      case 'fallback_default':
        return <Badge variant="destructive">Fallback</Badge>;
      case 'error_fallback':
        return <Badge variant="destructive">Error Fallback</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  if (!pricingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading pricing information...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Courier Pricing</h2>
          <p className="text-muted-foreground">
            Your shipping rates and pricing configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadPricingData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pricing Source Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Pricing Source:</strong> {pricingData.meta.pricingNote || 'Standard pricing applied'}
            </div>
            {getPricingSourceBadge(pricingData.meta.source, pricingData.meta.configuredByAdmin)}
          </div>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calculator">Rate Calculator</TabsTrigger>
          <TabsTrigger value="rules">Advanced Rules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Current Pricing Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Base Rate</p>
                    <p className="text-2xl font-bold">₹{pricingData.pricing.baseRate}</p>
                    <p className="text-xs text-muted-foreground">per box</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Weight Multiplier</p>
                    <p className="text-2xl font-bold">{pricingData.pricing.weightMultiplier}x</p>
                    <p className="text-xs text-muted-foreground">per kg</p>
                  </div>
                  <Truck className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Express Multiplier</p>
                    <p className="text-2xl font-bold">{pricingData.pricing.expressMultiplier}x</p>
                    <p className="text-xs text-muted-foreground">for express</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remote Surcharge</p>
                    <p className="text-2xl font-bold">₹{pricingData.pricing.remoteAreaSurcharge}</p>
                    <p className="text-xs text-muted-foreground">remote areas</p>
                  </div>
                  <MapPin className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Pricing Configuration Details
              </CardTitle>
              <CardDescription>
                Detailed breakdown of your current pricing structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Configuration Source</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getPricingSourceBadge(pricingData.meta.source, pricingData.meta.configuredByAdmin)}
                      {pricingData.meta.configuredByAdmin && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Admin Managed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {pricingData.pricing.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(pricingData.pricing.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Platform Markup</Label>
                    <p className="text-sm mt-1">{pricingData.pricing.platformMarkupPercentage}%</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Distance Multiplier</Label>
                    <p className="text-sm mt-1">{pricingData.pricing.distanceMultiplier}x</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Pricing Type</Label>
                    <p className="text-sm mt-1">
                      {pricingData.meta.hasBrandSpecificPricing ? 'Custom Brand Pricing' : 'Standard Pricing'}
                    </p>
                  </div>
                </div>
              </div>

              {pricingData.meta.source === 'system_default' && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You're using system default rates. Contact your administrator to set up custom pricing for your brand.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Shipping Cost Calculator
              </CardTitle>
              <CardDescription>
                Calculate shipping costs based on your current pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={calculation.weight}
                      onChange={(e) => setCalculation(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pieces">Number of Boxes</Label>
                    <Input
                      id="pieces"
                      type="number"
                      value={calculation.pieces}
                      onChange={(e) => setCalculation(prev => ({ ...prev, pieces: parseInt(e.target.value) || 1 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pincode">Destination Pincode</Label>
                    <Input
                      id="pincode"
                      value={calculation.pincode}
                      onChange={(e) => setCalculation(prev => ({ ...prev, pincode: e.target.value }))}
                      placeholder="110001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="serviceType">Service Type</Label>
                    <select
                      id="serviceType"
                      value={calculation.serviceType}
                      onChange={(e) => setCalculation(prev => ({ ...prev, serviceType: e.target.value as 'STANDARD' | 'EXPRESS' }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="EXPRESS">Express</option>
                    </select>
                  </div>

                  <Button onClick={calculatePricing} className="w-full">
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Cost
                  </Button>
                </div>

                <div className="space-y-4">
                  {calculation.result ? (
                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Cost Breakdown</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Rate ({calculation.pieces} boxes)</span>
                          <span>₹{calculation.result.baseRate.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Weight Charges ({calculation.weight}kg)</span>
                          <span>₹{calculation.result.weightCharges.toFixed(2)}</span>
                        </div>
                        
                        {calculation.result.serviceCharges > 0 && (
                          <div className="flex justify-between">
                            <span>Service Charges</span>
                            <span>₹{calculation.result.serviceCharges.toFixed(2)}</span>
                          </div>
                        )}
                        
                        {calculation.result.remoteAreaSurcharge > 0 && (
                          <div className="flex justify-between">
                            <span>Remote Area Surcharge</span>
                            <span>₹{calculation.result.remoteAreaSurcharge.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span>Platform Markup</span>
                          <span>₹{calculation.result.platformMarkup.toFixed(2)}</span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total Cost</span>
                          <span>₹{calculation.result.finalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 text-center text-muted-foreground">
                      <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Click "Calculate Cost" to see pricing breakdown</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Pricing Rules
              </CardTitle>
              <CardDescription>
                Special pricing rules configured for your brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pricingData.rules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Advanced Rules</h3>
                  <p className="text-muted-foreground">
                    No special pricing rules are currently configured for your brand.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pricingData.rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{rule.ruleName}</h3>
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Base Rate:</span>
                          <span className="ml-2 font-medium">₹{rule.baseRate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="ml-2">{new Date(rule.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Pricing History
              </CardTitle>
              <CardDescription>
                Historical changes to your pricing configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pricingData.history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No History Available</h3>
                  <p className="text-muted-foreground">
                    No pricing history is available for your brand.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pricingData.history.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-muted pl-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{entry.source}</Badge>
                          <span className="text-sm font-medium">₹{entry.baseRate} per box</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                        <div>Weight: {entry.weightMultiplier}x</div>
                        <div>Distance: {entry.distanceMultiplier}x</div>
                        <div>Status: {entry.isActive ? 'Active' : 'Inactive'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedBrandPricingDisplay;