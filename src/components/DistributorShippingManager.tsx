// Distributor to Service Center Shipping Manager
// Enables distributors to ship parts directly to service centers with automatic cost deduction

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Truck, 
  IndianRupee, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Send,
  Calculator,
  MapPin,
  Weight,
  Box,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  serviceCenterId: string;
  serviceCenterName: string;
  serviceCenterEmail: string;
  serviceCenterPhone: string;
  brandId: string;
  brandName: string;
  totalAmount: number;
  status: 'DRAFT' | 'APPROVED' | 'DISPATCHED';
  items: PurchaseOrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  createdAt: string;
  requiredBy: string;
}

interface PurchaseOrderItem {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight: number;
}

interface ShippingEstimate {
  baseRate: number;
  weightCharge: number;
  totalCost: number;
  serviceCenterWalletBalance: number;
  canProceed: boolean;
  shortfall?: number;
}

interface ShipmentDetails {
  orderId: string;
  packageWeight: number;
  numberOfBoxes: number;
  pincode: string;
  courierCost: number;
  awbNumber?: string;
  trackingUrl?: string;
}

const DistributorShippingManager: React.FC = () => {
  const [approvedOrders, setApprovedOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Shipping form state
  const [packageWeight, setPackageWeight] = useState<number>(0);
  const [numberOfBoxes, setNumberOfBoxes] = useState<number>(1);
  const [pincode, setPincode] = useState<string>('');

  // Load approved purchase orders
  const fetchApprovedOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/orders?status=APPROVED');
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setApprovedOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching approved orders:', error);
      toast.error('Failed to fetch approved orders');
    } finally {
      setLoading(false);
    }
  };

  // Calculate shipping estimate
  const calculateShippingCost = async () => {
    if (!selectedOrder || !packageWeight || !pincode) {
      toast.error('Please fill all shipping details');
      return;
    }

    try {
      setEstimating(true);
      const response = await fetch('/api/distributor/shipping/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCenterId: selectedOrder.serviceCenterId,
          weight: packageWeight,
          boxes: numberOfBoxes,
          pincode: pincode
        })
      });

      if (!response.ok) throw new Error('Failed to calculate shipping cost');
      
      const estimate = await response.json();
      setShippingEstimate(estimate);
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      toast.error('Failed to calculate shipping cost');
    } finally {
      setEstimating(false);
    }
  };

  // Process shipment
  const processShipment = async () => {
    if (!selectedOrder || !shippingEstimate || !shippingEstimate.canProceed) {
      toast.error('Cannot proceed with shipment');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/distributor/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          packageWeight,
          numberOfBoxes,
          pincode,
          courierCost: shippingEstimate.totalCost
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create shipment');
      }
      
      const result = await response.json();
      
      toast.success('Shipment created successfully!', {
        description: `AWB: ${result.awbNumber} | Cost: ₹${shippingEstimate.totalCost}`
      });

      setShowShippingDialog(false);
      setSelectedOrder(null);
      setShippingEstimate(null);
      fetchApprovedOrders();
      
    } catch (error) {
      console.error('Error processing shipment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process shipment');
    } finally {
      setProcessing(false);
    }
  };

  // Auto-calculate weight from order items
  const calculateTotalWeight = (order: PurchaseOrder): number => {
    return order.items.reduce((total, item) => {
      return total + (item.weight * item.quantity);
    }, 0);
  };

  // Handle order selection for shipping
  const handleShipOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    const estimatedWeight = calculateTotalWeight(order);
    setPackageWeight(estimatedWeight);
    setPincode(order.shippingAddress.pincode);
    setNumberOfBoxes(Math.ceil(order.items.length / 5)); // Estimate boxes based on items
    setShippingEstimate(null);
    setShowShippingDialog(true);
  };

  useEffect(() => {
    fetchApprovedOrders();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading approved orders...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Distributor Shipping Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ship approved orders directly to service centers via DTDC
          </p>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ready to Ship</p>
                    <p className="text-2xl font-bold">{approvedOrders.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">
                      ₹{approvedOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}
                    </p>
                  </div>
                  <IndianRupee className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Weight</p>
                    <p className="text-2xl font-bold">
                      {approvedOrders.length > 0 
                        ? (approvedOrders.reduce((sum, order) => sum + calculateTotalWeight(order), 0) / approvedOrders.length).toFixed(1)
                        : '0'
                      } kg
                    </p>
                  </div>
                  <Weight className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Service Center</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.serviceCenterName}</p>
                        <p className="text-sm text-muted-foreground">{order.serviceCenterEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.brandName}</TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell>{calculateTotalWeight(order).toFixed(1)} kg</TableCell>
                    <TableCell>₹{order.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {order.shippingAddress.city}, {order.shippingAddress.state}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {order.shippingAddress.pincode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleShipOrder(order)}
                          className="flex items-center gap-1"
                        >
                          <Truck className="h-4 w-4" />
                          Ship via DTDC
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {approvedOrders.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No approved orders ready for shipping</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Dialog */}
      <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create DTDC Shipment</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Order: {selectedOrder?.orderNumber} → {selectedOrder?.serviceCenterName}
            </p>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Service Center</p>
                      <p className="font-medium">{selectedOrder.serviceCenterName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Items</p>
                      <p className="font-medium">{selectedOrder.items.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order Value</p>
                      <p className="font-medium">₹{selectedOrder.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Destination</p>
                      <p className="font-medium">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Details Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipping Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weight">Package Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={packageWeight}
                        onChange={(e) => setPackageWeight(parseFloat(e.target.value) || 0)}
                        placeholder="Enter total weight"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Estimated: {calculateTotalWeight(selectedOrder).toFixed(1)} kg
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="boxes">Number of Boxes</Label>
                      <Input
                        id="boxes"
                        type="number"
                        min="1"
                        value={numberOfBoxes}
                        onChange={(e) => setNumberOfBoxes(parseInt(e.target.value) || 1)}
                        placeholder="Number of packages"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="pincode">Destination Pincode</Label>
                    <Input
                      id="pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="Enter pincode"
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    onClick={calculateShippingCost}
                    disabled={estimating || !packageWeight || !pincode}
                    className="w-full"
                  >
                    {estimating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculate Shipping Cost
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Shipping Estimate */}
              {shippingEstimate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipping Cost Estimate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Base Rate</p>
                          <p className="font-medium">₹{shippingEstimate.baseRate.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Weight Charge</p>
                          <p className="font-medium">₹{shippingEstimate.weightCharge.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total Courier Cost:</span>
                        <span className="text-xl font-bold">₹{shippingEstimate.totalCost.toFixed(2)}</span>
                      </div>

                      <Alert className={shippingEstimate.canProceed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p>
                              <strong>Service Center Wallet Balance:</strong> ₹{shippingEstimate.serviceCenterWalletBalance.toFixed(2)}
                            </p>
                            {shippingEstimate.canProceed ? (
                              <p className="text-green-700">
                                ✓ Sufficient balance available. Courier cost will be deducted from Service Center wallet.
                              </p>
                            ) : (
                              <p className="text-red-700">
                                ✗ Insufficient balance. Shortfall: ₹{shippingEstimate.shortfall?.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>

                      {shippingEstimate.canProceed && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="text-blue-700">
                              Ready to create secure shipment. AWB will be generated automatically after creation.
                            </p>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowShippingDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={processShipment}
                  disabled={!shippingEstimate?.canProceed || processing}
                >
                  {processing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Shipment...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Secure Shipment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DistributorShippingManager;