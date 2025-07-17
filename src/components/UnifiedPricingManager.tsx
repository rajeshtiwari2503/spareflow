import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Settings, 
  Calculator, 
  Building2, 
  Truck, 
  DollarSign, 
  Weight, 
  MapPin,
  Zap,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Info,
  ArrowLeftRight,
  RotateCcw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface UnifiedPricingConfig {
  // Forward courier pricing
  defaultRate: number;
  weightRatePerKg: number;
  minimumCharge: number;
  freeWeightLimit: number;
  markupPercentage: number;
  remoteAreaSurcharge: number;
  expressMultiplier: number;
  standardMultiplier: number;
  
  // Reverse courier pricing
  reverseDefaultRate: number;
  reverseWeightRatePerKg: number;
  reverseMinimumCharge: number;
  reverseFreeWeightLimit: number;
  reverseMarkupPercentage: number;
  reverseRemoteAreaSurcharge: number;
  reverseExpressMultiplier: number;
  reverseStandardMultiplier: number;
  
  // Return reason-based pricing
  defectivePartRate: number;
  wrongPartRate: number;
  excessStockRate: number;
  customerReturnRate: number;
}

interface BrandOverride {
  brandId: string;
  brandName: string;
  brandEmail: string;
  perBoxRate: number;
  reversePerBoxRate?: number;
  isActive: boolean;
}

interface PricingCalculation {
  success: boolean;
  totalCost: number;
  breakdown: {
    baseRate: number;
    weightCharges: number;
    serviceCharges: number;
    remoteAreaSurcharge: number;
    platformMarkup: number;
    finalCost: number;
  };
  appliedRules: string[];
  costResponsibility: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  error?: string;
}

const UnifiedPricingManager: React.FC = () => {
  const [config, setConfig] = useState<UnifiedPricingConfig>({
    // Forward courier pricing
    defaultRate: 50,
    weightRatePerKg: 25,
    minimumCharge: 75,
    freeWeightLimit: 0.5,
    markupPercentage: 15,
    remoteAreaSurcharge: 25,
    expressMultiplier: 1.5,
    standardMultiplier: 1.0,
    
    // Reverse courier pricing
    reverseDefaultRate: 45,
    reverseWeightRatePerKg: 25,
    reverseMinimumCharge: 50,
    reverseFreeWeightLimit: 0.5,
    reverseMarkupPercentage: 10,
    reverseRemoteAreaSurcharge: 25,
    reverseExpressMultiplier: 1.5,
    reverseStandardMultiplier: 1.0,
    
    // Return reason-based pricing
    defectivePartRate: 0,
    wrongPartRate: 0,
    excessStockRate: 50,
    customerReturnRate: 60
  });

  const [brandOverrides, setBrandOverrides] = useState<BrandOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  // Calculator state
  const [calculator, setCalculator] = useState({
    brandId: '',
    weight: '',
    pieces: '1',
    pincode: '',
    serviceType: 'STANDARD',
    courierType: 'FORWARD',
    returnReason: '',
    direction: 'BRAND_TO_SERVICE_CENTER'
  });
  const [calculationResult, setCalculationResult] = useState<PricingCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Brand override form state
  const [overrideForm, setOverrideForm] = useState({
    brandId: '',
    perBoxRate: '',
    isActive: true
  });

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/unified-pricing');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setBrandOverrides(data.overrides);
      } else {
        toast.error('Failed to fetch pricing data');
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      toast.error('Error fetching pricing data');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/unified-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateConfig',
          config
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Pricing configuration updated successfully');
      } else {
        toast.error(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Error updating configuration');
    } finally {
      setLoading(false);
    }
  };

  const setBrandOverride = async () => {
    if (!overrideForm.brandId || !overrideForm.perBoxRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/unified-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setBrandOverride',
          brandId: overrideForm.brandId,
          perBoxRate: parseFloat(overrideForm.perBoxRate),
          isActive: overrideForm.isActive
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Brand override set successfully');
        setOverrideForm({ brandId: '', perBoxRate: '', isActive: true });
        fetchPricingData();
      } else {
        toast.error(data.error || 'Failed to set brand override');
      }
    } catch (error) {
      console.error('Error setting brand override:', error);
      toast.error('Error setting brand override');
    } finally {
      setLoading(false);
    }
  };

  const removeBrandOverride = async (brandId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/unified-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeBrandOverride',
          brandId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Brand override removed successfully');
        fetchPricingData();
      } else {
        toast.error(data.error || 'Failed to remove brand override');
      }
    } catch (error) {
      console.error('Error removing brand override:', error);
      toast.error('Error removing brand override');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async () => {
    if (!calculator.brandId || !calculator.weight || !calculator.pieces) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCalculating(true);
    try {
      const response = await fetch('/api/admin/unified-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate',
          brandId: calculator.brandId,
          weight: parseFloat(calculator.weight),
          pieces: parseInt(calculator.pieces),
          pincode: calculator.pincode,
          serviceType: calculator.serviceType,
          courierType: calculator.courierType,
          returnReason: calculator.returnReason || undefined,
          direction: calculator.direction
        })
      });

      const data = await response.json();
      setCalculationResult(data);
      
      if (data.success) {
        toast.success('Price calculated successfully');
      } else {
        toast.error(data.error || 'Failed to calculate price');
      }
    } catch (error) {
      console.error('Error calculating price:', error);
      toast.error('Error calculating price');
    } finally {
      setCalculating(false);
    }
  };

  const migratePricingData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/unified-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Migration completed. ${data.migrated} settings migrated.`);
        fetchPricingData();
      } else {
        toast.error(data.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Error migrating data:', error);
      toast.error('Error migrating data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Unified Courier Pricing System</h2>
          <p className="text-muted-foreground">
            Complete forward & reverse courier pricing management - the backbone of SpareFlow logistics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={migratePricingData} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Migrate Data
          </Button>
          <Button onClick={fetchPricingData} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>CTO Note:</strong> This unified system manages both forward (Brand→Service Center) and reverse (Service Center→Brand) courier pricing with intelligent cost responsibility logic. Forward & Reverse courier system is the main key of SpareFlow project.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="reverse">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reverse Pricing
          </TabsTrigger>
          <TabsTrigger value="overrides">
            <Building2 className="h-4 w-4 mr-2" />
            Brand Overrides
          </TabsTrigger>
          <TabsTrigger value="calculator">
            <Calculator className="h-4 w-4 mr-2" />
            Price Calculator
          </TabsTrigger>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            System Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Forward Courier Configuration
              </CardTitle>
              <CardDescription>
                Default pricing rules for forward shipments (Brand → Service Center)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="defaultRate">Default Rate per Box (₹)</Label>
                    <Input
                      id="defaultRate"
                      type="number"
                      value={config.defaultRate}
                      onChange={(e) => setConfig({ ...config, defaultRate: parseFloat(e.target.value) || 0 })}
                      placeholder="50"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="weightRatePerKg">Weight Rate per KG (₹)</Label>
                    <Input
                      id="weightRatePerKg"
                      type="number"
                      value={config.weightRatePerKg}
                      onChange={(e) => setConfig({ ...config, weightRatePerKg: parseFloat(e.target.value) || 0 })}
                      placeholder="25"
                    />
                  </div>

                  <div>
                    <Label htmlFor="minimumCharge">Minimum Charge (₹)</Label>
                    <Input
                      id="minimumCharge"
                      type="number"
                      value={config.minimumCharge}
                      onChange={(e) => setConfig({ ...config, minimumCharge: parseFloat(e.target.value) || 0 })}
                      placeholder="75"
                    />
                  </div>

                  <div>
                    <Label htmlFor="freeWeightLimit">Free Weight Limit (KG)</Label>
                    <Input
                      id="freeWeightLimit"
                      type="number"
                      step="0.1"
                      value={config.freeWeightLimit}
                      onChange={(e) => setConfig({ ...config, freeWeightLimit: parseFloat(e.target.value) || 0 })}
                      placeholder="0.5"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="markupPercentage">Platform Markup (%)</Label>
                    <Input
                      id="markupPercentage"
                      type="number"
                      value={config.markupPercentage}
                      onChange={(e) => setConfig({ ...config, markupPercentage: parseFloat(e.target.value) || 0 })}
                      placeholder="15"
                    />
                  </div>

                  <div>
                    <Label htmlFor="remoteAreaSurcharge">Remote Area Surcharge (₹)</Label>
                    <Input
                      id="remoteAreaSurcharge"
                      type="number"
                      value={config.remoteAreaSurcharge}
                      onChange={(e) => setConfig({ ...config, remoteAreaSurcharge: parseFloat(e.target.value) || 0 })}
                      placeholder="25"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expressMultiplier">Express Service Multiplier</Label>
                    <Input
                      id="expressMultiplier"
                      type="number"
                      step="0.1"
                      value={config.expressMultiplier}
                      onChange={(e) => setConfig({ ...config, expressMultiplier: parseFloat(e.target.value) || 1 })}
                      placeholder="1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="standardMultiplier">Standard Service Multiplier</Label>
                    <Input
                      id="standardMultiplier"
                      type="number"
                      step="0.1"
                      value={config.standardMultiplier}
                      onChange={(e) => setConfig({ ...config, standardMultiplier: parseFloat(e.target.value) || 1 })}
                      placeholder="1.0"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={updateConfig} disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Forward Courier Configuration'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reverse" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Reverse Courier Configuration
              </CardTitle>
              <CardDescription>
                Pricing rules for reverse shipments (Service Center → Brand) with intelligent cost responsibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">GENERAL REVERSE PRICING</h4>
                  <div>
                    <Label htmlFor="reverseDefaultRate">Default Reverse Rate per Box (₹)</Label>
                    <Input
                      id="reverseDefaultRate"
                      type="number"
                      value={config.reverseDefaultRate}
                      onChange={(e) => setConfig({ ...config, reverseDefaultRate: parseFloat(e.target.value) || 0 })}
                      placeholder="45"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reverseWeightRatePerKg">Reverse Weight Rate per KG (₹)</Label>
                    <Input
                      id="reverseWeightRatePerKg"
                      type="number"
                      value={config.reverseWeightRatePerKg}
                      onChange={(e) => setConfig({ ...config, reverseWeightRatePerKg: parseFloat(e.target.value) || 0 })}
                      placeholder="25"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reverseMinimumCharge">Reverse Minimum Charge (₹)</Label>
                    <Input
                      id="reverseMinimumCharge"
                      type="number"
                      value={config.reverseMinimumCharge}
                      onChange={(e) => setConfig({ ...config, reverseMinimumCharge: parseFloat(e.target.value) || 0 })}
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reverseFreeWeightLimit">Reverse Free Weight Limit (KG)</Label>
                    <Input
                      id="reverseFreeWeightLimit"
                      type="number"
                      step="0.1"
                      value={config.reverseFreeWeightLimit}
                      onChange={(e) => setConfig({ ...config, reverseFreeWeightLimit: parseFloat(e.target.value) || 0 })}
                      placeholder="0.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reverseMarkupPercentage">Reverse Platform Markup (%)</Label>
                    <Input
                      id="reverseMarkupPercentage"
                      type="number"
                      value={config.reverseMarkupPercentage}
                      onChange={(e) => setConfig({ ...config, reverseMarkupPercentage: parseFloat(e.target.value) || 0 })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">RETURN REASON-BASED PRICING</h4>
                  <div>
                    <Label htmlFor="defectivePartRate">Defective Part Rate (₹) - Brand Pays</Label>
                    <Input
                      id="defectivePartRate"
                      type="number"
                      value={config.defectivePartRate}
                      onChange={(e) => setConfig({ ...config, defectivePartRate: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Usually 0 - Brand covers defective part returns</p>
                  </div>

                  <div>
                    <Label htmlFor="wrongPartRate">Wrong Part Rate (₹) - Brand Pays</Label>
                    <Input
                      id="wrongPartRate"
                      type="number"
                      value={config.wrongPartRate}
                      onChange={(e) => setConfig({ ...config, wrongPartRate: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Usually 0 - Brand covers wrong part returns</p>
                  </div>

                  <div>
                    <Label htmlFor="excessStockRate">Excess Stock Rate (₹) - Service Center Pays</Label>
                    <Input
                      id="excessStockRate"
                      type="number"
                      value={config.excessStockRate}
                      onChange={(e) => setConfig({ ...config, excessStockRate: parseFloat(e.target.value) || 0 })}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Service Center pays for excess inventory returns</p>
                  </div>

                  <div>
                    <Label htmlFor="customerReturnRate">Customer Return Rate (₹) - Customer Pays</Label>
                    <Input
                      id="customerReturnRate"
                      type="number"
                      value={config.customerReturnRate}
                      onChange={(e) => setConfig({ ...config, customerReturnRate: parseFloat(e.target.value) || 0 })}
                      placeholder="60"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Customer pays for their returns + handling fee</p>
                  </div>

                  <div>
                    <Label htmlFor="reverseRemoteAreaSurcharge">Reverse Remote Area Surcharge (₹)</Label>
                    <Input
                      id="reverseRemoteAreaSurcharge"
                      type="number"
                      value={config.reverseRemoteAreaSurcharge}
                      onChange={(e) => setConfig({ ...config, reverseRemoteAreaSurcharge: parseFloat(e.target.value) || 0 })}
                      placeholder="25"
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Cost Responsibility Logic:</strong> Defective/Wrong parts = Brand pays (₹0), Excess stock = Service Center pays (full rate), Customer returns = Customer pays (full rate + handling)
                </AlertDescription>
              </Alert>

              <Button onClick={updateConfig} disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Reverse Courier Configuration'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand-Specific Overrides</CardTitle>
              <CardDescription>
                Set custom per-box rates for specific brands (applies to forward shipments)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="brandId">Brand ID</Label>
                  <Input
                    id="brandId"
                    value={overrideForm.brandId}
                    onChange={(e) => setOverrideForm({ ...overrideForm, brandId: e.target.value })}
                    placeholder="Enter brand ID"
                  />
                </div>
                <div>
                  <Label htmlFor="perBoxRate">Per Box Rate (₹)</Label>
                  <Input
                    id="perBoxRate"
                    type="number"
                    value={overrideForm.perBoxRate}
                    onChange={(e) => setOverrideForm({ ...overrideForm, perBoxRate: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div>
                  <Label htmlFor="isActive">Status</Label>
                  <Select 
                    value={overrideForm.isActive.toString()} 
                    onValueChange={(value) => setOverrideForm({ ...overrideForm, isActive: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={setBrandOverride} disabled={loading} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Override
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Brand Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              {brandOverrides.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No brand overrides configured</p>
              ) : (
                <div className="space-y-2">
                  {brandOverrides.map((override) => (
                    <div key={override.brandId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{override.brandName}</p>
                          <p className="text-sm text-muted-foreground">{override.brandEmail}</p>
                        </div>
                        <Badge variant={override.isActive ? "default" : "secondary"}>
                          {override.isActive ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {override.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">₹{override.perBoxRate}/box</Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeBrandOverride(override.brandId)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Advanced Price Calculator
              </CardTitle>
              <CardDescription>
                Test both forward and reverse courier pricing with different scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="calcBrandId">Brand ID</Label>
                  <Input
                    id="calcBrandId"
                    value={calculator.brandId}
                    onChange={(e) => setCalculator({ ...calculator, brandId: e.target.value })}
                    placeholder="Enter brand ID"
                  />
                </div>
                <div>
                  <Label htmlFor="calcWeight">Weight (KG)</Label>
                  <Input
                    id="calcWeight"
                    type="number"
                    step="0.1"
                    value={calculator.weight}
                    onChange={(e) => setCalculator({ ...calculator, weight: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <Label htmlFor="calcPieces">Number of Pieces</Label>
                  <Input
                    id="calcPieces"
                    type="number"
                    value={calculator.pieces}
                    onChange={(e) => setCalculator({ ...calculator, pieces: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="calcPincode">Pincode (Optional)</Label>
                  <Input
                    id="calcPincode"
                    value={calculator.pincode}
                    onChange={(e) => setCalculator({ ...calculator, pincode: e.target.value })}
                    placeholder="400001"
                  />
                </div>
                <div>
                  <Label htmlFor="calcServiceType">Service Type</Label>
                  <Select 
                    value={calculator.serviceType} 
                    onValueChange={(value) => setCalculator({ ...calculator, serviceType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="EXPRESS">Express</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="calcCourierType">Courier Type</Label>
                  <Select 
                    value={calculator.courierType} 
                    onValueChange={(value) => setCalculator({ ...calculator, courierType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FORWARD">Forward</SelectItem>
                      <SelectItem value="REVERSE">Reverse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calculator.courierType === 'REVERSE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="calcReturnReason">Return Reason</Label>
                    <Select 
                      value={calculator.returnReason} 
                      onValueChange={(value) => setCalculator({ ...calculator, returnReason: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select return reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEFECTIVE">Defective Part (Brand Pays)</SelectItem>
                        <SelectItem value="WRONG_PART">Wrong Part (Brand Pays)</SelectItem>
                        <SelectItem value="EXCESS_STOCK">Excess Stock (Service Center Pays)</SelectItem>
                        <SelectItem value="CUSTOMER_RETURN">Customer Return (Customer Pays)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="calcDirection">Shipment Direction</Label>
                    <Select 
                      value={calculator.direction} 
                      onValueChange={(value) => setCalculator({ ...calculator, direction: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SERVICE_CENTER_TO_BRAND">Service Center → Brand</SelectItem>
                        <SelectItem value="BRAND_TO_SERVICE_CENTER">Brand → Service Center</SelectItem>
                        <SelectItem value="DISTRIBUTOR_TO_SERVICE_CENTER">Distributor → Service Center</SelectItem>
                        <SelectItem value="SERVICE_CENTER_TO_DISTRIBUTOR">Service Center → Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button onClick={calculatePrice} disabled={calculating} className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                {calculating ? 'Calculating...' : 'Calculate Price'}
              </Button>

              {calculationResult && (
                <div className="mt-6 space-y-4">
                  <Separator />
                  {calculationResult.success ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-green-600">
                          ₹{calculationResult.totalCost.toFixed(2)}
                        </h3>
                        <p className="text-muted-foreground">Total Cost</p>
                        <Badge variant="outline" className="mt-2">
                          Paid by: {calculationResult.costResponsibility}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm"><strong>Base Rate:</strong> ₹{calculationResult.breakdown.baseRate.toFixed(2)}</p>
                          <p className="text-sm"><strong>Weight Charges:</strong> ₹{calculationResult.breakdown.weightCharges.toFixed(2)}</p>
                          <p className="text-sm"><strong>Service Charges:</strong> ₹{calculationResult.breakdown.serviceCharges.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm"><strong>Remote Area Surcharge:</strong> ₹{calculationResult.breakdown.remoteAreaSurcharge.toFixed(2)}</p>
                          <p className="text-sm"><strong>Platform Markup:</strong> ₹{calculationResult.breakdown.platformMarkup.toFixed(2)}</p>
                          <p className="text-sm"><strong>Final Cost:</strong> ₹{calculationResult.breakdown.finalCost.toFixed(2)}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Applied Rules:</h4>
                        <ul className="text-sm space-y-1">
                          {calculationResult.appliedRules.map((rule, index) => (
                            <li key={index} className="text-muted-foreground">• {rule}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {calculationResult.error || 'Calculation failed'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forward Rate</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{config.defaultRate}</div>
                <p className="text-xs text-muted-foreground">per box</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reverse Rate</CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{config.reverseDefaultRate}</div>
                <p className="text-xs text-muted-foreground">per box</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weight Rate</CardTitle>
                <Weight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{config.weightRatePerKg}</div>
                <p className="text-xs text-muted-foreground">per kg</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Brand Overrides</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brandOverrides.filter(o => o.isActive).length}</div>
                <p className="text-xs text-muted-foreground">active overrides</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Forward vs Reverse Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Forward Default Rate</span>
                  <Badge variant="outline">₹{config.defaultRate}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Reverse Default Rate</span>
                  <Badge variant="outline">₹{config.reverseDefaultRate}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Forward Markup</span>
                  <Badge variant="outline">{config.markupPercentage}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Reverse Markup</span>
                  <Badge variant="outline">{config.reverseMarkupPercentage}%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Return Reason Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Defective Part</span>
                  <Badge variant="secondary">₹{config.defectivePartRate} (Brand)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Wrong Part</span>
                  <Badge variant="secondary">₹{config.wrongPartRate} (Brand)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Excess Stock</span>
                  <Badge variant="destructive">₹{config.excessStockRate} (SC)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Customer Return</span>
                  <Badge variant="outline">₹{config.customerReturnRate} (Customer)</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Logic Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Forward Courier Logic:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Check for brand-specific override rate</li>
                  <li>2. Calculate base cost (rate × pieces)</li>
                  <li>3. Add weight charges if over free limit</li>
                  <li>4. Apply service type multiplier</li>
                  <li>5. Add remote area surcharge (if applicable)</li>
                  <li>6. Apply platform markup percentage</li>
                  <li>7. Ensure minimum charge is met</li>
                </ol>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Reverse Courier Logic:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Determine cost responsibility based on return reason</li>
                  <li>2. Apply reason-specific rate (defective=₹0, excess=full rate)</li>
                  <li>3. Calculate weight charges with reverse limits</li>
                  <li>4. Apply reverse service multipliers</li>
                  <li>5. Add reverse remote area surcharge</li>
                  <li>6. Apply lower reverse markup percentage</li>
                  <li>7. Ensure reverse minimum charge is met</li>
                  <li>8. Deduct from appropriate party's wallet</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedPricingManager;