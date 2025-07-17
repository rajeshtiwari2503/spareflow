import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  Search, 
  Filter,
  UserCheck,
  UserX,
  AlertTriangle,
  Info,
  ExternalLink,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface AccessRequest {
  id: string;
  userId: string;
  roleType: 'SERVICE_CENTER' | 'DISTRIBUTOR';
  brandId: string;
  message: string | null;
  documentUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  handledByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  brand: {
    id: string;
    name: string;
    email: string;
  };
  handledByAdmin?: {
    id: string;
    name: string;
  } | null;
}

interface AccessRequestsStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function AccessRequestsManager() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [stats, setStats] = useState<AccessRequestsStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAccessRequests();
  }, []);

  const fetchAccessRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/access-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch access requests');
      }
      const data = await response.json();
      setRequests(data.requests || []);
      
      // Calculate stats
      const total = data.requests?.length || 0;
      const pending = data.requests?.filter((r: AccessRequest) => r.status === 'PENDING').length || 0;
      const approved = data.requests?.filter((r: AccessRequest) => r.status === 'APPROVED').length || 0;
      const rejected = data.requests?.filter((r: AccessRequest) => r.status === 'REJECTED').length || 0;
      
      setStats({ total, pending, approved, rejected });
    } catch (error) {
      console.error('Error fetching access requests:', error);
      toast.error('Failed to fetch access requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/admin/access-requests/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'approve'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }

      toast.success('Access request approved successfully');
      fetchAccessRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch('/api/admin/access-requests/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'reject',
          reason: reason.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject request');
      }

      toast.success('Access request rejected');
      fetchAccessRequests();
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
    const matchesRole = roleFilter === 'ALL' || request.roleType === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="default" className="text-green-600 bg-green-50 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleTypeBadge = (roleType: string) => {
    switch (roleType) {
      case 'SERVICE_CENTER':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Service Center</Badge>;
      case 'DISTRIBUTOR':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Distributor</Badge>;
      default:
        return <Badge variant="secondary">{roleType}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Access Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Brand Access Requests</CardTitle>
              <CardDescription>Review and manage brand access requests from service centers and distributors</CardDescription>
            </div>
            <Button onClick={fetchAccessRequests} variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search by user name, email, brand, or request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {stats.pending > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have {stats.pending} pending access request{stats.pending > 1 ? 's' : ''} that require{stats.pending === 1 ? 's' : ''} your attention.
              </AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>User Info</TableHead>
                <TableHead>Requested Brand</TableHead>
                <TableHead>Role Type</TableHead>
                <TableHead>Message Preview</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-500">No access requests found</p>
                      {(searchTerm || statusFilter !== 'ALL' || roleFilter !== 'ALL') && (
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">
                      {request.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.user.name}</p>
                        <p className="text-sm text-gray-500">{request.user.email}</p>
                        {request.user.phone && (
                          <p className="text-xs text-gray-400">{request.user.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.brand.name}</p>
                        <p className="text-sm text-gray-500">{request.brand.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleTypeBadge(request.roleType)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48">
                        {request.message ? (
                          <p className="text-sm truncate" title={request.message}>
                            {request.message}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-sm">No message</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.documentUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(request.documentUrl!, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">No file</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(request.createdAt).toLocaleDateString()}</p>
                        <p className="text-gray-500">{new Date(request.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* View Details Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Access Request Details</DialogTitle>
                              <DialogDescription>
                                Review the complete access request information
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Request ID</Label>
                                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">{request.id}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Status</Label>
                                  <div className="mt-1">{getStatusBadge(request.status)}</div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">User Information</Label>
                                  <div className="mt-1 p-3 border rounded">
                                    <p className="font-medium">{request.user.name}</p>
                                    <p className="text-sm text-gray-600">{request.user.email}</p>
                                    {request.user.phone && (
                                      <p className="text-sm text-gray-600">{request.user.phone}</p>
                                    )}
                                    <div className="mt-2">{getRoleTypeBadge(request.roleType)}</div>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Requested Brand</Label>
                                  <div className="mt-1 p-3 border rounded">
                                    <p className="font-medium">{request.brand.name}</p>
                                    <p className="text-sm text-gray-600">{request.brand.email}</p>
                                  </div>
                                </div>
                              </div>

                              {request.message && (
                                <div>
                                  <Label className="text-sm font-medium">Message</Label>
                                  <div className="mt-1 p-3 border rounded bg-gray-50">
                                    <p className="text-sm">{request.message}</p>
                                  </div>
                                </div>
                              )}

                              {request.documentUrl && (
                                <div>
                                  <Label className="text-sm font-medium">Attached Document</Label>
                                  <div className="mt-1">
                                    <Button
                                      variant="outline"
                                      onClick={() => window.open(request.documentUrl!, '_blank')}
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      View Document
                                      <ExternalLink className="h-4 w-4 ml-2" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Submitted</Label>
                                  <p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Last Updated</Label>
                                  <p className="text-sm">{new Date(request.updatedAt).toLocaleString()}</p>
                                </div>
                              </div>

                              {request.handledByAdmin && (
                                <div>
                                  <Label className="text-sm font-medium">Handled By</Label>
                                  <p className="text-sm">{request.handledByAdmin.name}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Action Buttons for Pending Requests */}
                        {request.status === 'PENDING' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={isProcessing}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Access Request</DialogTitle>
                                  <DialogDescription>
                                    Please provide a reason for rejecting this access request.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Rejection Reason</Label>
                                    <Textarea
                                      placeholder="Enter the reason for rejection..."
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedRequest(null);
                                        setRejectionReason('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleRejectRequest(request.id, rejectionReason)}
                                      disabled={isProcessing || !rejectionReason.trim()}
                                    >
                                      {isProcessing ? 'Rejecting...' : 'Reject Request'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}