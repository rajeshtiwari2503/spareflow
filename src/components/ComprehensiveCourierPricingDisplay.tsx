import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  ArrowRight, 
  ArrowLeft, 
  Calculator, 
  Truck, 
  MapPin,
  Weight,
  DollarSign,
  Clock,
  Shield,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface PricingData {
  forward: {
    baseRate: number;
    fuelSurcharge: number;
    handlingCharges: number;
    gst: number;
    insurance: number;
    total: number;
    deliveryTime: string;
    serviceType: string;
  };
  reverse: {
    baseRate: number;
    fuelSurcharge: number;
    handlingCharges: number;
    gst: number;
    insurance: number;
    total: number;
    deliveryTime: string;
    serviceType: string;
  };
}

interface CourierPricingProps {
  brandId?: string;
}

const ComprehensiveCourierPricingDisplay: React.FC<CourierPricingProps> = ({ brandId }) => {
  const [loading, setLoading] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form states for pricing calculation
  const [fromPincode, setFromPincode] = useState('');
  const [toPincode, setToPincode] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState({
    length: '',
    width: '',
    height: ''
  });
  const [declaredValue, setDeclaredValue] = useState('');

  const calculatePricing = async () => {
    if (!fromPincode || !toPincode || !weight) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate forward pricing
      const forwardResponse = await fetch('/api/shipments/cost-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPincode,
          toPincode,
          weight: parseFloat(weight),
          dimensions: {
            length: parseFloat(dimensions.length) || 10,
            width: parseFloat(dimensions.width) || 10,
            height: parseFloat(dimensions.height) || 10
          },
          declaredValue: parseFloat(declaredValue) || 1000,
          serviceType: 'SURFACE'
        }),
      });

      // Calculate reverse pricing (swap from and to)
      const reverseResponse = await fetch('/api/shipments/cost-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPincode: toPincode,
          toPincode: fromPincode,
          weight: parseFloat(weight),
          dimensions: {
            length: parseFloat(dimensions.length) || 10,
            width: parseFloat(dimensions.width) || 10,
            height: parseFloat(dimensions.height) || 10
          },
          declaredValue: parseFloat(declaredValue) || 1000,
          serviceType: 'SURFACE'
        }),
      });

      if (!forwardResponse.ok || !reverseResponse.ok) {
        throw new Error('Failed to calculate pricing');
      }

      const forwardData = await forwardResponse.json();
      const reverseData = await reverseResponse.json();

      setPricingData({
        forward: {
          baseRate: forwardData.costBreakdown?.baseRate || forwardData.estimatedCost * 0.7,
          fuelSurcharge: forwardData.costBreakdown?.fuelSurcharge || forwardData.estimatedCost * 0.1,
          handlingCharges: forwardData.costBreakdown?.handlingCharges || forwardData.estimatedCost * 0.05,
          gst: forwardData.costBreakdown?.gst || forwardData.estimatedCost * 0.18,
          insurance: forwardData.costBreakdown?.insurance || 0,
          total: forwardData.estimatedCost,
          deliveryTime: forwardData.deliveryTime || '3-5 days',
          serviceType: forwardData.serviceType || 'SURFACE'
        },
        reverse: {
          baseRate: reverseData.costBreakdown?.baseRate || reverseData.estimatedCost * 0.7,
          fuelSurcharge: reverseData.costBreakdown?.fuelSurcharge || reverseData.estimatedCost * 0.1,
          handlingCharges: reverseData.costBreakdown?.handlingCharges || reverseData.estimatedCost * 0.05,
          gst: reverseData.costBreakdown?.gst || reverseData.estimatedCost * 0.18,
          insurance: reverseData.costBreakdown?.insurance || 0,
          total: reverseData.estimatedCost,
          deliveryTime: reverseData.deliveryTime || '3-5 days',
          serviceType: reverseData.serviceType || 'SURFACE'
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate pricing');
    } finally {
      setLoading(false);
    }
  };

  const PricingBreakdown = ({ data, type }: { data: PricingData['forward'], type: 'forward' | 'reverse' }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {type === 'forward' ? (
          <>
            <ArrowRight className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-600">Forward Shipment</span>
          </>
        ) : (
          <>
            <ArrowLeft className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-600">Reverse Shipment</span>
          </>
        )}
        <Badge variant={type === 'forward' ? 'default' : 'secondary'}>
          {data.serviceType}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Base Rate</span>
            <span className="font-medium">₹{data.baseRate.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Fuel Surcharge</span>
            <span className="font-medium">₹{data.fuelSurcharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Handling Charges</span>
            <span className="font-medium">₹{data.handlingCharges.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">GST (18%)</span>
            <span className="font-medium">₹{data.gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Insurance</span>
            <span className="font-medium">₹{data.insurance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Delivery Time
            </span>
            <span className="font-medium">{data.deliveryTime}</span>
          </div>
        </div>
      </div>

      <Separator />
      
      <div className="flex justify-between items-center text-lg font-bold">
        <span>Total Amount</span>
        <span className={type === 'forward' ? 'text-green-600' : 'text-blue-600'}>
          ₹{data.total.toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Comprehensive Courier Pricing Calculator
          </CardTitle>
          <CardDescription>
            Calculate both forward and reverse shipment pricing with detailed breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="fromPincode">From Pincode *</Label>
              <Input
                id="fromPincode"
                placeholder="e.g., 110001"
                value={fromPincode}
                onChange={(e) => setFromPincode(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="toPincode">To Pincode *</Label>
              <Input
                id="toPincode"
                placeholder="e.g., 400001"
                value={toPincode}
                onChange={(e) => setToPincode(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                placeholder="e.g., 1.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="declaredValue">Declared Value (₹)</Label>
              <Input
                id="declaredValue"
                type="number"
                placeholder="e.g., 5000"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="length">Length (cm)</Label>
              <Input
                id="length"
                type="number"
                placeholder="10"
                value={dimensions.length}
                onChange={(e) => setDimensions(prev => ({ ...prev, length: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="width">Width (cm)</Label>
              <Input
                id="width"
                type="number"
                placeholder="10"
                value={dimensions.width}
                onChange={(e) => setDimensions(prev => ({ ...prev, width: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="10"
                value={dimensions.height}
                onChange={(e) => setDimensions(prev => ({ ...prev, height: e.target.value }))}
              />
            </div>
          </div>

          <Button 
            onClick={calculatePricing} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Calculating Pricing...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Forward & Reverse Pricing
              </>
            )}
          </Button>

          {error && (
            <Alert className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {pricingData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forward Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                Forward Shipment Pricing
              </CardTitle>
              <CardDescription>
                From {fromPincode} to {toPincode}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingBreakdown data={pricingData.forward} type="forward" />
            </CardContent>
          </Card>

          {/* Reverse Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <TrendingDown className="h-5 w-5" />
                Reverse Shipment Pricing
              </CardTitle>
              <CardDescription>
                From {toPincode} to {fromPincode}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingBreakdown data={pricingData.reverse} type="reverse" />
            </CardContent>
          </Card>
        </div>
      )}

      {pricingData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Comparison & Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ₹{pricingData.forward.total.toFixed(2)}
                </div>
                <div className="text-sm text-green-600">Forward Cost</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  ₹{pricingData.reverse.total.toFixed(2)}
                </div>
                <div className="text-sm text-blue-600">Reverse Cost</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  ₹{(pricingData.forward.total + pricingData.reverse.total).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Round Trip</div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">Pricing Notes</span>
              </div>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Prices include all applicable taxes and surcharges</li>
                <li>• Insurance is optional and calculated based on declared value</li>
                <li>• Delivery times may vary based on location and service availability</li>
                <li>• Reverse pricing may differ due to different origin-destination dynamics</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComprehensiveCourierPricingDisplay;