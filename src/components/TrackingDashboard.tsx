import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrackingTimeline } from './TrackingTimeline';
import { Search, RefreshCw, Package, Truck, CheckCircle, Clock } from 'lucide-react';

interface TrackingData {
  boxId: string;
  boxNumber: string;
  awbNumber: string;
  status: string;
  weight?: number;
  shipment: {
    id: string;
    brand: { id: string; name: string; email: string };
    serviceCenter: { id: string; name: string; email: string };
    status: string;
  };
  parts: Array<{
    id: string;
    code: string;
    name: string;
    weight?: number;
    quantity: number;
  }>;
  currentTracking?: {
    status: string;
    location?: string;
    timestamp: string;
    description?: string;
    scanCode?: string;
  };
  trackingHistory: Array<{
    status: string;
    location?: string;
    timestamp: string;
    description?: string;
    scanCode?: string;
  }>;
}

interface TrackingDashboardProps {
  userId: string;
  userRole: 'BRAND' | 'SERVICE_CENTER' | 'CUSTOMER' | 'SUPER_ADMIN';
  title?: string;
}

export const TrackingDashboard: React.FC<TrackingDashboardProps> = ({
  userId,
  userRole,
  title = 'Shipment Tracking'
}) => {
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTracking, setSelectedTracking] = useState<TrackingData | null>(null);

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tracking/get-tracking?userId=${userId}&role=${userRole}`);
      const result = await response.json();
      
      if (result.success) {
        setTrackingData(result.data);
      } else {
        console.error('Failed to fetch tracking data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchByAWB = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tracking/get-tracking?awbNumber=${searchTerm}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        setSelectedTracking(result.data[0]);
      } else {
        alert('No tracking information found for this AWB number');
      }
    } catch (error) {
      console.error('Error searching tracking data:', error);
      alert('Error searching for tracking information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [userId, userRole]);

  const filteredData = trackingData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.awbNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.boxNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusStats = () => {
    const stats = trackingData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: trackingData.length,
      pending: stats.PENDING || 0,
      inTransit: stats.IN_TRANSIT || 0,
      delivered: stats.DELIVERED || 0
    };
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button 
          onClick={fetchTrackingData} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">{stats.inTransit}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Shipment List</TabsTrigger>
          <TabsTrigger value="search">Track by AWB</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by AWB or Box Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shipment List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading tracking data...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No shipments found</p>
                </CardContent>
              </Card>
            ) : (
              filteredData.map((item) => (
                <Card key={item.boxId} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">Box #{item.boxNumber}</h4>
                        <p className="text-sm text-muted-foreground">
                          AWB: {item.awbNumber || 'Not assigned'}
                        </p>
                      </div>
                      <Badge className={
                        item.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        item.status === 'IN_TRANSIT' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Brand:</strong> {item.shipment.brand.name}</p>
                        <p><strong>Service Center:</strong> {item.shipment.serviceCenter.name}</p>
                      </div>
                      <div>
                        {item.currentTracking && (
                          <>
                            <p><strong>Current Status:</strong> {item.currentTracking.status}</p>
                            {item.currentTracking.location && (
                              <p><strong>Location:</strong> {item.currentTracking.location}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedTracking(item)}
                      >
                        View Timeline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Track by AWB Number</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter AWB number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchByAWB()}
                />
                <Button onClick={searchByAWB} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Track
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tracking Timeline Modal/Sidebar */}
      {selectedTracking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tracking Details</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedTracking(null)}
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <TrackingTimeline
                awbNumber={selectedTracking.awbNumber || 'N/A'}
                currentStatus={selectedTracking.currentTracking?.status || selectedTracking.status}
                trackingHistory={selectedTracking.trackingHistory}
                boxNumber={selectedTracking.boxNumber}
                parts={selectedTracking.parts}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingDashboard;