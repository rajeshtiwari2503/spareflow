import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Calculator, Settings, Weight, MapPin, Users, Eye, Save, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface AdvancedPricingRule {
  id: string;
  brandId: string;
  ruleName: string;
  conditions: string;
  baseRate: number;
  isActive: boolean;
  brand: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface RoleBasedPricing {
  id: string;
  role: string;
  baseRate: number;
  multiplier: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WeightBasedPricing {
  id: string;
  minWeight: number;
  maxWeight: number | null;
  baseRate: number;
  additionalRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PincodeBasedPricing {
  id: string;
  pincode: string;
  zone: string;
  baseRate: number;
  surcharge: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DefaultRates {
  defaultCourierRate: number;
  baseWeightRate: number;
  additionalWeightRate: number;
  remoteAreaSurcharge: number;
}

interface PriceCalculation {
  price: number;
  breakdown: {
    baseRate: number;
    roleMultiplier: number;
    weightSurcharge: number;
    pincodeSurcharge: number;
    totalPerBox: number;
    numBoxes: number;
    totalPrice: number;
  };
}

interface Brand {
  id: string;
  name: string;
  email: string;
}

export default function AdvancedCourierPricingManager({ brands }: { brands: Brand[] }) {
  const [advancedRules, setAdvancedRules] = useState<AdvancedPricingRule[]>([]);
  const [roleBasedPricing, setRoleBasedPricing] = useState<RoleBasedPricing[]>([]);
  const [weightBasedPricing, setWeightBasedPricing] = useState<WeightBasedPricing[]>([]);
  const [pincodeBasedPricing, setPincodeBasedPricing] = useState<PincodeBasedPricing[]>([]);
  const [defaultRates, setDefaultRates] = useState<DefaultRates>({
    defaultCourierRate: 50,
    baseWeightRate: 30,
    additionalWeightRate: 10,
    remoteAreaSurcharge: 25
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newRoleRate, setNewRoleRate] = useState({ role: '', baseRate: '', multiplier: '1.0' });
  const [newWeightRate, setNewWeightRate] = useState({ minWeight: '', maxWeight: '', baseRate: '', additionalRate: '0' });
  const [newPincodeRate, setNewPincodeRate] = useState({ pincode: '', zone: 'STANDARD', baseRate: '', surcharge: '0' });
  const [priceCalculator, setPriceCalculator] = useState({
    brandId: 'none',
    role: '',
    weight: '',
    pincode: '',
    numBoxes: '1'
  });
  const [calculatedPrice, setCalculatedPrice] = useState<PriceCalculation | null>(null);

  // Dialog states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
  const [isPincodeDialogOpen, setIsPincodeDialogOpen] = useState(false);

  const roles = ['BRAND', 'DISTRIBUTOR', 'SERVICE_CENTER', 'CUSTOMER'];
  const zones = ['STANDARD', 'METRO', 'REMOTE', 'NORTHEAST', 'ISLAND'];

  useEffect(() => {
    fetchAdvancedPricing();
  }, []);

  const fetchAdvancedPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/courier-pricing-advanced');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setAdvancedRules(data.advancedPricingRules || []);
      setRoleBasedPricing(data.roleBasedPricing || []);
      setWeightBasedPricing(data.weightBasedPricing || []);
      setPincodeBasedPricing(data.pincodeBasedPricing || []);
      setDefaultRates(data.defaultRates || defaultRates);
    } catch (error) {
      console.error('Error fetching advanced pricing:', error);
      setError('Failed to fetch pricing data. Please try again.');
      toast.error("Failed to fetch pricing data");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleBasedPricing = async () => {
    if (!newRoleRate.role || !newRoleRate.baseRate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setRoleBasedPricing',
          role: newRoleRate.role,
          baseRate: parseFloat(newRoleRate.baseRate),
          multiplier: parseFloat(newRoleRate.multiplier)
        })
      });

      if (response.ok) {
        await fetchAdvancedPricing();
        setNewRoleRate({ role: '', baseRate: '', multiplier: '1.0' });
        setIsRoleDialogOpen(false);
        toast.success("Role-based pricing updated successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role-based pricing');
      }
    } catch (error) {
      console.error('Error updating role-based pricing:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update role-based pricing");
    }
  };

  const handleWeightBasedPricing = async () => {
    if (!newWeightRate.minWeight || !newWeightRate.baseRate) {
      toast.error("Please fill in minimum weight and base rate");
      return;
    }

    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setWeightBasedPricing',
          minWeight: parseFloat(newWeightRate.minWeight),
          maxWeight: newWeightRate.maxWeight ? parseFloat(newWeightRate.maxWeight) : null,
          baseRate: parseFloat(newWeightRate.baseRate),
          additionalRate: parseFloat(newWeightRate.additionalRate)
        })
      });

      if (response.ok) {
        await fetchAdvancedPricing();
        setNewWeightRate({ minWeight: '', maxWeight: '', baseRate: '', additionalRate: '0' });
        setIsWeightDialogOpen(false);
        toast.success("Weight-based pricing created successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create weight-based pricing');
      }
    } catch (error) {
      console.error('Error creating weight-based pricing:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create weight-based pricing");
    }
  };

  const handlePincodeBasedPricing = async () => {
    if (!newPincodeRate.pincode || !newPincodeRate.baseRate) {
      toast.error("Please fill in pincode and base rate");
      return;
    }

    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setPincodeBasedPricing',
          pincode: newPincodeRate.pincode,
          zone: newPincodeRate.zone,
          baseRate: parseFloat(newPincodeRate.baseRate),
          surcharge: parseFloat(newPincodeRate.surcharge)
        })
      });

      if (response.ok) {
        await fetchAdvancedPricing();
        setNewPincodeRate({ pincode: '', zone: 'STANDARD', baseRate: '', surcharge: '0' });
        setIsPincodeDialogOpen(false);
        toast.success("Pincode-based pricing updated successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update pincode-based pricing');
      }
    } catch (error) {
      console.error('Error updating pincode-based pricing:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update pincode-based pricing");
    }
  };

  const handleUpdateDefaultRates = async () => {
    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDefaultRates',
          ...defaultRates
        })
      });

      if (response.ok) {
        toast.success("Default rates updated successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update default rates');
      }
    } catch (error) {
      console.error('Error updating default rates:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update default rates");
    }
  };

  const handleCalculatePrice = async () => {
    if (!priceCalculator.role || !priceCalculator.weight || !priceCalculator.pincode || !priceCalculator.numBoxes) {
      toast.error("Please fill in all calculator fields");
      return;
    }

    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculatePrice',
          ...priceCalculator
        })
      });

      const data = await response.json();
      if (response.ok) {
        setCalculatedPrice(data);
      } else {
        toast.error(data.error || "Failed to calculate price");
      }
    } catch (error) {
      console.error('Error calculating price:', error);
      toast.error("Failed to calculate price");
    }
  };

  const handleDeleteRolePricing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role-based pricing?')) return;

    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteRoleBasedPricing',
          id
        })
      });

      if (response.ok) {
        await fetchAdvancedPricing();
        toast.success("Role-based pricing deleted successfully");
      }
    } catch (error) {
      console.error('Error deleting role pricing:', error);
      toast.error("Failed to delete role-based pricing");
    }
  };

  const handleDeleteWeightPricing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weight-based pricing?')) return;

    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteWeightBasedPricing',
          id
        })
      });

      if (response.ok) {
        await fetchAdvancedPricing();
        toast.success("Weight-based pricing deleted successfully");
      }
    } catch (error) {
      console.error('Error deleting weight pricing:', error);
      toast.error("Failed to delete weight-based pricing");
    }
  };

  const handleDeletePincodePricing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pincode-based pricing?')) return;

    try {
      const response = await fetch('/api/admin/courier-pricing-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deletePincodeBasedPricing',
          id
        })
      });

      if (response.ok) {
        await fetchAdvancedPricing();
        toast.success("Pincode-based pricing deleted successfully");
      }
    } catch (error) {
      console.error('Error deleting pincode pricing:', error);
      toast.error("Failed to delete pincode-based pricing");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading pricing data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={fetchAdvancedPricing}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Courier Pricing</h2>
          <p className="text-gray-600">Configure role, weight, and pincode-based pricing logic</p>
        </div>
        <Button onClick={fetchAdvancedPricing} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Role Rules</p>
                <p className="text-2xl font-bold">{roleBasedPricing.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Weight className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Weight Rules</p>
                <p className="text-2xl font-bold">{weightBasedPricing.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Pincode Rules</p>
                <p className="text-2xl font-bold">{pincodeBasedPricing.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Default Rate</p>
                <p className="text-2xl font-bold">₹{defaultRates.defaultCourierRate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Price Calculator
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Role-Based
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <Weight className="h-4 w-4" />
            Weight-Based
          </TabsTrigger>
          <TabsTrigger value="pincode" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Pincode-Based
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Default Rates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Price Calculator</CardTitle>
                <CardDescription>Calculate shipping cost based on current pricing rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Brand (Optional)</Label>
                    <Select value={priceCalculator.brandId} onValueChange={(value) => setPriceCalculator({...priceCalculator, brandId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific brand</SelectItem>
                        {brands?.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select value={priceCalculator.role} onValueChange={(value) => setPriceCalculator({...priceCalculator, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight (kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 2.5"
                      value={priceCalculator.weight}
                      onChange={(e) => setPriceCalculator({...priceCalculator, weight: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input
                      placeholder="e.g., 110001"
                      value={priceCalculator.pincode}
                      onChange={(e) => setPriceCalculator({...priceCalculator, pincode: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Number of Boxes *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                    value={priceCalculator.numBoxes}
                    onChange={(e) => setPriceCalculator({...priceCalculator, numBoxes: e.target.value})}
                  />
                </div>
                <Button onClick={handleCalculatePrice} className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Price
                </Button>
              </CardContent>
            </Card>

            {calculatedPrice && (
              <Card>
                <CardHeader>
                  <CardTitle>Price Breakdown</CardTitle>
                  <CardDescription>Detailed cost calculation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Base Rate:</span>
                      <span>₹{calculatedPrice.breakdown.baseRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Role Multiplier:</span>
                      <span>{calculatedPrice.breakdown.roleMultiplier}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weight Surcharge:</span>
                      <span>₹{calculatedPrice.breakdown.weightSurcharge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pincode Surcharge:</span>
                      <span>₹{calculatedPrice.breakdown.pincodeSurcharge}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-semibold">
                      <span>Rate per Box:</span>
                      <span>₹{calculatedPrice.breakdown.totalPerBox}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Number of Boxes:</span>
                      <span>{calculatedPrice.breakdown.numBoxes}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold text-green-600">
                      <span>Total Price:</span>
                      <span>₹{calculatedPrice.breakdown.totalPrice}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Role-Based Pricing</CardTitle>
                <CardDescription>Set different rates for different user roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRoleRate.role} onValueChange={(value) => setNewRoleRate({...newRoleRate, role: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base Rate (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 45"
                    value={newRoleRate.baseRate}
                    onChange={(e) => setNewRoleRate({...newRoleRate, baseRate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 1.2"
                    value={newRoleRate.multiplier}
                    onChange={(e) => setNewRoleRate({...newRoleRate, multiplier: e.target.value})}
                  />
                </div>
                <Button onClick={handleRoleBasedPricing} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add/Update Role Pricing
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Role-Based Pricing</CardTitle>
                <CardDescription>Active pricing rules by user role</CardDescription>
              </CardHeader>
              <CardContent>
                {roleBasedPricing.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No role-based pricing rules configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Base Rate</TableHead>
                        <TableHead>Multiplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roleBasedPricing.map((pricing) => (
                        <TableRow key={pricing.id}>
                          <TableCell className="font-medium">{pricing.role}</TableCell>
                          <TableCell>₹{pricing.baseRate}</TableCell>
                          <TableCell>{pricing.multiplier}x</TableCell>
                          <TableCell>
                            <Badge variant={pricing.isActive ? 'default' : 'secondary'}>
                              {pricing.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRolePricing(pricing.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weight" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Weight-Based Pricing</CardTitle>
                <CardDescription>Set rates based on package weight ranges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 0"
                      value={newWeightRate.minWeight}
                      onChange={(e) => setNewWeightRate({...newWeightRate, minWeight: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 5 (optional)"
                      value={newWeightRate.maxWeight}
                      onChange={(e) => setNewWeightRate({...newWeightRate, maxWeight: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Base Rate (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 30"
                    value={newWeightRate.baseRate}
                    onChange={(e) => setNewWeightRate({...newWeightRate, baseRate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Rate per kg (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    value={newWeightRate.additionalRate}
                    onChange={(e) => setNewWeightRate({...newWeightRate, additionalRate: e.target.value})}
                  />
                </div>
                <Button onClick={handleWeightBasedPricing} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Weight Pricing
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Weight-Based Pricing</CardTitle>
                <CardDescription>Active pricing rules by weight ranges</CardDescription>
              </CardHeader>
              <CardContent>
                {weightBasedPricing.length === 0 ? (
                  <div className="text-center py-8">
                    <Weight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No weight-based pricing rules configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Weight Range</TableHead>
                        <TableHead>Base Rate</TableHead>
                        <TableHead>Additional Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weightBasedPricing.map((pricing) => (
                        <TableRow key={pricing.id}>
                          <TableCell className="font-medium">
                            {pricing.minWeight}kg - {pricing.maxWeight ? `${pricing.maxWeight}kg` : '∞'}
                          </TableCell>
                          <TableCell>₹{pricing.baseRate}</TableCell>
                          <TableCell>₹{pricing.additionalRate}/kg</TableCell>
                          <TableCell>
                            <Badge variant={pricing.isActive ? 'default' : 'secondary'}>
                              {pricing.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWeightPricing(pricing.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pincode" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Pincode-Based Pricing</CardTitle>
                <CardDescription>Set rates for specific pincodes or zones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input
                    placeholder="e.g., 110001"
                    value={newPincodeRate.pincode}
                    onChange={(e) => setNewPincodeRate({...newPincodeRate, pincode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zone</Label>
                  <Select value={newPincodeRate.zone} onValueChange={(value) => setNewPincodeRate({...newPincodeRate, zone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map(zone => (
                        <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base Rate (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 40"
                    value={newPincodeRate.baseRate}
                    onChange={(e) => setNewPincodeRate({...newPincodeRate, baseRate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Surcharge (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 15"
                    value={newPincodeRate.surcharge}
                    onChange={(e) => setNewPincodeRate({...newPincodeRate, surcharge: e.target.value})}
                  />
                </div>
                <Button onClick={handlePincodeBasedPricing} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add/Update Pincode Pricing
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Pincode-Based Pricing</CardTitle>
                <CardDescription>Active pricing rules by pincode/zone</CardDescription>
              </CardHeader>
              <CardContent>
                {pincodeBasedPricing.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No pincode-based pricing rules configured</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pincode</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead>Base Rate</TableHead>
                          <TableHead>Surcharge</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pincodeBasedPricing.map((pricing) => (
                          <TableRow key={pricing.id}>
                            <TableCell className="font-medium">{pricing.pincode}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{pricing.zone}</Badge>
                            </TableCell>
                            <TableCell>₹{pricing.baseRate}</TableCell>
                            <TableCell>₹{pricing.surcharge}</TableCell>
                            <TableCell>
                              <Badge variant={pricing.isActive ? 'default' : 'secondary'}>
                                {pricing.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePincodePricing(pricing.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Rate Configuration</CardTitle>
              <CardDescription>Set fallback rates when specific rules don't apply</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Courier Rate (₹)</Label>
                    <Input
                      type="number"
                      value={defaultRates.defaultCourierRate}
                      onChange={(e) => setDefaultRates({...defaultRates, defaultCourierRate: parseFloat(e.target.value) || 0})}
                    />
                    <p className="text-xs text-gray-500">Base rate when no specific brand/role pricing exists</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Weight Rate (₹)</Label>
                    <Input
                      type="number"
                      value={defaultRates.baseWeightRate}
                      onChange={(e) => setDefaultRates({...defaultRates, baseWeightRate: parseFloat(e.target.value) || 0})}
                    />
                    <p className="text-xs text-gray-500">Rate for first kg when no weight-based pricing exists</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Additional Weight Rate (₹/kg)</Label>
                    <Input
                      type="number"
                      value={defaultRates.additionalWeightRate}
                      onChange={(e) => setDefaultRates({...defaultRates, additionalWeightRate: parseFloat(e.target.value) || 0})}
                    />
                    <p className="text-xs text-gray-500">Rate per additional kg beyond first kg</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Remote Area Surcharge (₹)</Label>
                    <Input
                      type="number"
                      value={defaultRates.remoteAreaSurcharge}
                      onChange={(e) => setDefaultRates({...defaultRates, remoteAreaSurcharge: parseFloat(e.target.value) || 0})}
                    />
                    <p className="text-xs text-gray-500">Additional charge for remote/difficult areas</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleUpdateDefaultRates} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Update Default Rates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}