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
import { 
  Send, 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Brand {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  contactEmail?: string;
  website?: string;
  categories: string[];
}

interface AccessRequest {
  id: string;
  brandId: string;
  brandName: string;
  roleType: 'SERVICE_CENTER' | 'DISTRIBUTOR';
  message: string;
  documentUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  handledByAdminId?: string;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

interface RequestBrandAccessProps {
  userRole: 'SERVICE_CENTER' | 'DISTRIBUTOR';
}

export default function RequestBrandAccess({ userRole }: RequestBrandAccessProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [message, setMessage] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load brands and existing access requests
      const [brandsResponse, requestsResponse] = await Promise.all([
        fetch('/api/brands'),
        fetch('/api/access-requests')
      ]);

      if (brandsResponse.ok) {
        const brandsData = await brandsResponse.json();
        setBrands(brandsData.brands || []);
      }

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setAccessRequests(requestsData.requests || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load brands and requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBrandId || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a brand and provide a message",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          message: message,
          documentUrl: documentFile ? `document-${Date.now()}-${documentFile.name}` : null
        })
      });

      if (response.ok) {
        toast({
          title: "Request Submitted",
          description: "Your brand access request has been submitted successfully",
        });
        
        // Reset form
        setSelectedBrandId('');
        setMessage('');
        setDocumentFile(null);
        
        // Reload requests
        loadData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit request');
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF, Word document, or image file",
          variant: "destructive"
        });
        return;
      }
      
      setDocumentFile(file);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredRequests = accessRequests.filter(request => {
    const matchesSearch = request.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    brand.status === 'ACTIVE'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading brands...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Request Brand Access</h2>
          <p className="text-muted-foreground">
            Request access to brands to start receiving orders and managing inventory
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Submit New Request
          </CardTitle>
          <CardDescription>
            Select a brand and provide details about why you want to partner with them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="brand">Select Brand *</Label>
                <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a brand to request access" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span>{brand.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {filteredBrands.length} brands available
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">Supporting Documents (Optional)</Label>
                <Input
                  id="document"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-muted-foreground">
                  Upload business license, certificates, or other relevant documents (Max 10MB)
                </p>
                {documentFile && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <FileText className="h-4 w-4" />
                    <span>{documentFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Explain why you want to partner with this brand as a ${userRole.toLowerCase().replace('_', ' ')}. Include details about your business, experience, location, and how you can add value to their distribution network.`}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/1000 characters
              </p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Your request will be reviewed by the brand's admin team. 
                Provide detailed and professional information to increase your chances of approval.
                Processing time typically takes 3-5 business days.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedBrandId('');
                  setMessage('');
                  setDocumentFile(null);
                }}
              >
                Clear Form
              </Button>
              <Button type="submit" disabled={submitting || !selectedBrandId || !message.trim()}>
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* My Brand Access Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                My Brand Access Requests
              </CardTitle>
              <CardDescription>
                Track the status of your brand access requests
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search by brand name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Requests Found</h3>
              <p className="text-muted-foreground mb-4">
                {accessRequests.length === 0 
                  ? "You haven't submitted any brand access requests yet."
                  : "No requests match your current filters."
                }
              </p>
              {accessRequests.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Use the form above to submit your first brand access request.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Brand Name</TableHead>
                    <TableHead className="font-semibold">Role Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Date Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{request.brandName}</p>
                            <p className="text-sm text-muted-foreground">Brand Partner</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {request.roleType === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={request.status === 'APPROVED' ? 'default' : 
                                   request.status === 'PENDING' ? 'secondary' : 'destructive'}
                            className={`${getStatusColor(request.status)} font-medium`}
                          >
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(request.status)}
                              <span>{request.status.charAt(0) + request.status.slice(1).toLowerCase()}</span>
                            </div>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {new Date(request.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Table Footer with Summary */}
          {filteredRequests.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredRequests.length} of {accessRequests.length} requests
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>{accessRequests.filter(r => r.status === 'PENDING').length} Pending</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>{accessRequests.filter(r => r.status === 'APPROVED').length} Approved</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>{accessRequests.filter(r => r.status === 'REJECTED').length} Rejected</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{accessRequests.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {accessRequests.filter(r => r.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {accessRequests.filter(r => r.status === 'APPROVED').length}
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
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {accessRequests.filter(r => r.status === 'REJECTED').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Tips for Successful Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">What to Include in Your Message:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your business background and experience</li>
                <li>• Geographic location and coverage area</li>
                <li>• Existing customer base and market reach</li>
                <li>• Technical capabilities and certifications</li>
                <li>• Why you want to partner with this specific brand</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Supporting Documents:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Business registration certificate</li>
                <li>• Tax identification documents</li>
                <li>• Professional certifications</li>
                <li>• Insurance certificates</li>
                <li>• References from existing partners</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}