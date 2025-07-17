import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Filter, RefreshCw, TrendingUp, TrendingDown, DollarSign, Package, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MarginSummary {
  totalMargin: number;
  totalRevenue: number;
  totalCosts: number;
  averageMarginPercent: number;
  shipmentCount: number;
  brandBreakdown: BrandMarginSummary[];
}

interface BrandMarginSummary {
  brandName: string;
  totalMargin: number;
  totalRevenue: number;
  totalCosts: number;
  shipmentCount: number;
  averageMarginPercent: number;
}

interface MarginLog {
  id: string;
  customerPrice: number;
  dtdcCost: number;
  margin: number;
  marginPercent: number;
  awbNumber?: string;
  weight?: number;
  serviceType?: string;
  origin?: string;
  destination?: string;
  calculatedAt: string;
  notes?: string;
  brand: {
    name: string;
    email: string;
  };
  box?: {
    boxNumber: string;
    awbNumber?: string;
  };
  customerOrder?: {
    id: string;
    awbNumber?: string;
  };
}

interface LocationMarginData {
  location: string;
  totalMargin: number;
  totalRevenue: number;
  totalCosts: number;
  shipmentCount: number;
  averageMarginPercent: number;
}

interface DateRangeMarginData {
  date: string;
  totalMargin: number;
  totalRevenue: number;
  shipmentCount: number;
  averageMarginPercent: number;
}

export default function CourierMarginDashboard() {
  const [summary, setSummary] = useState<MarginSummary | null>(null);
  const [marginLogs, setMarginLogs] = useState<MarginLog[]>([]);
  const [locationData, setLocationData] = useState<LocationMarginData[]>([]);
  const [dateRangeData, setDateRangeData] = useState<DateRangeMarginData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Available brands for filter
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedBrand, startDate, endDate, selectedLocation, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch summary data
      const summaryParams = new URLSearchParams({
        action: 'summary',
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      });

      const summaryResponse = await fetch(`/api/admin/margin-analytics?${summaryParams}`);
      const summaryData = await summaryResponse.json();

      if (summaryData.success) {
        setSummary(summaryData.summary);
        
        // Extract unique brands for filter
        const uniqueBrands = summaryData.summary.brandBreakdown.map((brand: BrandMarginSummary) => ({
          id: brand.brandName,
          name: brand.brandName
        }));
        setBrands(uniqueBrands);
      }

      // Fetch detailed logs
      const logsParams = new URLSearchParams({
        action: 'logs',
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(selectedBrand !== 'all' && { brandId: selectedBrand }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      });

      const logsResponse = await fetch(`/api/admin/margin-analytics?${logsParams}`);
      const logsData = await logsResponse.json();

      if (logsData.success) {
        setMarginLogs(logsData.logs || []);
        
        // Process location data
        const locationMap = new Map<string, LocationMarginData>();
        logsData.logs?.forEach((log: MarginLog) => {
          const location = log.destination || 'Unknown';
          if (!locationMap.has(location)) {
            locationMap.set(location, {
              location,
              totalMargin: 0,
              totalRevenue: 0,
              totalCosts: 0,
              shipmentCount: 0,
              averageMarginPercent: 0
            });
          }
          const locationData = locationMap.get(location)!;
          locationData.totalMargin += log.margin;
          locationData.totalRevenue += log.customerPrice;
          locationData.totalCosts += log.dtdcCost;
          locationData.shipmentCount += 1;
        });

        // Calculate average margin percent for each location
        locationMap.forEach((data) => {
          const locationLogs = logsData.logs?.filter((log: MarginLog) => 
            (log.destination || 'Unknown') === data.location
          ) || [];
          data.averageMarginPercent = locationLogs.length > 0
            ? locationLogs.reduce((sum: number, log: MarginLog) => sum + log.marginPercent, 0) / locationLogs.length
            : 0;
        });

        setLocationData(Array.from(locationMap.values()).sort((a, b) => b.totalMargin - a.totalMargin));

        // Process date range data
        const dateMap = new Map<string, DateRangeMarginData>();
        logsData.logs?.forEach((log: MarginLog) => {
          const date = new Date(log.calculatedAt).toISOString().split('T')[0];
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalMargin: 0,
              totalRevenue: 0,
              shipmentCount: 0,
              averageMarginPercent: 0
            });
          }
          const dateData = dateMap.get(date)!;
          dateData.totalMargin += log.margin;
          dateData.totalRevenue += log.customerPrice;
          dateData.shipmentCount += 1;
        });

        // Calculate average margin percent for each date
        dateMap.forEach((data) => {
          const dateLogs = logsData.logs?.filter((log: MarginLog) => 
            new Date(log.calculatedAt).toISOString().split('T')[0] === data.date
          ) || [];
          data.averageMarginPercent = dateLogs.length > 0
            ? dateLogs.reduce((sum: number, log: MarginLog) => sum + log.marginPercent, 0) / dateLogs.length
            : 0;
        });

        setDateRangeData(Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const params = new URLSearchParams({
        action: 'logs',
        limit: '10000',
        ...(selectedBrand !== 'all' && { brandId: selectedBrand }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      });

      const response = await fetch(`/api/admin/margin-analytics?${params}`);
      const data = await response.json();

      if (data.success && data.logs) {
        // Convert to CSV
        const headers = [
          'Date', 'Brand', 'AWB Number', 'Customer Price', 'DTDC Cost', 
          'Margin', 'Margin %', 'Weight', 'Origin', 'Destination', 'Service Type'
        ];
        
        const csvContent = [
          headers.join(','),
          ...data.logs.map((log: MarginLog) => [
            new Date(log.calculatedAt).toLocaleDateString(),
            log.brand.name,
            log.awbNumber || '',
            log.customerPrice,
            log.dtdcCost,
            log.margin,
            log.marginPercent.toFixed(2),
            log.weight || '',
            log.origin || '',
            log.destination || '',
            log.serviceType || ''
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `courier-margins-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to export data');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courier Margin Analytics</h1>
          <p className="text-gray-600">Track and analyze courier margins by user, date, and location</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={fetchData} variant="outline" className="flex items-center gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Brand Filter */}
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locationData.map((location) => (
                    <SelectItem key={location.location} value={location.location}>
                      {location.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Margin</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalMargin)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(summary.averageMarginPercent)} average margin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Customer charges (Y)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalCosts)}
              </div>
              <p className="text-xs text-muted-foreground">
                DTDC charges (X)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.shipmentCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Processed shipments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="by-user" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-user">By User</TabsTrigger>
          <TabsTrigger value="by-location">By Location</TabsTrigger>
          <TabsTrigger value="by-date">By Date</TabsTrigger>
          <TabsTrigger value="detailed-logs">Detailed Logs</TabsTrigger>
        </TabsList>

        {/* By User Tab */}
        <TabsContent value="by-user">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Margin by User (Brand)
              </CardTitle>
              <CardDescription>
                Courier margin breakdown by brand/user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand Name</TableHead>
                    <TableHead className="text-right">Total Margin</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Total Costs</TableHead>
                    <TableHead className="text-right">Shipments</TableHead>
                    <TableHead className="text-right">Avg Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.brandBreakdown.map((brand) => (
                    <TableRow key={brand.brandName}>
                      <TableCell className="font-medium">{brand.brandName}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(brand.totalMargin)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(brand.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(brand.totalCosts)}
                      </TableCell>
                      <TableCell className="text-right">{brand.shipmentCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={brand.averageMarginPercent > 20 ? "default" : "secondary"}>
                          {formatPercentage(brand.averageMarginPercent)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Location Tab */}
        <TabsContent value="by-location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Margin by Location
              </CardTitle>
              <CardDescription>
                Courier margin breakdown by destination location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Total Margin</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Total Costs</TableHead>
                    <TableHead className="text-right">Shipments</TableHead>
                    <TableHead className="text-right">Avg Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationData.map((location) => (
                    <TableRow key={location.location}>
                      <TableCell className="font-medium">{location.location}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(location.totalMargin)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(location.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(location.totalCosts)}
                      </TableCell>
                      <TableCell className="text-right">{location.shipmentCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={location.averageMarginPercent > 20 ? "default" : "secondary"}>
                          {formatPercentage(location.averageMarginPercent)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Date Tab */}
        <TabsContent value="by-date">
          <Card>
            <CardHeader>
              <CardTitle>Margin by Date</CardTitle>
              <CardDescription>
                Daily courier margin trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Margin</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Shipments</TableHead>
                    <TableHead className="text-right">Avg Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateRangeData.map((dateData) => (
                    <TableRow key={dateData.date}>
                      <TableCell className="font-medium">
                        {new Date(dateData.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(dateData.totalMargin)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dateData.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">{dateData.shipmentCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={dateData.averageMarginPercent > 20 ? "default" : "secondary"}>
                          {formatPercentage(dateData.averageMarginPercent)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Logs Tab */}
        <TabsContent value="detailed-logs">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Margin Logs</CardTitle>
              <CardDescription>
                Individual shipment margin details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>AWB</TableHead>
                    <TableHead className="text-right">Customer Price</TableHead>
                    <TableHead className="text-right">DTDC Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead>Origin → Destination</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marginLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.calculatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{log.brand.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.awbNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(log.customerPrice)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(log.dtdcCost)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(log.margin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={log.marginPercent > 20 ? "default" : "secondary"}>
                          {formatPercentage(log.marginPercent)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.origin || 'N/A'} → {log.destination || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}