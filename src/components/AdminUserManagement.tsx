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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Ban, UserCheck, UserX, 
  Search, Filter, Calendar, MapPin, Mail, Phone, Building, Globe, 
  Download, Upload, RefreshCw, AlertTriangle, Info, Settings, Shield,
  Activity, Clock, DollarSign, Package, Truck, Star, Target, TrendingUp,
  FileText, Send, MessageSquare, Bell, Lock, Unlock, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { makeAuthenticatedRequest } from '@/lib/client-auth';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  walletBalance?: number;
  isVerified: boolean;
  profileComplete?: boolean;
  totalOrders?: number;
  totalSpent?: number;
  location?: string;
  companyName?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  roleDistribution: {
    BRAND: number;
    DISTRIBUTOR: number;
    SERVICE_CENTER: number;
    CUSTOMER: number;
  };
  geographicDistribution: Array<{
    location: string;
    count: number;
  }>;
  accountStatus: {
    active: number;
    inactive: number;
    suspended: number;
  };
}

interface BulkOperation {
  type: 'UPDATE_ROLE' | 'UPDATE_STATUS' | 'SEND_MESSAGE' | 'DELETE';
  userIds: string[];
  data?: any;
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setBulkDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    walletBalance: 0,
    sendWelcomeEmail: true
  });

  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    type: 'ANNOUNCEMENT' // ANNOUNCEMENT, POLICY_UPDATE, MAINTENANCE, FEATURE
  });

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/users?stats=true');
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        toast.success('User created successfully');
        setShowCreateDialog(false);
        setCreateForm({
          name: '',
          email: '',
          phone: '',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          walletBalance: 0,
          sendWelcomeEmail: true
        });
        fetchUsers();
        fetchUserStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({ id: userId, ...updates })
      });

      if (response.ok) {
        toast.success('User updated successfully');
        fetchUsers();
        fetchUserStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest('/api/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ id: userId })
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
        fetchUserStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify(operation)
      });

      if (response.ok) {
        toast.success('Bulk operation completed successfully');
        setSelectedUsers([]);
        setBulkDialog(false);
        fetchUsers();
        fetchUserStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('Error in bulk operation:', error);
      toast.error('Bulk operation failed');
    }
  };

  const handleSendMessage = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/users/message', {
        method: 'POST',
        body: JSON.stringify({
          userIds: selectedUsers.length > 0 ? selectedUsers : users.map(u => u.id),
          ...messageForm
        })
      });

      if (response.ok) {
        toast.success('Message sent successfully');
        setShowMessageDialog(false);
        setMessageForm({ subject: '', message: '', type: 'ANNOUNCEMENT' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleExportUsers = async () => {
    try {
      setIsExporting(true);
      const response = await makeAuthenticatedRequest('/api/admin/users?export=true');
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Users exported successfully');
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFile) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', bulkFile);

      const response = await makeAuthenticatedRequest('/api/admin/users/import', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Import completed: ${result.success} users imported, ${result.errors} errors`);
        setBulkFile(null);
        fetchUsers();
        fetchUserStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing users:', error);
      toast.error('Import failed');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm) ||
                         user.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || user.status === filterStatus;
    const matchesLocation = filterLocation === 'ALL' || user.location === filterLocation;
    
    let matchesDate = true;
    if (dateRange.from && dateRange.to) {
      const userDate = new Date(user.createdAt);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      matchesDate = userDate >= fromDate && userDate <= toDate;
    }

    return matchesSearch && matchesRole && matchesStatus && matchesLocation && matchesDate;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'BRAND': return 'bg-purple-100 text-purple-800';
      case 'DISTRIBUTOR': return 'bg-blue-100 text-blue-800';
      case 'SERVICE_CENTER': return 'bg-green-100 text-green-800';
      case 'CUSTOMER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      {/* User Statistics Dashboard */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Users</p>
                  <p className="text-2xl font-bold">{userStats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">{userStats.activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">New This Month</p>
                  <p className="text-2xl font-bold">{userStats.newRegistrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Brands</p>
                  <p className="text-2xl font-bold">{userStats.roleDistribution.BRAND}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Distributors</p>
                  <p className="text-2xl font-bold">{userStats.roleDistribution.DISTRIBUTOR}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Service Centers</p>
                  <p className="text-2xl font-bold">{userStats.roleDistribution.SERVICE_CENTER}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Management
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            User Analytics
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Search, filter, and manage all platform users</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportUsers} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>Add a new user to the platform</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={createForm.name}
                            onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={createForm.phone}
                            onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={createForm.role} onValueChange={(value) => setCreateForm({...createForm, role: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CUSTOMER">Customer</SelectItem>
                              <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                              <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                              <SelectItem value="BRAND">Brand</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Initial Wallet Balance (₹)</Label>
                          <Input
                            type="number"
                            value={createForm.walletBalance}
                            onChange={(e) => setCreateForm({...createForm, walletBalance: parseFloat(e.target.value) || 0})}
                            placeholder="0"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={createForm.sendWelcomeEmail}
                            onCheckedChange={(checked) => setCreateForm({...createForm, sendWelcomeEmail: checked})}
                          />
                          <Label>Send welcome email</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateUser} className="flex-1">Create User</Button>
                          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      <SelectItem value="BRAND">Brand</SelectItem>
                      <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                      <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                    placeholder="From date"
                  />

                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                    placeholder="To date"
                  />
                </div>

                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">{selectedUsers.length} users selected</span>
                    <div className="flex gap-2 ml-auto">
                      <Button size="sm" variant="outline" onClick={() => setBulkDialog(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Bulk Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowMessageDialog(true)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Users Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(filteredUsers.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              {user.phone && (
                                <p className="text-xs text-gray-400">{user.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                          {!user.isVerified && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              Unverified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? (
                            <span className="text-sm">{new Date(user.lastLogin).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-sm text-gray-400">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.walletBalance !== undefined ? (
                            <span className="text-sm font-medium">₹{user.walletBalance.toLocaleString()}</span>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{user.totalOrders || 0} orders</div>
                            {user.totalSpent && (
                              <div className="text-gray-500">₹{user.totalSpent.toLocaleString()}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>User Details</DialogTitle>
                                </DialogHeader>
                                {selectedUser && <UserDetailsView user={selectedUser} onUpdate={handleUpdateUser} />}
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateUser(user.id, { 
                                status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' 
                              })}
                            >
                              {user.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No users found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Management Tab */}
        <TabsContent value="roles" className="space-y-6">
          <RoleManagementView />
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <BulkOperationsView 
            onImport={handleBulkImport}
            bulkFile={bulkFile}
            setBulkFile={setBulkFile}
          />
        </TabsContent>

        {/* User Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <UserAnalyticsView userStats={userStats} />
        </TabsContent>
      </Tabs>

      {/* Bulk Operations Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Operations</DialogTitle>
            <DialogDescription>
              Apply changes to {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => handleBulkOperation({
                  type: 'UPDATE_STATUS',
                  userIds: selectedUsers,
                  data: { status: 'ACTIVE' }
                })}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate All
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkOperation({
                  type: 'UPDATE_STATUS',
                  userIds: selectedUsers,
                  data: { status: 'SUSPENDED' }
                })}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspend All
              </Button>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bulk operations cannot be undone. Please review your selection carefully.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to Users</DialogTitle>
            <DialogDescription>
              Send a message to {selectedUsers.length > 0 ? `${selectedUsers.length} selected users` : 'all users'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={messageForm.type} onValueChange={(value) => setMessageForm({...messageForm, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                  <SelectItem value="POLICY_UPDATE">Policy Update</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance Notice</SelectItem>
                  <SelectItem value="FEATURE">New Feature</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={messageForm.subject}
                onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                placeholder="Message subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={messageForm.message}
                onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                placeholder="Your message..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendMessage} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User Details Component
function UserDetailsView({ user, onUpdate }: { user: User; onUpdate: (id: string, updates: Partial<User>) => void }) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(user);

  const handleSave = () => {
    onUpdate(user.id, editForm);
    setEditMode(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
          <AvatarFallback className="text-lg">
            {user.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-gray-500">{user.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge className={getRoleColor(user.role)}>
              {user.role.replace('_', ' ')}
            </Badge>
            <Badge className={getStatusColor(user.status)}>
              {user.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditMode(!editMode)}>
          <Edit className="h-4 w-4 mr-2" />
          {editMode ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold">Personal Information</h4>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              {editMode ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              ) : (
                <p className="text-sm text-gray-600">{user.name}</p>
              )}
            </div>
            <div>
              <Label>Email</Label>
              {editMode ? (
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              ) : (
                <p className="text-sm text-gray-600">{user.email}</p>
              )}
            </div>
            <div>
              <Label>Phone</Label>
              {editMode ? (
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                />
              ) : (
                <p className="text-sm text-gray-600">{user.phone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Account Information</h4>
          <div className="space-y-3">
            <div>
              <Label>Role</Label>
              {editMode ? (
                <Select value={editForm.role} onValueChange={(value) => setEditForm({...editForm, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                    <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                    <SelectItem value="BRAND">Brand</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-600">{user.role.replace('_', ' ')}</p>
              )}
            </div>
            <div>
              <Label>Status</Label>
              {editMode ? (
                <Select value={editForm.status} onValueChange={(value) => setEditForm({...editForm, status: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-600">{user.status}</p>
              )}
            </div>
            <div>
              <Label>Created</Label>
              <p className="text-sm text-gray-600">{new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="text-sm text-gray-600">{new Date(user.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Wallet Balance</p>
                <p className="text-lg font-bold">₹{user.walletBalance?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Orders</p>
                <p className="text-lg font-bold">{user.totalOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Total Spent</p>
                <p className="text-lg font-bold">₹{user.totalSpent?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {editMode && (
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => setEditMode(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// Role Management Component
function RoleManagementView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Role-Based Access Control</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                role: 'BRAND',
                title: 'Brand Users',
                description: 'Manage spare parts catalog, create shipments, handle returns',
                permissions: ['Catalog Management', 'Shipment Creation', 'Return Processing', 'Analytics Access'],
                color: 'purple'
              },
              {
                role: 'DISTRIBUTOR',
                title: 'Distributor Users',
                description: 'Process orders, manage inventory, handle transactions',
                permissions: ['Order Processing', 'Inventory Management', 'Payment Handling', 'Analytics Access'],
                color: 'blue'
              },
              {
                role: 'SERVICE_CENTER',
                title: 'Service Center Users',
                description: 'Request parts, manage shipments, process returns',
                permissions: ['Part Requests', 'Shipment Management', 'Return Processing', 'Customer Service'],
                color: 'green'
              },
              {
                role: 'CUSTOMER',
                title: 'Customer Users',
                description: 'Search parts, place orders, track shipments, manage warranties',
                permissions: ['Part Search', 'Order Placement', 'Shipment Tracking', 'Warranty Management'],
                color: 'gray'
              }
            ].map((roleInfo) => (
              <Card key={roleInfo.role}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-3 rounded-full bg-${roleInfo.color}-500`}></div>
                    <h3 className="font-semibold">{roleInfo.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{roleInfo.description}</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">PERMISSIONS</Label>
                    <div className="space-y-1">
                      {roleInfo.permissions.map((permission) => (
                        <div key={permission} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Bulk Operations Component
function BulkOperationsView({ 
  onImport, 
  bulkFile, 
  setBulkFile 
}: { 
  onImport: () => void;
  bulkFile: File | null;
  setBulkFile: (file: File | null) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Users</CardTitle>
          <CardDescription>Upload a CSV file to import multiple users at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Download the template CSV file to see the required format. Ensure all required fields are included.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  const response = await makeAuthenticatedRequest('/api/admin/users/template');
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'user_import_template.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    toast.success('Template downloaded successfully');
                  }
                } catch (error) {
                  console.error('Error downloading template:', error);
                  toast.error('Failed to download template');
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <div className="flex-1">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={onImport} disabled={!bulkFile}>
              <Upload className="h-4 w-4 mr-2" />
              Import Users
            </Button>
          </div>
          
          {bulkFile && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>Selected file:</strong> {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Communications</CardTitle>
          <CardDescription>Send messages to multiple users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Bell className="h-6 w-6 mb-2" />
              <span>Send Announcements</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <FileText className="h-6 w-6 mb-2" />
              <span>Policy Updates</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Settings className="h-6 w-6 mb-2" />
              <span>Maintenance Notices</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Star className="h-6 w-6 mb-2" />
              <span>Feature Announcements</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// User Analytics Component
function UserAnalyticsView({ userStats }: { userStats: UserStats | null }) {
  if (!userStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Users by role type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(userStats.roleDistribution).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{role.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / userStats.totalUsers) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>User account status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(userStats.accountStatus.active / userStats.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold">{userStats.accountStatus.active}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Inactive</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full" 
                      style={{ width: `${(userStats.accountStatus.inactive / userStats.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold">{userStats.accountStatus.inactive}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Suspended</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${(userStats.accountStatus.suspended / userStats.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold">{userStats.accountStatus.suspended}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>Users by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {userStats.geographicDistribution.slice(0, 10).map((location, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm">{location.location}</span>
                <Badge variant="outline">{location.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getRoleColor(role: string) {
  switch (role) {
    case 'BRAND': return 'bg-purple-100 text-purple-800';
    case 'DISTRIBUTOR': return 'bg-blue-100 text-blue-800';
    case 'SERVICE_CENTER': return 'bg-green-100 text-green-800';
    case 'CUSTOMER': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'INACTIVE': return 'bg-gray-100 text-gray-800';
    case 'SUSPENDED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}