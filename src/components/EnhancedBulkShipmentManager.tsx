'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Plus, 
  Trash2, 
  Calculator, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Truck,
  Shield,
  CreditCard,
  FileText,
  Users,
  Building2,
  User
} from 'lucide-react';

interface Part {
  id: string;
  code: string;
  name: string;
  price: number;
  weight: number;
  stockQuantity: number;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
  address?: any;
}

interface ShipmentItem {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientType: 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  parts: Array<{
    partId: string;
    quantity: number;
  }>;
  boxes: Array<{
    parts: Array<{
      partId: string;
      quantity: number;
    }>;
    dimensions: {
      length: number;
      breadth: number;
      height: number;
    };
  }>;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string;
  returnReason?: 'DEFECTIVE' | 'EXCESS' | 'WARRANTY_RETURN' | 'WRONG_PART';
  insuranceRequired?: boolean;
  declaredValue?: number;
  costBreakdown?: any;
  classification?: any;
  payerAssignment?: any;
}

interface CostSummary {
  shipments: Array<{
    shipment_id: string;
    recipient_name: string;
    base_cost: number;
    weight_cost: number;
    surcharge_cost: number;
    markup_cost: number;
    insurance_cost: number;
    total_cost: number;
    payer: string;
  }>;
  cost_by_payer: {
    BRAND: number;
    SERVICE_CENTER: number;
    DISTRIBUTOR: number;
    CUSTOMER: number;
  };
  grand_total: number;
  total_shipments: number;
}

export default function EnhancedBulkShipmentManager() {
  const [parts, setParts] = useState<Part[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('shipments');

  // Load initial data
  useEffect(() => {
    loadParts();
    loadRecipients();
  }, []);

  const loadParts = async () => {
    try {
      const response = await fetch('/api/parts');
      if (response.ok) {
        const data = await response.json();
        setParts(data.parts || []);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
    }
  };

  const loadRecipients = async () => {
    try {
      // Load service centers
      const scResponse = await fetch('/api/brand/authorized-service-centers');
      const scData = scResponse.ok ? await scResponse.json() : { serviceCenters: [] };
      
      // Load distributors
      const distResponse = await fetch('/api/brand/authorized-distributors');
      const distData = distResponse.ok ? await distResponse.json() : { distributors: [] };

      const allRecipients = [
        ...scData.serviceCenters.map((sc: any) => ({
          id: sc.id,
          name: sc.name,
          email: sc.email,
          role: 'SERVICE_CENTER',
          address: sc.serviceCenterProfile?.addresses?.[0]
        })),
        ...distData.distributors.map((dist: any) => ({
          id: dist.id,
          name: dist.name,
          email: dist.email,
          role: 'DISTRIBUTOR',
          address: dist.distributorProfile?.address
        }))
      ];

      setRecipients(allRecipients);
    } catch (error) {
      console.error('Failed to load recipients:', error);
    }
  };

  const addShipment = () => {
    const newShipment: ShipmentItem = {
      id: `shipment_${Date.now()}`,
      recipientId: '',
      recipientName: '',
      recipientType: 'SERVICE_CENTER',
      parts: [],
      boxes: [],
      priority: 'MEDIUM'
    };
    setShipments([...shipments, newShipment]);
  };

  const removeShipment = (shipmentId: string) => {
    setShipments(shipments.filter(s => s.id !== shipmentId));
    setCostSummary(null);
  };

  const updateShipment = (shipmentId: string, updates: Partial<ShipmentItem>) => {
    setShipments(shipments.map(s => 
      s.id === shipmentId ? { ...s, ...updates } : s
    ));
    setCostSummary(null);
  };

  const addPartToShipment = (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      const newPart = { partId: '', quantity: 1 };
      updateShipment(shipmentId, {
        parts: [...shipment.parts, newPart]
      });
    }
  };

  const updateShipmentPart = (shipmentId: string, partIndex: number, updates: any) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      const updatedParts = [...shipment.parts];
      updatedParts[partIndex] = { ...updatedParts[partIndex], ...updates };
      updateShipment(shipmentId, { parts: updatedParts });
    }
  };

  const removePartFromShipment = (shipmentId: string, partIndex: number) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      const updatedParts = shipment.parts.filter((_, index) => index !== partIndex);
      updateShipment(shipmentId, { parts: updatedParts });
    }
  };

  const autoAllocateBoxes = (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment || shipment.parts.length === 0) return;

    // Simple auto-allocation: one box per shipment with all parts
    const boxes = [{
      parts: shipment.parts.map(p => ({ partId: p.partId, quantity: p.quantity })),
      dimensions: {
        length: 30,
        breadth: 20,
        height: 15
      }
    }];

    updateShipment(shipmentId, { boxes });
  };

  const calculateCosts = async () => {
    if (shipments.length === 0) {
      setError('No shipments to calculate');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const response = await fetch('/api/shipments/bulk-cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipments })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate costs');
      }

      const data = await response.json();
      setCostSummary(data.costSummary);
      
      // Update shipments with cost breakdowns
      if (data.shipmentsWithCosts) {
        setShipments(data.shipmentsWithCosts);
      }

      setActiveTab('costs');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to calculate costs');
    } finally {
      setCalculating(false);
    }
  };

  const downloadCostSummaryCSV = () => {
    if (!costSummary) return;

    const headers = [
      'Shipment ID',
      'Recipient Name',
      'Base Cost',
      'Weight Cost',
      'Surcharge Cost',
      'Markup Cost',
      'Insurance Cost',
      'Total Cost',
      'Payer'
    ];

    const rows = costSummary.shipments.map(shipment => [
      shipment.shipment_id,
      shipment.recipient_name,
      shipment.base_cost.toFixed(2),
      shipment.weight_cost.toFixed(2),
      shipment.surcharge_cost.toFixed(2),
      shipment.markup_cost.toFixed(2),
      shipment.insurance_cost.toFixed(2),
      shipment.total_cost.toFixed(2),
      shipment.payer
    ]);

    // Add summary rows
    rows.push([]);
    rows.push(['COST SUMMARY BY PAYER']);
    rows.push(['Brand Total', '', '', '', '', '', '', costSummary.cost_by_payer.BRAND.toFixed(2), 'BRAND']);
    rows.push(['Service Center Total', '', '', '', '', '', '', costSummary.cost_by_payer.SERVICE_CENTER.toFixed(2), 'SERVICE_CENTER']);
    rows.push(['Distributor Total', '', '', '', '', '', '', costSummary.cost_by_payer.DISTRIBUTOR.toFixed(2), 'DISTRIBUTOR']);
    rows.push(['Customer Total', '', '', '', '', '', '', costSummary.cost_by_payer.CUSTOMER.toFixed(2), 'CUSTOMER']);
    rows.push([]);
    rows.push(['GRAND TOTAL', '', '', '', '', '', '', costSummary.grand_total.toFixed(2), 'ALL']);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-shipment-costs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const createBulkShipments = async () => {
    if (shipments.length === 0) {
      setError('No shipments to create');
      return;
    }

    if (!costSummary) {
      setError('Please calculate costs first');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/shipments/create-bulk-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipments })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create shipments');
      }

      const data = await response.json();
      setSuccess(`Successfully created ${data.successCount} shipments`);
      
      // Reset form
      setShipments([]);
      setCostSummary(null);
      setActiveTab('shipments');

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create shipments');
    } finally {
      setCreating(false);
    }
  };

  const getPayerIcon = (payer: string) => {
    switch (payer) {
      case 'BRAND': return <Building2 className="h-4 w-4" />;
      case 'SERVICE_CENTER': return <Users className="h-4 w-4" />;
      case 'DISTRIBUTOR': return <Truck className="h-4 w-4" />;
      case 'CUSTOMER': return <User className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPayerColor = (payer: string) => {
    switch (payer) {
      case 'BRAND': return 'bg-blue-100 text-blue-800';
      case 'SERVICE_CENTER': return 'bg-green-100 text-green-800';
      case 'DISTRIBUTOR': return 'bg-purple-100 text-purple-800';
      case 'CUSTOMER': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Enhanced Bulk Shipment Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="shipments">Shipments ({shipments.length})</TabsTrigger>
              <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
              <TabsTrigger value="summary">Summary & Create</TabsTrigger>
            </TabsList>

            <TabsContent value="shipments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Configure Shipments</h3>
                <Button onClick={addShipment} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Shipment
                </Button>
              </div>

              {shipments.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No shipments configured. Click "Add Shipment" to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {shipments.map((shipment, index) => (
                    <Card key={shipment.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">Shipment #{index + 1}</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeShipment(shipment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Recipient Selection */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Recipient Type</Label>
                            <Select
                              value={shipment.recipientType}
                              onValueChange={(value: any) => updateShipment(shipment.id, { recipientType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                                <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                                <SelectItem value="CUSTOMER">Customer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Recipient</Label>
                            <Select
                              value={shipment.recipientId}
                              onValueChange={(value) => {
                                const recipient = recipients.find(r => r.id === value);
                                updateShipment(shipment.id, {
                                  recipientId: value,
                                  recipientName: recipient?.name || ''
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select recipient" />
                              </SelectTrigger>
                              <SelectContent>
                                {recipients
                                  .filter(r => r.role === shipment.recipientType)
                                  .map(recipient => (
                                    <SelectItem key={recipient.id} value={recipient.id}>
                                      {recipient.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Priority and Options */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Priority</Label>
                            <Select
                              value={shipment.priority}
                              onValueChange={(value: any) => updateShipment(shipment.id, { priority: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Declared Value (₹)</Label>
                            <Input
                              type="number"
                              placeholder="Auto-calculated"
                              value={shipment.declaredValue || ''}
                              onChange={(e) => updateShipment(shipment.id, {
                                declaredValue: e.target.value ? parseFloat(e.target.value) : undefined
                              })}
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Checkbox
                              id={`insurance-${shipment.id}`}
                              checked={shipment.insuranceRequired || false}
                              onCheckedChange={(checked) => updateShipment(shipment.id, {
                                insuranceRequired: checked as boolean
                              })}
                            />
                            <Label htmlFor={`insurance-${shipment.id}`} className="flex items-center gap-1">
                              <Shield className="h-4 w-4" />
                              Insurance
                            </Label>
                          </div>
                        </div>

                        {/* Parts Selection */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label>Parts</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addPartToShipment(shipment.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Part
                            </Button>
                          </div>
                          
                          {shipment.parts.length === 0 ? (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>No parts added to this shipment.</AlertDescription>
                            </Alert>
                          ) : (
                            <div className="space-y-2">
                              {shipment.parts.map((part, partIndex) => (
                                <div key={partIndex} className="flex gap-2 items-center">
                                  <Select
                                    value={part.partId}
                                    onValueChange={(value) => updateShipmentPart(shipment.id, partIndex, { partId: value })}
                                  >
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Select part" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {parts.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.code} - {p.name} (₹{p.price})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    placeholder="Qty"
                                    value={part.quantity}
                                    onChange={(e) => updateShipmentPart(shipment.id, partIndex, {
                                      quantity: parseInt(e.target.value) || 1
                                    })}
                                    className="w-20"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removePartFromShipment(shipment.id, partIndex)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Box Allocation */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label>Box Allocation</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => autoAllocateBoxes(shipment.id)}
                              disabled={shipment.parts.length === 0}
                            >
                              Auto Allocate
                            </Button>
                          </div>
                          
                          {shipment.boxes.length === 0 ? (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No boxes allocated. Click "Auto Allocate" to automatically create boxes.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <div className="text-sm text-gray-600">
                              {shipment.boxes.length} box(es) allocated
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        <div>
                          <Label>Notes</Label>
                          <Input
                            placeholder="Optional notes for this shipment"
                            value={shipment.notes || ''}
                            onChange={(e) => updateShipment(shipment.id, { notes: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {shipments.length > 0 && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={calculateCosts}
                    disabled={calculating}
                    className="flex items-center gap-2"
                  >
                    <Calculator className="h-4 w-4" />
                    {calculating ? 'Calculating...' : 'Calculate Costs'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              {!costSummary ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No cost breakdown available. Please calculate costs first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Cost Breakdown</h3>
                    <Button
                      onClick={downloadCostSummaryCSV}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>

                  {/* Cost Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-600">Brand Pays</p>
                            <p className="text-lg font-semibold">₹{costSummary.cost_by_payer.BRAND.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-600">Service Centers Pay</p>
                            <p className="text-lg font-semibold">₹{costSummary.cost_by_payer.SERVICE_CENTER.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-purple-600" />
                          <div>
                            <p className="text-sm text-gray-600">Distributors Pay</p>
                            <p className="text-lg font-semibold">₹{costSummary.cost_by_payer.DISTRIBUTOR.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-orange-600" />
                          <div>
                            <p className="text-sm text-gray-600">Customers Pay</p>
                            <p className="text-lg font-semibold">₹{costSummary.cost_by_payer.CUSTOMER.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Breakdown Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Cost Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Recipient</th>
                              <th className="text-right p-2">Base</th>
                              <th className="text-right p-2">Weight</th>
                              <th className="text-right p-2">Surcharge</th>
                              <th className="text-right p-2">Markup</th>
                              <th className="text-right p-2">Insurance</th>
                              <th className="text-right p-2">Total</th>
                              <th className="text-center p-2">Payer</th>
                            </tr>
                          </thead>
                          <tbody>
                            {costSummary.shipments.map((shipment, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-2 font-medium">{shipment.recipient_name}</td>
                                <td className="text-right p-2">₹{shipment.base_cost.toFixed(2)}</td>
                                <td className="text-right p-2">₹{shipment.weight_cost.toFixed(2)}</td>
                                <td className="text-right p-2">₹{shipment.surcharge_cost.toFixed(2)}</td>
                                <td className="text-right p-2">₹{shipment.markup_cost.toFixed(2)}</td>
                                <td className="text-right p-2">₹{shipment.insurance_cost.toFixed(2)}</td>
                                <td className="text-right p-2 font-semibold">₹{shipment.total_cost.toFixed(2)}</td>
                                <td className="text-center p-2">
                                  <Badge className={`${getPayerColor(shipment.payer)} flex items-center gap-1 w-fit mx-auto`}>
                                    {getPayerIcon(shipment.payer)}
                                    {shipment.payer}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 font-semibold">
                              <td className="p-2">TOTAL</td>
                              <td className="text-right p-2">₹{costSummary.shipments.reduce((sum, s) => sum + s.base_cost, 0).toFixed(2)}</td>
                              <td className="text-right p-2">₹{costSummary.shipments.reduce((sum, s) => sum + s.weight_cost, 0).toFixed(2)}</td>
                              <td className="text-right p-2">₹{costSummary.shipments.reduce((sum, s) => sum + s.surcharge_cost, 0).toFixed(2)}</td>
                              <td className="text-right p-2">₹{costSummary.shipments.reduce((sum, s) => sum + s.markup_cost, 0).toFixed(2)}</td>
                              <td className="text-right p-2">₹{costSummary.shipments.reduce((sum, s) => sum + s.insurance_cost, 0).toFixed(2)}</td>
                              <td className="text-right p-2 text-lg">₹{costSummary.grand_total.toFixed(2)}</td>
                              <td className="text-center p-2">-</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Summary & Create Shipments</h3>

                {!costSummary ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please configure shipments and calculate costs before creating.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{costSummary.total_shipments}</p>
                            <p className="text-sm text-gray-600">Total Shipments</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">₹{costSummary.grand_total.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">Total Cost</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">
                              {Object.values(costSummary.cost_by_payer).filter(cost => cost > 0).length}
                            </p>
                            <p className="text-sm text-gray-600">Payers Involved</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-600">
                              ₹{(costSummary.grand_total / costSummary.total_shipments).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">Avg Cost/Shipment</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-center">
                      <Button
                        onClick={createBulkShipments}
                        disabled={creating}
                        size="lg"
                        className="flex items-center gap-2"
                      >
                        <Package className="h-5 w-5" />
                        {creating ? 'Creating Shipments...' : `Create ${costSummary.total_shipments} Shipments`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}