import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { 
  Search, 
  Plus, 
  Eye, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building2, 
  Wrench, 
  Upload, 
  Download, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  MessageSquare, 
  Users, 
  Filter, 
  ExternalLink, 
  Info,
  Shield,
  Activity,
  UserPlus
} from 'lucide-react';

interface AuthorizedPartner {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    companyName?: string;
  };
}

interface AccessRequest {
  id: string;
  userId: string;
  roleType: string;
  message: string;
  documentUrl?: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
  };
}

interface BulkUploadResult {
  success: boolean;
  user_id: string;
  role_type: string;
  row_number: number;
  message: string;
  user_email?: string;
}

interface BulkUploadResponse {
  summary: {
    total: number;
    success: number;
    failure: number;
  };
  results: BulkUploadResult[];
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  city?: string;
  state?: string;
  pincode?: string;
  role: string;
  createdAt: string;
}

interface SearchResponse {
  success: boolean;
  users: SearchUser[];
  total: number;
  query: string;
  roleType: string;
}

export default function AuthorizedNetworkManager() {
  const [serviceCenters, setServiceCenters] = useState<AuthorizedPartner[]>([]);
  const [distributors, setDistributors] = useState<AuthorizedPartner[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRequestsDialogOpen, setIsRequestsDialogOpen] = useState(false);
  const [isAddExistingDialogOpen, setIsAddExistingDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [existingUserEmailOrId, setExistingUserEmailOrId] = useState('');
  const [existingUserRoleType, setExistingUserRoleType] = useState<'SERVICE_CENTER' | 'DISTRIBUTOR'>('SERVICE_CENTER');
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadResults, setBulkUploadResults] = useState<BulkUploadResponse | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [activeTab, setActiveTab] = useState('service-centers');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAuthorizedNetwork();
    fetchAccessRequests();
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAuthorizedNetwork(),
        fetchAccessRequests()
      ]);
      toast({
        title: "Data Refreshed",
        description: "Network data has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh network data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAuthorizedNetwork = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/authorized-network', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setServiceCenters(data.serviceCenters || []);
        setDistributors(data.distributors || []);
      } else {
        throw new Error('Failed to fetch network data');
      }
    } catch (error) {
      console.error('Error fetching authorized network:', error);
      toast({
        title: "Error",
        description: "Failed to load authorized network data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessRequests = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/access-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAccessRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching access requests:', error);
    }
  };

  const handleStatusChange = async (partnerId: string, partnerType: 'service_center' | 'distributor', newStatus: string) => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/authorized-network/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          partnerId,
          partnerType,
          status: newStatus,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Partner status updated to ${newStatus}`,
        });
        fetchAuthorizedNetwork();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating partner status:', error);
      toast({
        title: "Error",
        description: "Failed to update partner status",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAccess = async (partnerId: string, partnerType: 'service_center' | 'distributor', partnerName: string) => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/authorized-network/remove', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          partnerId,
          partnerType,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${partnerName}'s access has been deactivated. Future shipments will be prevented.`,
        });
        fetchAuthorizedNetwork();
      } else {
        throw new Error('Failed to remove access');
      }
    } catch (error) {
      console.error('Error removing partner access:', error);
      toast({
        title: "Error",
        description: "Failed to remove partner access",
        variant: "destructive",
      });
    }
  };

  const handleAccessRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/access-requests/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          action,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Access request ${action}d successfully`,
        });
        fetchAccessRequests();
        fetchAuthorizedNetwork();
      } else {
        throw new Error(`Failed to ${action} request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} access request`,
        variant: "destructive",
      });
    }
  };

  const handleAddExistingUser = async () => {
    if (!existingUserEmailOrId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user email or ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/authorized-network/add-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userEmailOrId: existingUserEmailOrId,
          roleType: existingUserRoleType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setIsAddExistingDialogOpen(false);
        setExistingUserEmailOrId('');
        setSearchQuery('');
        setSelectedUser(null);
        setSearchResults([]);
        fetchAuthorizedNetwork(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add user to authorized list",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding existing user:', error);
      toast({
        title: "Error",
        description: "Failed to add user to authorized list",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Error",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setBulkUploadFile(file);
      setBulkUploadResults(null);
    }
  };

  const parseCsvFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSV file must have at least a header row and one data row'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Validate headers
          if (!headers.includes('user_id') || !headers.includes('role_type')) {
            reject(new Error('CSV file must have "user_id" and "role_type" columns'));
            return;
          }

          const userIdIndex = headers.indexOf('user_id');
          const roleTypeIndex = headers.indexOf('role_type');

          const data = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            return {
              user_id: values[userIdIndex] || '',
              role_type: values[roleTypeIndex] || '',
              row_number: index + 2 // +2 because we start from line 2 (after header)
            };
          });

          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse CSV file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsBulkUploading(true);
    setBulkUploadResults(null);

    try {
      const csvData = await parseCsvFile(bulkUploadFile);
      
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/authorized-network/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ csvData }),
      });

      const data = await response.json();

      if (response.ok) {
        setBulkUploadResults(data);
        toast({
          title: "Bulk Upload Complete",
          description: `Processed ${data.summary.total} entries: ${data.summary.success} successful, ${data.summary.failure} failed`,
        });
        fetchAuthorizedNetwork(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to process bulk upload');
      }
    } catch (error: any) {
      console.error('Error during bulk upload:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process bulk upload",
        variant: "destructive",
      });
    } finally {
      setIsBulkUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = 'user_id,role_type\nuser@example.com,SERVICE_CENTER\nuser-id-123,DISTRIBUTOR\nservice@fixiq.com,SERVICE_CENTER\ndistributor@company.com,DISTRIBUTOR\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetBulkUpload = () => {
    setBulkUploadFile(null);
    setBulkUploadResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Enhanced search functionality
  const searchUsers = async (query: string, roleType: 'SERVICE_CENTER' | 'DISTRIBUTOR') => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch(`/api/brand/authorized-network/search-users?query=${encodeURIComponent(query)}&roleType=${roleType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
        const errorData = await response.json();
        toast({
          title: "Search Error",
          description: errorData.error || "Failed to search users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      toast({
        title: "Search Error",
        description: "Network error while searching users",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setSelectedUser(null);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchUsers(query, existingUserRoleType);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleUserSelect = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setSearchResults([]);
  };

  const handleAddSelectedUser = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user from the search results",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch('/api/brand/authorized-network/add-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userEmailOrId: selectedUser.id,
          roleType: existingUserRoleType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setIsAddExistingDialogOpen(false);
        setSearchQuery('');
        setSelectedUser(null);
        setSearchResults([]);
        fetchAuthorizedNetwork(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add user to authorized list",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding selected user:', error);
      toast({
        title: "Error",
        description: "Failed to add user to authorized list",
        variant: "destructive",
      });
    }
  };

  // Reset search when role type changes
  useEffect(() => {
    setSearchQuery('');
    setSelectedUser(null);
    setSearchResults([]);
  }, [existingUserRoleType]);

  // Filter functions
  const getFilteredServiceCenters = () => {
    let filtered = serviceCenters.filter(sc =>
      sc.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sc.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sc.user.companyName && sc.user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sc => sc.status.toLowerCase() === statusFilter.toLowerCase());
    }

    return filtered;
  };

  const getFilteredDistributors = () => {
    let filtered = distributors.filter(d =>
      d.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.user.companyName && d.user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status.toLowerCase() === statusFilter.toLowerCase());
    }

    return filtered;
  };

  const filteredServiceCenters = getFilteredServiceCenters();
  const filteredDistributors = getFilteredDistributors();
  const pendingRequests = accessRequests.filter(req => req.status === 'PENDING');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Enhanced Information */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-primary">Authorized Network Management</h2>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Enhanced Security
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage your authorized service centers and distributors for secure shipment operations
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              <span>{serviceCenters.length} Service Centers</span>
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{distributors.length} Distributors</span>
            </div>
            {pendingRequests.length > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Clock className="h-4 w-4" />
                <span>{pendingRequests.length} Pending Requests</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {pendingRequests.length > 0 && (
            <Dialog open={isRequestsDialogOpen} onOpenChange={setIsRequestsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="relative">
                  <Eye className="h-4 w-4 mr-2" />
                  Access Requests
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingRequests.length}
                  </Badge>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Pending Access Requests
                  </DialogTitle>
                  <DialogDescription>
                    Review and approve/reject access requests from service centers and distributors
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Details</TableHead>
                        <TableHead>Role Type</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Request Message</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{request.user.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {request.user.email}
                              </div>
                              {request.user.phone && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {request.user.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={request.roleType === 'SERVICE_CENTER' ? 'default' : 'secondary'}>
                              {request.roleType === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {request.user.companyName || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={request.message}>
                              {request.message}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAccessRequestAction(request.id, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAccessRequestAction(request.id, 'reject')}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isAddExistingDialogOpen} onOpenChange={setIsAddExistingDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Existing User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search & Add Existing User
                </DialogTitle>
                <DialogDescription>
                  Search for existing users and add them to your authorized network
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role-type">Role Type</Label>
                  <Select value={existingUserRoleType} onValueChange={(value: 'SERVICE_CENTER' | 'DISTRIBUTOR') => setExistingUserRoleType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                      <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="search-query">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="search-query"
                      value={searchQuery}
                      onChange={(e) => handleSearchQueryChange(e.target.value)}
                      placeholder={`Search ${existingUserRoleType === 'SERVICE_CENTER' ? 'service centers' : 'distributors'} by email, name, or company...`}
                      className="pl-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Type at least 2 characters to search for existing users
                  </p>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Search Results ({searchResults.length} found)</Label>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{user.name}</div>
                                <Badge variant={user.role === 'SERVICE_CENTER' ? 'default' : 'secondary'} className="text-xs">
                                  {user.role === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.companyName && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {user.companyName}
                                </div>
                              )}
                              {user.city && user.state && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {user.city}, {user.state}
                                </div>
                              )}
                            </div>
                            {selectedUser?.id === user.id && (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected User */}
                {selectedUser && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Selected User</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedUser.name}</span>
                        <Badge variant={selectedUser.role === 'SERVICE_CENTER' ? 'default' : 'secondary'}>
                          {selectedUser.role === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                        </Badge>
                      </div>
                      <div className="text-sm text-green-700">{selectedUser.email}</div>
                      {selectedUser.companyName && (
                        <div className="text-sm text-green-700">{selectedUser.companyName}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* No Results Message */}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No {existingUserRoleType === 'SERVICE_CENTER' ? 'service centers' : 'distributors'} found matching "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term or check the role type</p>
                  </div>
                )}

                {/* Fallback Manual Entry */}
                <div className="border-t pt-4">
                  <Label htmlFor="manual-entry" className="text-sm font-medium">Or enter manually:</Label>
                  <Input
                    id="manual-entry"
                    value={existingUserEmailOrId}
                    onChange={(e) => setExistingUserEmailOrId(e.target.value)}
                    placeholder="user@example.com or user-id-123"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the email address or user ID directly if search doesn't work
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddExistingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={selectedUser ? handleAddSelectedUser : handleAddExistingUser}
                  disabled={!selectedUser && !existingUserEmailOrId.trim()}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {selectedUser ? `Add ${selectedUser.name}` : 'Add to Authorized List'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Upload Partners
                </DialogTitle>
                <DialogDescription>
                  Upload a CSV file to add multiple users to your authorized network
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Instructions */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <h4 className="font-medium">CSV Format Requirements:</h4>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• File must be in CSV format (.csv)</li>
                        <li>• Required columns: <code className="bg-muted px-1 rounded">user_id</code>, <code className="bg-muted px-1 rounded">role_type</code></li>
                        <li>• <code className="bg-muted px-1 rounded">user_id</code> can be email address or user ID</li>
                        <li>• <code className="bg-muted px-1 rounded">role_type</code> must be either SERVICE_CENTER or DISTRIBUTOR</li>
                        <li>• First row should contain column headers</li>
                      </ul>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={downloadSampleCsv}
                        className="mt-2 p-0 h-auto"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download Sample CSV
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* File Upload */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-file">Select CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="mt-1"
                    />
                    {bulkUploadFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {bulkUploadFile.name} ({(bulkUploadFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkUpload}
                      disabled={!bulkUploadFile || isBulkUploading}
                    >
                      {isBulkUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Process
                        </>
                      )}
                    </Button>
                    {(bulkUploadFile || bulkUploadResults) && (
                      <Button variant="outline" onClick={resetBulkUpload}>
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {/* Results */}
                {bulkUploadResults && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Upload Results</h4>
                      
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-primary">
                              {bulkUploadResults.summary.total}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Processed</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {bulkUploadResults.summary.success}
                            </div>
                            <div className="text-sm text-muted-foreground">Successful</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {bulkUploadResults.summary.failure}
                            </div>
                            <div className="text-sm text-muted-foreground">Failed</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detailed Results */}
                      <div className="max-h-64 overflow-y-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>User ID</TableHead>
                              <TableHead>Role Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Message</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bulkUploadResults.results.map((result, index) => (
                              <TableRow key={index}>
                                <TableCell>{result.row_number}</TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-mono text-sm">{result.user_id}</div>
                                    {result.user_email && result.user_email !== result.user_id && (
                                      <div className="text-xs text-muted-foreground">{result.user_email}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={result.role_type === 'SERVICE_CENTER' ? 'default' : 'secondary'}>
                                    {result.role_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={result.success ? 'default' : 'destructive'}>
                                    {result.success ? 'Success' : 'Failed'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                                    {result.message}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search partners by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="service-centers" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            My Service Centers ({filteredServiceCenters.length})
          </TabsTrigger>
          <TabsTrigger value="distributors" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            My Distributors ({filteredDistributors.length})
          </TabsTrigger>
          <TabsTrigger value="access-requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Access Requests ({accessRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="service-centers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Authorized Service Centers
                  </CardTitle>
                  <CardDescription>
                    Manage your authorized service center network for spare parts delivery
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>{filteredServiceCenters.filter(sc => sc.status === 'Active').length} Active</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredServiceCenters.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Service Centers Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No service centers match your current filters.' 
                      : 'You haven\'t authorized any service centers yet.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={() => setIsAddExistingDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Service Center
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServiceCenters.map((sc) => (
                      <Card key={sc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{sc.user.name}</h4>
                                <Badge variant="default" className="text-xs">
                                  Service Center
                                </Badge>
                              </div>
                              {sc.user.companyName && (
                                <p className="text-sm text-muted-foreground mb-2">{sc.user.companyName}</p>
                              )}
                            </div>
                            <Switch
                              checked={sc.status === 'Active'}
                              onCheckedChange={(checked) => 
                                handleStatusChange(sc.id, 'service_center', checked ? 'Active' : 'Inactive')
                              }
                            />
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{sc.user.email}</span>
                            </div>
                            {sc.user.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{sc.user.phone}</span>
                              </div>
                            )}
                            {sc.user.city && sc.user.state && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{sc.user.city}, {sc.user.state}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Added {new Date(sc.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <Badge variant={sc.status === 'Active' ? 'default' : 'secondary'}>
                              {sc.status}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Access</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to deactivate <strong>{sc.user.name}</strong>'s access? 
                                    This will prevent future shipments to this service center.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveAccess(sc.id, 'service_center', sc.user.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Deactivate Access
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Authorized Distributors
                  </CardTitle>
                  <CardDescription>
                    Manage your authorized distributor network for parts supply
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>{filteredDistributors.filter(d => d.status === 'Active').length} Active</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDistributors.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Distributors Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No distributors match your current filters.' 
                      : 'You haven\'t authorized any distributors yet.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={() => setIsAddExistingDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Distributor
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDistributors.map((distributor) => (
                      <Card key={distributor.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{distributor.user.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  Distributor
                                </Badge>
                              </div>
                              {distributor.user.companyName && (
                                <p className="text-sm text-muted-foreground mb-2">{distributor.user.companyName}</p>
                              )}
                            </div>
                            <Switch
                              checked={distributor.status === 'Active'}
                              onCheckedChange={(checked) => 
                                handleStatusChange(distributor.id, 'distributor', checked ? 'Active' : 'Inactive')
                              }
                            />
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{distributor.user.email}</span>
                            </div>
                            {distributor.user.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{distributor.user.phone}</span>
                              </div>
                            )}
                            {distributor.user.city && distributor.user.state && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{distributor.user.city}, {distributor.user.state}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Added {new Date(distributor.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <Badge variant={distributor.status === 'Active' ? 'default' : 'secondary'}>
                              {distributor.status}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Access</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to deactivate <strong>{distributor.user.name}</strong>'s access? 
                                    This will prevent future shipments to this distributor.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveAccess(distributor.id, 'distributor', distributor.user.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Deactivate Access
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Access Requests Management
              </CardTitle>
              <CardDescription>
                Review and manage all access requests from service centers and distributors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accessRequests.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Access Requests</h3>
                  <p className="text-muted-foreground">
                    No service centers or distributors have requested access to your network yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accessRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{request.user.name}</h4>
                              <Badge variant={request.roleType === 'SERVICE_CENTER' ? 'default' : 'secondary'}>
                                {request.roleType === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                              </Badge>
                              <Badge variant={
                                request.status === 'PENDING' ? 'secondary' :
                                request.status === 'APPROVED' ? 'default' : 'destructive'
                              }>
                                {request.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{request.user.email}</span>
                              </div>
                              {request.user.companyName && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3 w-3" />
                                  <span>{request.user.companyName}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Requested {new Date(request.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm"><strong>Message:</strong> {request.message}</p>
                            </div>
                          </div>

                          {request.status === 'PENDING' && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => handleAccessRequestAction(request.id, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAccessRequestAction(request.id, 'reject')}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}