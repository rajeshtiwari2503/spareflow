import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Upload,
  Globe,
  Clock,
  FileText,
  Briefcase,
  Users,
  Truck,
  Star,
  Calendar,
  Link
} from 'lucide-react';

interface Address {
  id?: string;
  type: 'REGISTERED_OFFICE' | 'WAREHOUSE' | 'BILLING' | 'SHIPPING' | 'OTHER';
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  isDefaultFor?: string[]; // ['billing', 'shipping', 'registered']
}

interface BusinessSettings {
  operatingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  serviceAreas: string[];
  preferredCourierPartners: string[];
  specialInstructions: string;
  termsAndConditions: string;
}

interface CompanyInfo {
  companyName: string;
  registrationNumber: string;
  gstNumber: string;
  panNumber: string;
  industryType: string;
  companySize: string;
}

interface ContactDetails {
  primaryContactPerson: string;
  emailAddress: string;
  phoneNumbers: {
    primary: string;
    secondary?: string;
    whatsapp?: string;
  };
  websiteUrl?: string;
  socialMediaLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  companyInfo?: CompanyInfo;
  contactDetails?: ContactDetails;
  addresses: Address[];
  businessSettings?: BusinessSettings;
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    language: string;
    timezone: string;
  };
}

const INDUSTRY_TYPES = [
  'Manufacturing',
  'Automotive',
  'Electronics',
  'Healthcare',
  'Construction',
  'Agriculture',
  'Textile',
  'Food & Beverage',
  'Chemical',
  'Other'
];

const COMPANY_SIZES = [
  'Startup (1-10 employees)',
  'Small (11-50 employees)',
  'Medium (51-200 employees)',
  'Large (201-1000 employees)',
  'Enterprise (1000+ employees)'
];

const COURIER_PARTNERS = [
  'DTDC',
  'Blue Dart',
  'FedEx',
  'DHL',
  'India Post',
  'Delhivery',
  'Ecom Express',
  'Xpressbees'
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'pa', label: 'Punjabi' }
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'UAE Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
];

const ComprehensiveProfileManager: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Initialize profile data
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/comprehensive-profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        // Initialize with default structure
        const defaultProfile: UserProfile = {
          id: user?.id || '',
          name: user?.name || '',
          email: user?.email || '',
          role: user?.role || '',
          companyInfo: {
            companyName: '',
            registrationNumber: '',
            gstNumber: '',
            panNumber: '',
            industryType: '',
            companySize: ''
          },
          contactDetails: {
            primaryContactPerson: user?.name || '',
            emailAddress: user?.email || '',
            phoneNumbers: {
              primary: user?.phone || ''
            },
            socialMediaLinks: {}
          },
          addresses: [],
          businessSettings: {
            operatingHours: {
              monday: { open: '09:00', close: '18:00', closed: false },
              tuesday: { open: '09:00', close: '18:00', closed: false },
              wednesday: { open: '09:00', close: '18:00', closed: false },
              thursday: { open: '09:00', close: '18:00', closed: false },
              friday: { open: '09:00', close: '18:00', closed: false },
              saturday: { open: '09:00', close: '18:00', closed: false },
              sunday: { open: '09:00', close: '18:00', closed: true }
            },
            serviceAreas: [],
            preferredCourierPartners: [],
            specialInstructions: '',
            termsAndConditions: ''
          },
          preferences: {
            emailNotifications: true,
            smsNotifications: true,
            pushNotifications: true,
            language: 'en',
            timezone: 'Asia/Kolkata'
          }
        };
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Initialize with default structure on error
      const defaultProfile: UserProfile = {
        id: user?.id || '',
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || '',
        companyInfo: {
          companyName: '',
          registrationNumber: '',
          gstNumber: '',
          panNumber: '',
          industryType: '',
          companySize: ''
        },
        contactDetails: {
          primaryContactPerson: user?.name || '',
          emailAddress: user?.email || '',
          phoneNumbers: {
            primary: user?.phone || ''
          },
          socialMediaLinks: {}
        },
        addresses: [],
        businessSettings: {
          operatingHours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '18:00', closed: false },
            sunday: { open: '09:00', close: '18:00', closed: true }
          },
          serviceAreas: [],
          preferredCourierPartners: [],
          specialInstructions: '',
          termsAndConditions: ''
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
          language: 'en',
          timezone: 'Asia/Kolkata'
        }
      };
      setProfile(defaultProfile);
      toast({
        title: "Warning",
        description: "Using default profile settings. Please update your information.",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveProfile = useCallback(async () => {
    if (!profile) return;

    try {
      setSaving(true);
      const response = await fetch('/api/auth/comprehensive-profile', {
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
  }, [profile, refreshUser]);

  const handlePasswordChange = useCallback(async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully"
        });
        setShowPasswordDialog(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive"
      });
    }
  }, [passwordForm]);

  const addAddress = useCallback(() => {
    const newAddress: Address = {
      type: 'OTHER',
      label: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      isDefault: profile?.addresses.length === 0,
      isDefaultFor: []
    };
    setEditingAddress(newAddress);
    setShowAddAddress(true);
  }, [profile?.addresses.length]);

  const saveAddress = useCallback(() => {
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
  }, [editingAddress, profile]);

  const deleteAddress = useCallback((addressId: string) => {
    if (!profile) return;

    const updatedAddresses = profile.addresses.filter(addr => addr.id !== addressId);
    
    // If we deleted the default address, make the first remaining address default
    if (updatedAddresses.length > 0 && !updatedAddresses.some(addr => addr.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    setProfile({ ...profile, addresses: updatedAddresses });
  }, [profile]);

  const updateProfile = useCallback((field: keyof UserProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  }, [profile]);

  const updateCompanyInfo = useCallback((field: keyof CompanyInfo, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      companyInfo: { ...profile.companyInfo!, [field]: value }
    });
  }, [profile]);

  const updateContactDetails = useCallback((field: string, value: any) => {
    if (!profile) return;
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfile({
        ...profile,
        contactDetails: {
          ...profile.contactDetails!,
          [parent]: { ...profile.contactDetails![parent as keyof ContactDetails], [child]: value }
        }
      });
    } else {
      setProfile({
        ...profile,
        contactDetails: { ...profile.contactDetails!, [field]: value }
      });
    }
  }, [profile]);

  const updateBusinessSettings = useCallback((field: string, value: any) => {
    if (!profile) return;
    if (field.includes('.')) {
      const [parent, child, grandchild] = field.split('.');
      if (grandchild) {
        setProfile({
          ...profile,
          businessSettings: {
            ...profile.businessSettings!,
            [parent]: {
              ...profile.businessSettings![parent as keyof BusinessSettings],
              [child]: {
                ...(profile.businessSettings![parent as keyof BusinessSettings] as any)[child],
                [grandchild]: value
              }
            }
          }
        });
      } else {
        setProfile({
          ...profile,
          businessSettings: {
            ...profile.businessSettings!,
            [parent]: { ...profile.businessSettings![parent as keyof BusinessSettings], [child]: value }
          }
        });
      }
    } else {
      setProfile({
        ...profile,
        businessSettings: { ...profile.businessSettings!, [field]: value }
      });
    }
  }, [profile]);

  const updatePreferences = useCallback((field: string, value: any) => {
    if (!profile) return;
    setProfile({
      ...profile,
      preferences: { ...profile.preferences, [field]: value }
    });
  }, [profile]);

  const getAddressTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'REGISTERED_OFFICE': return 'bg-blue-100 text-blue-800';
      case 'WAREHOUSE': return 'bg-purple-100 text-purple-800';
      case 'BILLING': return 'bg-green-100 text-green-800';
      case 'SHIPPING': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getCompletionPercentage = useMemo(() => {
    if (!profile) return 0;
    
    let completed = 0;
    let total = 0;

    // Company Information (6 fields)
    total += 6;
    if (profile.companyInfo?.companyName) completed++;
    if (profile.companyInfo?.registrationNumber) completed++;
    if (profile.companyInfo?.gstNumber) completed++;
    if (profile.companyInfo?.panNumber) completed++;
    if (profile.companyInfo?.industryType) completed++;
    if (profile.companyInfo?.companySize) completed++;

    // Contact Details (4 fields)
    total += 4;
    if (profile.contactDetails?.primaryContactPerson) completed++;
    if (profile.contactDetails?.emailAddress) completed++;
    if (profile.contactDetails?.phoneNumbers?.primary) completed++;
    if (profile.contactDetails?.websiteUrl) completed++;

    // Address Management (1 field)
    total += 1;
    if (profile.addresses.length > 0) completed++;

    // Business Settings (4 fields)
    total += 4;
    if (profile.businessSettings?.serviceAreas?.length) completed++;
    if (profile.businessSettings?.preferredCourierPartners?.length) completed++;
    if (profile.businessSettings?.specialInstructions) completed++;
    if (profile.businessSettings?.termsAndConditions) completed++;

    return Math.round((completed / total) * 100);
  }, [profile]);

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
            Profile Completion ({getCompletionPercentage}%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getCompletionPercentage}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Company Info</span>
              <Badge variant={profile.companyInfo?.companyName ? "default" : "secondary"}>
                {profile.companyInfo?.companyName ? "Complete" : "Incomplete"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Contact Details</span>
              <Badge variant={profile.contactDetails?.primaryContactPerson ? "default" : "secondary"}>
                {profile.contactDetails?.primaryContactPerson ? "Complete" : "Incomplete"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Addresses</span>
              <Badge variant={profile.addresses.length > 0 ? "default" : "destructive"}>
                {profile.addresses.length > 0 ? `${profile.addresses.length} Address(es)` : "Required"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Business Settings</span>
              <Badge variant={profile.businessSettings?.serviceAreas?.length ? "default" : "secondary"}>
                {profile.businessSettings?.serviceAreas?.length ? "Complete" : "Optional"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Company Information Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Basic company details for business identification and compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={profile.companyInfo?.companyName || ''}
                    onChange={(e) => updateCompanyInfo('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={profile.companyInfo?.registrationNumber || ''}
                    onChange={(e) => updateCompanyInfo('registrationNumber', e.target.value)}
                    placeholder="Enter registration number"
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={profile.companyInfo?.gstNumber || ''}
                    onChange={(e) => updateCompanyInfo('gstNumber', e.target.value)}
                    placeholder="Enter GST number"
                  />
                </div>
                <div>
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={profile.companyInfo?.panNumber || ''}
                    onChange={(e) => updateCompanyInfo('panNumber', e.target.value)}
                    placeholder="Enter PAN number"
                  />
                </div>
                <div>
                  <Label htmlFor="industryType">Industry Type</Label>
                  <Select
                    value={profile.companyInfo?.industryType || ''}
                    onValueChange={(value) => updateCompanyInfo('industryType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_TYPES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select
                    value={profile.companyInfo?.companySize || ''}
                    onValueChange={(value) => updateCompanyInfo('companySize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Details Tab */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Details
              </CardTitle>
              <CardDescription>
                Primary contact information and communication channels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryContactPerson">Primary Contact Person *</Label>
                  <Input
                    id="primaryContactPerson"
                    value={profile.contactDetails?.primaryContactPerson || ''}
                    onChange={(e) => updateContactDetails('primaryContactPerson', e.target.value)}
                    placeholder="Enter primary contact person"
                  />
                </div>
                <div>
                  <Label htmlFor="emailAddress">Email Address *</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={profile.contactDetails?.emailAddress || ''}
                    onChange={(e) => updateContactDetails('emailAddress', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryPhone">Primary Phone Number *</Label>
                  <Input
                    id="primaryPhone"
                    value={profile.contactDetails?.phoneNumbers?.primary || ''}
                    onChange={(e) => updateContactDetails('phoneNumbers.primary', e.target.value)}
                    placeholder="Enter primary phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="secondaryPhone">Secondary Phone Number</Label>
                  <Input
                    id="secondaryPhone"
                    value={profile.contactDetails?.phoneNumbers?.secondary || ''}
                    onChange={(e) => updateContactDetails('phoneNumbers.secondary', e.target.value)}
                    placeholder="Enter secondary phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsappPhone">WhatsApp Number</Label>
                  <Input
                    id="whatsappPhone"
                    value={profile.contactDetails?.phoneNumbers?.whatsapp || ''}
                    onChange={(e) => updateContactDetails('phoneNumbers.whatsapp', e.target.value)}
                    placeholder="Enter WhatsApp number"
                  />
                </div>
                <div>
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    value={profile.contactDetails?.websiteUrl || ''}
                    onChange={(e) => updateContactDetails('websiteUrl', e.target.value)}
                    placeholder="Enter website URL"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-base font-medium">Social Media Links</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={profile.contactDetails?.socialMediaLinks?.linkedin || ''}
                      onChange={(e) => updateContactDetails('socialMediaLinks.linkedin', e.target.value)}
                      placeholder="LinkedIn profile URL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      value={profile.contactDetails?.socialMediaLinks?.twitter || ''}
                      onChange={(e) => updateContactDetails('socialMediaLinks.twitter', e.target.value)}
                      placeholder="Twitter profile URL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      value={profile.contactDetails?.socialMediaLinks?.facebook || ''}
                      onChange={(e) => updateContactDetails('socialMediaLinks.facebook', e.target.value)}
                      placeholder="Facebook page URL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={profile.contactDetails?.socialMediaLinks?.instagram || ''}
                      onChange={(e) => updateContactDetails('socialMediaLinks.instagram', e.target.value)}
                      placeholder="Instagram profile URL"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Management Tab */}
        <TabsContent value="addresses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Management
                  </CardTitle>
                  <CardDescription>
                    Manage multiple addresses for different business purposes
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
                    ⚠️ At least one address is required for business operations
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
                            {address.type.replace('_', ' ')}
                          </Badge>
                          {address.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                          {address.isDefaultFor?.map((purpose) => (
                            <Badge key={purpose} variant="secondary" className="text-xs">
                              Default {purpose}
                            </Badge>
                          ))}
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
                        onValueChange={(value: Address['type']) =>
                          setEditingAddress({ ...editingAddress, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGISTERED_OFFICE">Registered Office</SelectItem>
                          <SelectItem value="WAREHOUSE">Warehouse Location</SelectItem>
                          <SelectItem value="BILLING">Billing Address</SelectItem>
                          <SelectItem value="SHIPPING">Shipping Address</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Address Label *</Label>
                      <Input
                        value={editingAddress.label}
                        onChange={(e) => setEditingAddress({ ...editingAddress, label: e.target.value })}
                        placeholder="e.g., Head Office, Main Warehouse"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Address Line 1 *</Label>
                      <Input
                        value={editingAddress.addressLine1}
                        onChange={(e) => setEditingAddress({ ...editingAddress, addressLine1: e.target.value })}
                        placeholder="Building number, Street name"
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

        {/* Business Settings Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Business Settings
              </CardTitle>
              <CardDescription>
                Configure operational settings and business preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Operating Hours */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Operating Hours
                </Label>
                <div className="mt-2 space-y-2">
                  {Object.entries(profile.businessSettings?.operatingHours || {}).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium capitalize">{day}</div>
                      <Switch
                        checked={!hours.closed}
                        onCheckedChange={(checked) => 
                          updateBusinessSettings(`operatingHours.${day}.closed`, !checked)
                        }
                      />
                      {!hours.closed && (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateBusinessSettings(`operatingHours.${day}.open`, e.target.value)}
                            className="w-32"
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateBusinessSettings(`operatingHours.${day}.close`, e.target.value)}
                            className="w-32"
                          />
                        </>
                      )}
                      {hours.closed && <span className="text-gray-500">Closed</span>}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Service Areas */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Service Areas
                </Label>
                <Textarea
                  value={profile.businessSettings?.serviceAreas?.join(', ') || ''}
                  onChange={(e) => updateBusinessSettings('serviceAreas', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="Enter service areas separated by commas (e.g., Mumbai, Delhi, Bangalore)"
                  className="mt-2"
                />
              </div>

              {/* Preferred Courier Partners */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Preferred Courier Partners
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COURIER_PARTNERS.map((partner) => (
                    <Badge
                      key={partner}
                      variant={profile.businessSettings?.preferredCourierPartners?.includes(partner) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = profile.businessSettings?.preferredCourierPartners || [];
                        const updated = current.includes(partner)
                          ? current.filter(p => p !== partner)
                          : [...current, partner];
                        updateBusinessSettings('preferredCourierPartners', updated);
                      }}
                    >
                      {partner}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Special Instructions
                </Label>
                <Textarea
                  value={profile.businessSettings?.specialInstructions || ''}
                  onChange={(e) => updateBusinessSettings('specialInstructions', e.target.value)}
                  placeholder="Enter any special handling instructions or requirements"
                  className="mt-2"
                />
              </div>

              {/* Terms & Conditions */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Terms & Conditions
                </Label>
                <Textarea
                  value={profile.businessSettings?.termsAndConditions || ''}
                  onChange={(e) => updateBusinessSettings('termsAndConditions', e.target.value)}
                  placeholder="Enter your business terms and conditions"
                  className="mt-2"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                User Preferences
              </CardTitle>
              <CardDescription>
                Configure your personal preferences and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Settings */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={profile.preferences?.emailNotifications || false}
                      onCheckedChange={(checked) => updatePreferences('emailNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-600">Receive updates via SMS</p>
                    </div>
                    <Switch
                      checked={profile.preferences?.smsNotifications || false}
                      onCheckedChange={(checked) => updatePreferences('smsNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-gray-600">Receive browser notifications</p>
                    </div>
                    <Switch
                      checked={profile.preferences?.pushNotifications || false}
                      onCheckedChange={(checked) => updatePreferences('pushNotifications', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Regional Settings */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Regional Settings
                </Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Language</Label>
                    <Select
                      value={profile.preferences?.language || 'en'}
                      onValueChange={(value) => updatePreferences('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Select
                      value={profile.preferences?.timezone || 'Asia/Kolkata'}
                      onValueChange={(value) => updatePreferences('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Security Settings */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </Label>
                <div className="mt-2">
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and choose a new one
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Current Password</Label>
                          <Input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>New Password</Label>
                          <Input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          />
                        </div>
                        <div>
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
                            onClick={() => setShowPasswordDialog(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handlePasswordChange}
                            className="flex-1"
                            disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                          >
                            Change Password
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={saving} size="lg">
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

export default ComprehensiveProfileManager;