// Enhanced Reverse Shipment Tracking Component
// Displays comprehensive tracking information for return requests with cost details

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  IndianRupee,
  Eye,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface ReverseRequest {
  id: string;
  serviceCenterId: string;
  partId: string;
  reason: string;
  returnReason: string | null;
  costResponsibility: string | null;
  courierCost: number | null;
  paidBy: string | null;
  quantity: number;
  status: string;
  awbNumber: string | null;
  createdAt: string;
  updatedAt: string;
  serviceCenter: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  part: {
    id: string;
    name: string;
    code: string;
    weight: number | null;
    brand: {
      id: string;
      name: string;
    };
  };
}

interface ReverseShipmentTrackerProps {
  userRole: 'SUPER_ADMIN' | 'BRAND' | 'SERVICE_CENTER';
  userId?: string;
  brandId?: string;
  serviceCenterId?: string;
}

const ReverseShipmentTracker: React.FC<ReverseShipmentTrackerProps> = ({
  userRole,
  userId,
  brandId,
  serviceCenterId
}) => {
  const [reverseRequests, setReverseRequests] = useState<ReverseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReverseRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCostResponsibility, setFilterCostResponsibility] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PICKED': return 'bg-purple-100 text-purple-800';
      case 'RECEIVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Cost responsibility color mapping
  const getCostResponsibilityColor = (responsibility: string | null) => {
    switch (responsibility) {
      case 'BRAND': return 'bg-green-100 text-green-800';
      case 'SERVICE_CENTER': return 'bg-orange-100 text-orange-800';
      case 'CUSTOMER': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch reverse requests
  const fetchReverseRequests = async () => {
    try {
      setLoading(true);
      let url = '/api/reverse-requests';
      const params = new URLSearchParams();
      
      if (brandId) params.append('brandId', brandId);
      if (serviceCenterId) params.append('serviceCenterId', serviceCenterId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reverse requests');
      
      const data = await response.json();
      setReverseRequests(data);
    } catch (error) {
      console.error('Error fetching reverse requests:', error);
      toast.error('Failed to fetch reverse requests');
    } finally {
      setLoading(false);
    }
  };

  // Process courier payment
  const processCourierPayment = async (requestId: string, courierCost: number) => {
    try {
      const response = await fetch('/api/reverse-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          courierCost: courierCost,
          status: 'APPROVED'
        })
      });

      if (!response.ok) throw new Error('Failed to process payment');
      
      toast.success('Courier payment processed successfully');
      fetchReverseRequests();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process courier payment');
    }
  };

  // Update AWB number
  const updateAWBNumber = async (requestId: string, awbNumber: string) => {
    try {
      const response = await fetch('/api/reverse-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          awbNumber: awbNumber,
          status: 'PICKED'
        })
      });

      if (!response.ok) throw new Error('Failed to update AWB');
      
      toast.success('AWB number updated successfully');
      fetchReverseRequests();
    } catch (error) {
      console.error('Error updating AWB:', error);
      toast.error('Failed to update AWB number');
    }
  };

  // Filter requests
  const filteredRequests = reverseRequests.filter(request => {
    const matchesStatus = filterStatus === 'ALL' || request.status === filterStatus;
    const matchesCostResponsibility = filterCostResponsibility === 'ALL' || 
      request.costResponsibility === filterCostResponsibility;
    const matchesSearch = searchTerm === '' || 
      request.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.serviceCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.awbNumber && request.awbNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesCostResponsibility && matchesSearch;
  });

  useEffect(() => {
    fetchReverseRequests();
  }, [brandId, serviceCenterId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading reverse shipments...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Reverse Shipment Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by part, AWB, or service center..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="REQUESTED">Requested</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PICKED">Picked</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cost-filter">Cost Responsibility</Label>
              <Select value={filterCostResponsibility} onValueChange={setFilterCostResponsibility}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="BRAND">Brand</SelectItem>
                  <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReverseRequests} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Returns</p>
                    <p className="text-2xl font-bold">{filteredRequests.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Transit</p>
                    <p className="text-2xl font-bold">
                      {filteredRequests.filter(r => r.status === 'PICKED').length}
                    </p>
                  </div>
                  <Truck className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">
                      {filteredRequests.filter(r => r.status === 'RECEIVED').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">
                      ₹{filteredRequests.reduce((sum, r) => sum + (r.courierCost || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <IndianRupee className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requests Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Details</TableHead>
                  <TableHead>Service Center</TableHead>
                  <TableHead>Return Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost Responsibility</TableHead>
                  <TableHead>Courier Cost</TableHead>
                  <TableHead>AWB Number</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.part.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.part.code} • Qty: {request.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Brand: {request.part.brand.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.serviceCenter.name}</p>
                        <p className="text-sm text-muted-foreground">{request.serviceCenter.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{request.returnReason || 'Not specified'}</p>
                        <p className="text-xs text-muted-foreground">{request.reason}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCostResponsibilityColor(request.costResponsibility)}>
                        {request.costResponsibility?.replace('_', ' ') || 'Not set'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.courierCost ? (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          {request.courierCost.toFixed(2)}
                          {request.paidBy && (
                            <p className="text-xs text-muted-foreground">
                              Paid by {request.paidBy.replace('_', ' ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not calculated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.awbNumber ? (
                        <div>
                          <p className="font-mono text-sm">{request.awbNumber}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1"
                            onClick={() => window.open(`https://www.dtdc.in/tracking.asp?strTrackNo=${request.awbNumber}`, '_blank')}
                          >
                            Track
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Return Request Details</DialogTitle>
                          </DialogHeader>
                          {selectedRequest && (
                            <ReverseRequestDetails
                              request={selectedRequest}
                              userRole={userRole}
                              onUpdate={fetchReverseRequests}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reverse requests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Detailed view component for individual reverse requests
const ReverseRequestDetails: React.FC<{
  request: ReverseRequest;
  userRole: string;
  onUpdate: () => void;
}> = ({ request, userRole, onUpdate }) => {
  const [awbNumber, setAwbNumber] = useState(request.awbNumber || '');
  const [courierCost, setCourierCost] = useState(request.courierCost?.toString() || '');

  const handleUpdateAWB = async () => {
    if (!awbNumber.trim()) {
      toast.error('Please enter AWB number');
      return;
    }

    try {
      const response = await fetch('/api/reverse-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          awbNumber: awbNumber.trim(),
          status: 'PICKED'
        })
      });

      if (!response.ok) throw new Error('Failed to update AWB');
      
      toast.success('AWB number updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error updating AWB:', error);
      toast.error('Failed to update AWB number');
    }
  };

  const handleProcessPayment = async () => {
    const cost = parseFloat(courierCost);
    if (isNaN(cost) || cost <= 0) {
      toast.error('Please enter valid courier cost');
      return;
    }

    try {
      const response = await fetch('/api/reverse-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          courierCost: cost,
          paidBy: request.costResponsibility,
          status: 'APPROVED'
        })
      });

      if (!response.ok) throw new Error('Failed to process payment');
      
      toast.success('Payment processed successfully');
      onUpdate();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Part Name</Label>
              <p className="font-medium">{request.part.name}</p>
            </div>
            <div>
              <Label>Part Code</Label>
              <p className="font-medium">{request.part.code}</p>
            </div>
            <div>
              <Label>Brand</Label>
              <p className="font-medium">{request.part.brand.name}</p>
            </div>
            <div>
              <Label>Quantity</Label>
              <p className="font-medium">{request.quantity}</p>
            </div>
            <div>
              <Label>Service Center</Label>
              <p className="font-medium">{request.serviceCenter.name}</p>
            </div>
            <div>
              <Label>Return Reason</Label>
              <Badge className={getCostResponsibilityColor(request.costResponsibility)}>
                {request.returnReason || 'Not specified'}
              </Badge>
            </div>
          </div>
          <div>
            <Label>Reason for Return</Label>
            <p className="text-sm text-muted-foreground">{request.reason}</p>
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="awb">AWB Number</Label>
              <div className="flex gap-2">
                <Input
                  id="awb"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  placeholder="Enter AWB number"
                />
                {(userRole === 'SUPER_ADMIN' || userRole === 'BRAND') && (
                  <Button onClick={handleUpdateAWB}>Update</Button>
                )}
              </div>
            </div>
            
            {request.awbNumber && (
              <div>
                <Button
                  onClick={() => window.open(`https://www.dtdc.in/tracking.asp?strTrackNo=${request.awbNumber}`, '_blank')}
                  className="w-full"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Track on DTDC
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cost responsibility: <strong>{request.costResponsibility?.replace('_', ' ')}</strong>
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="cost">Courier Cost (₹)</Label>
              <div className="flex gap-2">
                <Input
                  id="cost"
                  type="number"
                  value={courierCost}
                  onChange={(e) => setCourierCost(e.target.value)}
                  placeholder="Enter courier cost"
                />
                {(userRole === 'SUPER_ADMIN' || userRole === 'BRAND') && !request.courierCost && (
                  <Button onClick={handleProcessPayment}>Process Payment</Button>
                )}
              </div>
            </div>

            {request.courierCost && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Payment Processed</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Amount: ₹{request.courierCost.toFixed(2)} • Paid by: {request.paidBy?.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReverseShipmentTracker;