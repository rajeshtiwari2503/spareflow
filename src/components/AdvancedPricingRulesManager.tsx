import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  TestTube,
  Calculator,
  TrendingUp,
  TrendingDown,
  Target,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  Weight,
  MapPin,
  Users,
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  Upload,
  Copy,
  Eye
} from 'lucide-react';

interface PricingRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  conditions: PricingCondition[];
  actions: PricingAction[];
  validFrom: Date;
  validTo?: Date;
  brandId?: string;
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    applicationsCount: number;
    totalSavings: number;
    avgDiscount: number;
  };
}

interface PricingCondition {
  type: 'weight' | 'distance' | 'volume' | 'value' | 'destination' | 'service_type' | 'customer_tier' | 'time' | 'quantity';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'contains';
  value: any;
  secondaryValue?: any;
}

interface PricingAction {
  type: 'fixed_price' | 'percentage_discount' | 'fixed_discount' | 'markup' | 'tier_pricing' | 'dynamic_pricing';
  value: number;
  target: 'base_price' | 'shipping_cost' | 'total_cost' | 'margin';
}

interface TestResult {
  originalPrice: number;
  finalPrice: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discount: number;
    markup: number;
    description: string;
  }>;
  breakdown: {
    baseCost: number;
    discounts: number;
    markups: number;
    taxes: number;
    finalCost: number;
  };
  margin: {
    amount: number;
    percentage: number;
  };
}

const AdvancedPricingRulesManager: React.FC<{ brandId: string }> = ({ brandId }) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Form state for creating/editing rules
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 100,
    isActive: true,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    conditions: [] as PricingCondition[],
    actions: [] as PricingAction[]
  });

  // Test form state
  const [testData, setTestData] = useState({
    weight: 5,
    distance: 500,
    volume: 1000,
    value: 10000,
    destinationPincode: '110001',
    serviceType: 'standard',
    customerTier: 'regular',
    quantity: 1,
    baseCost: 500
  });

  useEffect(() => {
    loadPricingRules();
  }, [brandId]);

  const loadPricingRules = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockRules: PricingRule[] = [
        {
          id: 'rule_1',
          name: 'Volume Discount',
          description: 'Discount for shipments over 10kg',
          priority: 100,
          isActive: true,
          conditions: [
            { type: 'weight', operator: 'greater_than', value: 10 }
          ],
          actions: [
            { type: 'percentage_discount', value: 10, target: 'base_price' }
          ],
          validFrom: new Date('2024-01-01'),
          brandId,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          stats: {
            applicationsCount: 156,
            totalSavings: 45600,
            avgDiscount: 8.5
          }
        },
        {
          id: 'rule_2',
          name: 'Long Distance Markup',
          description: 'Additional cost for shipments over 1000km',
          priority: 90,
          isActive: true,
          conditions: [
            { type: 'distance', operator: 'greater_than', value: 1000 }
          ],
          actions: [
            { type: 'percentage_discount', value: -15, target: 'base_price' }
          ],
          validFrom: new Date('2024-01-01'),
          brandId,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          stats: {
            applicationsCount: 89,
            totalSavings: -23400,
            avgDiscount: -12.3
          }
        },
        {
          id: 'rule_3',
          name: 'Premium Customer Discount',
          description: 'Special pricing for premium tier customers',
          priority: 110,
          isActive: true,
          conditions: [
            { type: 'customer_tier', operator: 'equals', value: 'premium' }
          ],
          actions: [
            { type: 'percentage_discount', value: 15, target: 'total_cost' }
          ],
          validFrom: new Date('2024-01-01'),
          brandId,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          stats: {
            applicationsCount: 234,
            totalSavings: 78900,
            avgDiscount: 13.2
          }
        }
      ];

      setRules(mockRules);
    } catch (error) {
      console.error('Error loading pricing rules:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing rules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      if (!formData.name.trim() || formData.conditions.length === 0 || formData.actions.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields and add at least one condition and action",
          variant: "destructive"
        });
        return;
      }

      const newRule: PricingRule = {
        id: `rule_${Date.now()}`,
        ...formData,
        validFrom: new Date(formData.validFrom),
        validTo: formData.validTo ? new Date(formData.validTo) : undefined,
        brandId,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          applicationsCount: 0,
          totalSavings: 0,
          avgDiscount: 0
        }
      };

      setRules(prev => [...prev, newRule]);
      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: "Success",
        description: "Pricing rule created successfully"
      });
    } catch (error) {
      console.error('Error creating pricing rule:', error);
      toast({
        title: "Error",
        description: "Failed to create pricing rule",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRule = async () => {
    try {
      if (!selectedRule || !formData.name.trim()) {
        return;
      }

      const updatedRule: PricingRule = {
        ...selectedRule,
        ...formData,
        validFrom: new Date(formData.validFrom),
        validTo: formData.validTo ? new Date(formData.validTo) : undefined,
        updatedAt: new Date()
      };

      setRules(prev => prev.map(rule => 
        rule.id === selectedRule.id ? updatedRule : rule
      ));
      setIsEditDialogOpen(false);
      setSelectedRule(null);
      resetForm();

      toast({
        title: "Success",
        description: "Pricing rule updated successfully"
      });
    } catch (error) {
      console.error('Error updating pricing rule:', error);
      toast({
        title: "Error",
        description: "Failed to update pricing rule",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      
      toast({
        title: "Success",
        description: "Pricing rule deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting pricing rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete pricing rule",
        variant: "destructive"
      });
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, isActive, updatedAt: new Date() } : rule
      ));

      toast({
        title: "Success",
        description: `Pricing rule ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling pricing rule:', error);
      toast({
        title: "Error",
        description: "Failed to update pricing rule status",
        variant: "destructive"
      });
    }
  };

  const handleTestRule = async (rule: PricingRule) => {
    try {
      // Mock test result calculation
      const mockResult: TestResult = {
        originalPrice: testData.baseCost,
        finalPrice: testData.baseCost * 0.9, // 10% discount example
        appliedRules: [{
          ruleId: rule.id,
          ruleName: rule.name,
          discount: testData.baseCost * 0.1,
          markup: 0,
          description: rule.description
        }],
        breakdown: {
          baseCost: testData.baseCost,
          discounts: testData.baseCost * 0.1,
          markups: 0,
          taxes: 0,
          finalCost: testData.baseCost * 0.9
        },
        margin: {
          amount: -testData.baseCost * 0.1,
          percentage: -10
        }
      };

      setTestResult(mockResult);
      setIsTestDialogOpen(true);
    } catch (error) {
      console.error('Error testing pricing rule:', error);
      toast({
        title: "Error",
        description: "Failed to test pricing rule",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 100,
      isActive: true,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: '',
      conditions: [],
      actions: []
    });
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        type: 'weight',
        operator: 'greater_than',
        value: 0
      }]
    }));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'percentage_discount',
        value: 0,
        target: 'base_price'
      }]
    }));
  };

  const updateAction = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const openEditDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      isActive: rule.isActive,
      validFrom: rule.validFrom.toISOString().split('T')[0],
      validTo: rule.validTo?.toISOString().split('T')[0] || '',
      conditions: [...rule.conditions],
      actions: [...rule.actions]
    });
    setIsEditDialogOpen(true);
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && rule.isActive) ||
                         (statusFilter === 'inactive' && !rule.isActive);
    return matchesSearch && matchesStatus;
  });

  const getConditionIcon = (type: string) => {
    switch (type) {
      case 'weight': return <Weight className="h-4 w-4" />;
      case 'distance': return <MapPin className="h-4 w-4" />;
      case 'customer_tier': return <Users className="h-4 w-4" />;
      case 'time': return <Calendar className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'percentage_discount': return <Percent className="h-4 w-4" />;
      case 'fixed_discount': return <DollarSign className="h-4 w-4" />;
      case 'markup': return <TrendingUp className="h-4 w-4" />;
      default: return <Calculator className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading pricing rules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Pricing Rules</h2>
          <p className="text-gray-600">Configure complex pricing rules and conditions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadPricingRules} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search rules by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rules</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredRules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calculator className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Pricing Rules Found</h3>
              <p className="text-gray-600 mb-4">
                {rules.length === 0 
                  ? "Create your first pricing rule to get started with advanced pricing configurations."
                  : "No rules match your current filters."
                }
              </p>
              {rules.length === 0 && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Rule
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRules.map((rule) => (
            <Card key={rule.id} className={`${!rule.isActive ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {rule.name}
                        <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          Priority: {rule.priority}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestRule(rule)}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(rule)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Conditions */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Conditions ({rule.conditions.length})
                    </h4>
                    <div className="space-y-2">
                      {rule.conditions.map((condition, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                          {getConditionIcon(condition.type)}
                          <span className="capitalize">{condition.type.replace('_', ' ')}</span>
                          <span className="text-gray-500">{condition.operator.replace('_', ' ')}</span>
                          <span className="font-medium">{condition.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Actions ({rule.actions.length})
                    </h4>
                    <div className="space-y-2">
                      {rule.actions.map((action, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                          {getActionIcon(action.type)}
                          <span className="capitalize">{action.type.replace('_', ' ')}</span>
                          <span className="font-medium">
                            {action.type.includes('percentage') ? `${action.value}%` : `₹${action.value}`}
                          </span>
                          <span className="text-gray-500">on {action.target.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statistics */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Performance
                    </h4>
                    {rule.stats && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Applications:</span>
                          <span className="font-medium">{rule.stats.applicationsCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Impact:</span>
                          <span className={`font-medium ${rule.stats.totalSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{Math.abs(rule.stats.totalSavings).toLocaleString()}
                            {rule.stats.totalSavings >= 0 ? ' saved' : ' added'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Discount:</span>
                          <span className={`font-medium ${rule.stats.avgDiscount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {rule.stats.avgDiscount >= 0 ? '+' : ''}{rule.stats.avgDiscount.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validity Period */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Valid from: {rule.validFrom.toLocaleDateString()}</span>
                    </div>
                    {rule.validTo && (
                      <div className="flex items-center gap-1">
                        <span>to: {rule.validTo.toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Updated: {rule.updatedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedRule(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? 'Create Pricing Rule' : 'Edit Pricing Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure conditions and actions for your pricing rule
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter rule name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valid From *</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validTo">Valid To (Optional)</Label>
                  <Input
                    id="validTo"
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Conditions</h4>
                <Button onClick={addCondition} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Condition
                </Button>
              </div>

              {formData.conditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conditions added yet</p>
                  <p className="text-sm">Add conditions to define when this rule applies</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.conditions.map((condition, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={condition.type}
                              onValueChange={(value) => updateCondition(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weight">Weight</SelectItem>
                                <SelectItem value="distance">Distance</SelectItem>
                                <SelectItem value="volume">Volume</SelectItem>
                                <SelectItem value="value">Value</SelectItem>
                                <SelectItem value="destination">Destination</SelectItem>
                                <SelectItem value="service_type">Service Type</SelectItem>
                                <SelectItem value="customer_tier">Customer Tier</SelectItem>
                                <SelectItem value="time">Time</SelectItem>
                                <SelectItem value="quantity">Quantity</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) => updateCondition(index, 'operator', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="between">Between</SelectItem>
                                <SelectItem value="in">In</SelectItem>
                                <SelectItem value="not_in">Not In</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              value={condition.value}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Action</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeCondition(index)}
                              className="w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Actions</h4>
                <Button onClick={addAction} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Action
                </Button>
              </div>

              {formData.actions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No actions added yet</p>
                  <p className="text-sm">Add actions to define what happens when conditions are met</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.actions.map((action, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={action.type}
                              onValueChange={(value) => updateAction(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed_price">Fixed Price</SelectItem>
                                <SelectItem value="percentage_discount">Percentage Discount</SelectItem>
                                <SelectItem value="fixed_discount">Fixed Discount</SelectItem>
                                <SelectItem value="markup">Markup</SelectItem>
                                <SelectItem value="tier_pricing">Tier Pricing</SelectItem>
                                <SelectItem value="dynamic_pricing">Dynamic Pricing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              type="number"
                              value={action.value}
                              onChange={(e) => updateAction(index, 'value', parseFloat(e.target.value) || 0)}
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Target</Label>
                            <Select
                              value={action.target}
                              onValueChange={(value) => updateAction(index, 'target', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="base_price">Base Price</SelectItem>
                                <SelectItem value="shipping_cost">Shipping Cost</SelectItem>
                                <SelectItem value="total_cost">Total Cost</SelectItem>
                                <SelectItem value="margin">Margin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Action</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeAction(index)}
                              className="w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedRule(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={isCreateDialogOpen ? handleCreateRule : handleUpdateRule}>
              {isCreateDialogOpen ? 'Create Rule' : 'Update Rule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Rule Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Pricing Rule</DialogTitle>
            <DialogDescription>
              Enter test parameters to see how the pricing rule would apply
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={testData.weight}
                  onChange={(e) => setTestData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  value={testData.distance}
                  onChange={(e) => setTestData(prev => ({ ...prev, distance: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Base Cost (₹)</Label>
                <Input
                  type="number"
                  value={testData.baseCost}
                  onChange={(e) => setTestData(prev => ({ ...prev, baseCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Tier</Label>
                <Select
                  value={testData.customerTier}
                  onValueChange={(value) => setTestData(prev => ({ ...prev, customerTier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {testResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">Original Price</Label>
                        <p className="text-2xl font-bold">₹{testResult.originalPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Final Price</Label>
                        <p className="text-2xl font-bold text-green-600">₹{testResult.finalPrice.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Applied Rules</h4>
                      {testResult.appliedRules.length === 0 ? (
                        <p className="text-gray-500">No rules applied</p>
                      ) : (
                        <div className="space-y-2">
                          {testResult.appliedRules.map((rule, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{rule.ruleName}</span>
                              <span className={`font-medium ${rule.discount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {rule.discount > 0 ? '-' : '+'}₹{Math.abs(rule.discount).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Base Cost:</span>
                          <span>₹{testResult.breakdown.baseCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Discounts:</span>
                          <span>-₹{testResult.breakdown.discounts.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Markups:</span>
                          <span>+₹{testResult.breakdown.markups.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Final Cost:</span>
                          <span>₹{testResult.breakdown.finalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedPricingRulesManager;