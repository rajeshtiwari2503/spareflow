import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { getAuthToken, makeAuthenticatedRequest } from '@/lib/client-auth';
import { 
  User, Mail, Phone, Building, MapPin, Edit, Save, X, Plus, 
  Shield, Key, Camera, Loader2, CheckCircle, AlertCircle 
} from 'lucide-react';

interface Address {
  id?: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

interface ServiceCenterProfile {
  id: string;
  centerName: string;
  gstNumber?: string;
  contactPerson?: string;
  serviceTypes?: string[];
  isVerified: boolean;
  addresses: Address[];
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  serviceCenterProfile?: ServiceCenterProfile;
}

interface ServiceCenterProfileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: () => void;
}

export default function ServiceCenterProfileManager({ 
  isOpen, 
  onClose, 
  onProfileUpdate 
}: ServiceCenterProfileManagerProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'center' | 'addresses'>('basic');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Form states
  const [basicForm, setBasicForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [centerForm, setCenterForm] = useState({
    centerName: '',
    gstNumber: '',
    contactPerson: '',
    serviceTypes: [] as string[]
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState<Address>({
    label: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    isDefault: false
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        const userProfile = data.user;
        setProfile(userProfile);
        
        // Populate forms
        setBasicForm({
          name: userProfile.name || '',
          email: userProfile.email || '',
          phone: userProfile.phone || ''
        });

        if (userProfile.serviceCenterProfile) {
          const serviceTypes = userProfile.serviceCenterProfile.serviceTypes;
          let parsedServiceTypes = [];
          
          if (typeof serviceTypes === 'string') {
            try {
              parsedServiceTypes = JSON.parse(serviceTypes);
            } catch (e) {
              parsedServiceTypes = [];
            }
          } else if (Array.isArray(serviceTypes)) {
            parsedServiceTypes = serviceTypes;
          }

          setCenterForm({
            centerName: userProfile.serviceCenterProfile.centerName || '',
            gstNumber: userProfile.serviceCenterProfile.gstNumber || '',
            contactPerson: userProfile.serviceCenterProfile.contactPerson || '',
            serviceTypes: parsedServiceTypes
          });

          // Map addresses from the database structure
          const mappedAddresses = (userProfile.serviceCenterProfile.addresses || []).map((addr: any) => ({
            id: addr.id,
            label: addr.street || 'Address', // Use street as label if no label field
            addressLine1: addr.street || '',
            addressLine2: addr.area || '',
            city: addr.city || '',
            state: addr.state || '',
            pincode: addr.pincode || '',
            country: addr.country || 'India',
            isDefault: addr.isDefault || false
          }));
          setAddresses(mappedAddresses);
        }
      } else {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please login again.');
        }
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Validate required fields
      if (!basicForm.name.trim() || !basicForm.email.trim()) {
        throw new Error('Name and email are required fields.');
      }

      // Save basic profile
      const profileResponse = await makeAuthenticatedRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: basicForm.name.trim(),
          email: basicForm.email.trim(),
          phone: basicForm.phone.trim() || null
        })
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      // Save service center profile with addresses
      const centerResponse = await makeAuthenticatedRequest('/api/service-center/profile', {
        method: 'PUT',
        body: JSON.stringify({
          centerName: centerForm.centerName.trim(),
          gstNumber: centerForm.gstNumber.trim() || null,
          contactPerson: centerForm.contactPerson.trim() || null,
          serviceTypes: centerForm.serviceTypes,
          addresses: addresses.map(addr => ({
            label: addr.label.trim(),
            addressLine1: addr.addressLine1.trim(),
            addressLine2: addr.addressLine2?.trim() || null,
            city: addr.city.trim(),
            state: addr.state.trim(),
            pincode: addr.pincode.trim(),
            country: addr.country.trim(),
            isDefault: addr.isDefault
          }))
        })
      });

      if (!centerResponse.ok) {
        const errorData = await centerResponse.json();
        throw new Error(errorData.message || 'Failed to update service center profile');
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      setIsEditing(false);
      if (onProfileUpdate) {
        onProfileUpdate();
      }
      await fetchProfile();

    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await makeAuthenticatedRequest('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "Your password has been changed successfully.",
        });
        setIsChangePasswordOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive"
      });
    }
  };

  const addAddress = () => {
    if (!newAddress.label || !newAddress.addressLine1 || !newAddress.city) {
      toast({
        title: "Error",
        description: "Please fill in all required address fields.",
        variant: "destructive"
      });
      return;
    }

    setAddresses([...addresses, { ...newAddress, id: Date.now().toString() }]);
    setNewAddress({
      label: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      isDefault: false
    });
  };

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const setDefaultAddress = (index: number) => {
    setAddresses(addresses.map((addr, i) => ({
      ...addr,
      isDefault: i === index
    })));
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Settings
            </DialogTitle>
            <DialogDescription>
              Manage your personal information and service center details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Avatar className="w-16 h-16">
                <AvatarImage src={`/api/avatar/${profile?.id}`} />
                <AvatarFallback className="text-lg">
                  {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SC'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{profile?.name}</h3>
                <p className="text-sm text-gray-600">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{profile?.role}</Badge>
                  {profile?.serviceCenterProfile?.isVerified ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangePasswordOpen(true)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('basic')}
              >
                Basic Information
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'center' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('center')}
              >
                Service Center Details
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'addresses' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('addresses')}
              >
                Addresses
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={basicForm.name}
                      onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={basicForm.email}
                      onChange={(e) => setBasicForm({ ...basicForm, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={basicForm.phone}
                    onChange={(e) => setBasicForm({ ...basicForm, phone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            )}

            {activeTab === 'center' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="centerName">Service Center Name</Label>
                    <Input
                      id="centerName"
                      value={centerForm.centerName}
                      onChange={(e) => setCenterForm({ ...centerForm, centerName: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={centerForm.contactPerson}
                      onChange={(e) => setCenterForm({ ...centerForm, contactPerson: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={centerForm.gstNumber}
                    onChange={(e) => setCenterForm({ ...centerForm, gstNumber: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Repair', 'Maintenance', 'Installation', 'Warranty Service', 'Parts Replacement'].map((type) => (
                      <Badge
                        key={type}
                        variant={centerForm.serviceTypes.includes(type) ? 'default' : 'outline'}
                        className={`cursor-pointer ${!isEditing ? 'pointer-events-none' : ''}`}
                        onClick={() => {
                          if (isEditing) {
                            const newTypes = centerForm.serviceTypes.includes(type)
                              ? centerForm.serviceTypes.filter(t => t !== type)
                              : [...centerForm.serviceTypes, type];
                            setCenterForm({ ...centerForm, serviceTypes: newTypes });
                          }
                        }}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-4">
                {/* Existing Addresses */}
                <div className="space-y-3">
                  {addresses.map((address, index) => (
                    <Card key={index} className={address.isDefault ? 'border-blue-500' : ''}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{address.label}</span>
                              {address.isDefault && (
                                <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {address.addressLine1}
                              {address.addressLine2 && `, ${address.addressLine2}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.city}, {address.state} - {address.pincode}
                            </p>
                          </div>
                          {isEditing && (
                            <div className="flex gap-2">
                              {!address.isDefault && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDefaultAddress(index)}
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeAddress(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Add New Address */}
                {isEditing && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Add New Address</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={newAddress.label}
                          onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                          placeholder="e.g., Main Office, Warehouse, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input
                          value={newAddress.addressLine1}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 2 (Optional)</Label>
                        <Input
                          value={newAddress.addressLine2}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                          placeholder="Apartment, suite, etc."
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pincode</Label>
                          <Input
                            value={newAddress.pincode}
                            onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button onClick={addAddress} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Address
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                className="flex-1"
                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              >
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}