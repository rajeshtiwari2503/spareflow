import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Building, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  AlertCircle,
  Shield,
  Key,
  Bell,
  Settings,
  Loader2,
  Camera,
  Upload
} from 'lucide-react';

interface Address {
  id?: string;
  type: 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'OTHER';
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
  addresses: Address[];
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    language: string;
    timezone: string;
  };
}

const EnhancedProfileManager: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Initialize profile data
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        // Initialize with user data if profile doesn't exist
        setProfile({
          id: user?.id || '',
          name: user?.name || '',
          email: user?.email || '',
          role: user?.role || '',
          addresses: [],
          preferences: {
            emailNotifications: true,
            smsNotifications: true,
            pushNotifications: true,
            language: 'en',
            timezone: 'Asia/Kolkata'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully"
        });
        refreshUser();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addAddress = () => {
    const newAddress: Address = {
      type: 'HOME',
      label: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      isDefault: profile?.addresses.length === 0
    };
    setEditingAddress(newAddress);
    setShowAddAddress(true);
  };

  const saveAddress = () => {
    if (!editingAddress || !profile) return;

    if (!editingAddress.label || !editingAddress.addressLine1 || !editingAddress.city || !editingAddress.state || !editingAddress.pincode) {
      toast({
        title: "Error",
        description: "Please fill in all required address fields",
        variant: "destructive"
      });
      return;
    }

    let updatedAddresses = [...profile.addresses];

    if (editingAddress.id) {
      // Update existing address
      updatedAddresses = updatedAddresses.map(addr => 
        addr.id === editingAddress.id ? editingAddress : addr
      );
    } else {
      // Add new address
      const newAddress = { ...editingAddress, id: Date.now().toString() };
      updatedAddresses.push(newAddress);
    }

    // If this is set as default, remove default from others
    if (editingAddress.isDefault) {
      updatedAddresses = updatedAddresses.map(addr => ({
        ...addr,
        isDefault: addr.id === editingAddress.id || (addr === editingAddress)
      }));
    }

    setProfile({ ...profile, addresses: updatedAddresses });
    setEditingAddress(null);
    setShowAddAddress(false);
  };

  const deleteAddress = (addressId: string) => {
    if (!profile) return;

    const updatedAddresses = profile.addresses.filter(addr => addr.id !== addressId);
    
    // If we deleted the default address, make the first remaining address default
    if (updatedAddresses.length > 0 && !updatedAddresses.some(addr => addr.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    setProfile({ ...profile, addresses: updatedAddresses });
  };

  const updateProfile = (field: keyof UserProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const updatePreferences = (field: string, value: any) => {
    if (!profile) return;
    setProfile({
      ...profile,
      preferences: { ...profile.preferences, [field]: value }
    });
  };

  const getRoleDisplayName = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAddressTypeColor = (type: string) => {
    switch (type) {
      case 'HOME': return 'bg-green-100 text-green-800';
      case 'OFFICE': return 'bg-blue-100 text-blue-800';
      case 'WAREHOUSE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load profile data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Basic Information</span>
              <Badge variant={profile.name && profile.email ? "default" : "secondary"}>
                {profile.name && profile.email ? "Complete" : "Incomplete"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Contact Details</span>
              <Badge variant={profile.phone ? "default" : "secondary"}>
                {profile.phone ? "Complete" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Address Information</span>
              <Badge variant={profile.addresses.length > 0 ? "default" : "destructive"}>
                {profile.addresses.length > 0 ? `${profile.addresses.length} Address(es)` : "Required for Shipping"}
              </Badge>
            </div>
            {(profile.role === 'BRAND' || profile.role === 'DISTRIBUTOR') && (
              <div className="flex items-center justify-between">
                <span>Business Information</span>
                <Badge variant={profile.companyName ? "default" : "secondary"}>
                  {profile.companyName ? "Complete" : "Optional"}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => updateProfile('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfile('email', e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input
                    value={getRoleDisplayName(profile.role)}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Address Management</CardTitle>
                  <CardDescription>
                    Manage your shipping and billing addresses. At least one address is required for courier services.
                  </CardDescription>
                </div>
                <Button onClick={addAddress}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profile.addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No addresses added yet</p>
                  <p className="text-sm text-red-600 mb-4">
                    ⚠️ Address is required for courier services and shipment delivery
                  </p>
                  <Button onClick={addAddress}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.addresses.map((address) => (
                    <div key={address.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getAddressTypeColor(address.type)}>
                            {address.type}
                          </Badge>
                          {address.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAddress(address);
                              setShowAddAddress(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAddress(address.id!)}
                            disabled={profile.addresses.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold">{address.label}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {address.addressLine1}
                          {address.addressLine2 && `, ${address.addressLine2}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                        <p className="text-sm text-gray-600">{address.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Address Form */}
              {showAddAddress && editingAddress && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold mb-4">
                    {editingAddress.id ? 'Edit Address' : 'Add New Address'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Address Type</Label>
                      <Select
                        value={editingAddress.type}
                        onValueChange={(value: 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'OTHER') =>
                          setEditingAddress({ ...editingAddress, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOME">Home</SelectItem>
                          <SelectItem value="OFFICE">Office</SelectItem>
                          <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Address Label *</Label>
                      <Input
                        value={editingAddress.label}
                        onChange={(e) => setEditingAddress({ ...editingAddress, label: e.target.value })}
                        placeholder="e.g., Home, Office, Main Warehouse"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Address Line 1 *</Label>
                      <Input
                        value={editingAddress.addressLine1}
                        onChange={(e) => setEditingAddress({ ...editingAddress, addressLine1: e.target.value })}
                        placeholder="House/Building number, Street name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={editingAddress.addressLine2 || ''}
                        onChange={(e) => setEditingAddress({ ...editingAddress, addressLine2: e.target.value })}
                        placeholder="Landmark, Area (optional)"
                      />
                    </div>
                    <div>
                      <Label>City *</Label>
                      <Input
                        value={editingAddress.city}
                        onChange={(e) => setEditingAddress({ ...editingAddress, city: e.target.value })}
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <Label>State *</Label>
                      <Input
                        value={editingAddress.state}
                        onChange={(e) => setEditingAddress({ ...editingAddress, state: e.target.value })}
                        placeholder="Enter state"
                      />
                    </div>
                    <div>
                      <Label>Pincode *</Label>
                      <Input
                        value={editingAddress.pincode}
                        onChange={(e) => setEditingAddress({ ...editingAddress, pincode: e.target.value })}
                        placeholder="Enter pincode"
                      />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input
                        value={editingAddress.country}
                        onChange={(e) => setEditingAddress({ ...editingAddress, country: e.target.value })}
                        placeholder="Enter country"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={editingAddress.isDefault}
                        onChange={(e) => setEditingAddress({ ...editingAddress, isDefault: e.target.checked })}
                      />
                      <Label htmlFor="isDefault">Set as default address</Label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button onClick={saveAddress}>
                      <Check className="h-4 w-4 mr-2" />
                      Save Address
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingAddress(null);
                        setShowAddAddress(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Information Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Add your business details for invoicing and compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={profile.companyName || ''}
                    onChange={(e) => updateProfile('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={profile.gstNumber || ''}
                    onChange={(e) => updateProfile('gstNumber', e.target.value)}
                    placeholder="Enter GST number"
                  />
                </div>
                <div>
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={profile.panNumber || ''}
                    onChange={(e) => updateProfile('panNumber', e.target.value)}
                    placeholder="Enter PAN number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-600">Receive updates via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.emailNotifications}
                    onChange={(e) => updatePreferences('emailNotifications', e.target.checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-gray-600">Receive updates via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.smsNotifications}
                    onChange={(e) => updatePreferences('smsNotifications', e.target.checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-600">Receive browser notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.pushNotifications}
                    onChange={(e) => updatePreferences('pushNotifications', e.target.checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>
                Configure your language and timezone preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Language</Label>
                  <Select
                    value={profile.preferences.language}
                    onValueChange={(value) => updatePreferences('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ta">Tamil</SelectItem>
                      <SelectItem value="te">Telugu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select
                    value={profile.preferences.timezone}
                    onValueChange={(value) => updatePreferences('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                      <SelectItem value="Asia/Dubai">UAE Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EnhancedProfileManager;