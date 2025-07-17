import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Settings,
  Building,
  Key,
  Shield,
  Globe,
  Palette,
  Bell,
  Users,
  Package,
  Truck,
  DollarSign,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Info,
  Lock,
  Unlock,
  Upload,
  Download,
  Trash2,
  Plus,
  Edit,
  ExternalLink,
  Code,
  Database,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Target,
  Zap,
  Activity
} from 'lucide-react';

interface BrandSettings {
  company: {
    name: string;
    logo: string;
    description: string;
    website: string;
    industry: string;
    size: string;
    founded: string;
  };
  contact: {
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    favicon: string;
    customCss: string;
  };
  api: {
    webhookUrl: string;
    apiKeys: Array<{
      id: string;
      name: string;
      key: string;
      permissions: string[];
      createdAt: string;
      lastUsed?: string;
      active: boolean;
    }>;
    rateLimits: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
  };
  integrations: {
    dtdc: {
      enabled: boolean;
      customerId: string;
      customerCode: string;
      apiKey: string;
      serviceType: string;
    };
    whatsapp: {
      enabled: boolean;
      accessToken: string;
      phoneNumberId: string;
    };
    email: {
      enabled: boolean;
      provider: string;
      smtpHost: string;
      smtpPort: number;
      username: string;
      password: string;
      fromEmail: string;
    };
    payment: {
      razorpay: {
        enabled: boolean;
        keyId: string;
        keySecret: string;
      };
    };
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    ipWhitelist: string[];
    allowedDomains: string[];
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  };
  preferences: {
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
    autoBackup: boolean;
    maintenanceMode: boolean;
  };
}

interface EnhancedBrandSettingsConfigurationProps {
  brandId: string;
}

const EnhancedBrandSettingsConfiguration: React.FC<EnhancedBrandSettingsConfigurationProps> = ({
  brandId
}) => {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, [brandId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/brand/settings?brandId=${brandId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        // Initialize with default settings
        setSettings({
          company: {
            name: '',
            logo: '',
            description: '',
            website: '',
            industry: '',
            size: '',
            founded: ''
          },
          contact: {
            email: '',
            phone: '',
            address: {
              street: '',
              city: '',
              state: '',
              pincode: '',
              country: 'India'
            }
          },
          branding: {
            primaryColor: '#3b82f6',
            secondaryColor: '#f97316',
            logoUrl: '',
            favicon: '',
            customCss: ''
          },
          api: {
            webhookUrl: '',
            apiKeys: [],
            rateLimits: {
              requestsPerMinute: 60,
              requestsPerHour: 1000,
              requestsPerDay: 10000
            }
          },
          integrations: {
            dtdc: {
              enabled: false,
              customerId: '',
              customerCode: '',
              apiKey: '',
              serviceType: 'B2C PRIORITY'
            },
            whatsapp: {
              enabled: false,
              accessToken: '',
              phoneNumberId: ''
            },
            email: {
              enabled: false,
              provider: 'smtp',
              smtpHost: '',
              smtpPort: 587,
              username: '',
              password: '',
              fromEmail: ''
            },
            payment: {
              razorpay: {
                enabled: false,
                keyId: '',
                keySecret: ''
              }
            }
          },
          security: {
            twoFactorEnabled: false,
            sessionTimeout: 30,
            ipWhitelist: [],
            allowedDomains: [],
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: false
            }
          },
          preferences: {
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY',
            currency: 'INR',
            language: 'en',
            autoBackup: true,
            maintenanceMode: false
          }
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch('/api/brand/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, settings })
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your settings have been updated successfully"
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/brand/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, name: newApiKeyName })
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => prev ? {
          ...prev,
          api: {
            ...prev.api,
            apiKeys: [...prev.api.apiKeys, data.apiKey]
          }
        } : null);
        
        setNewApiKeyName('');
        setShowCreateApiKey(false);
        
        toast({
          title: "API Key Generated",
          description: "New API key has been created successfully"
        });
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: "Error",
        description: "Failed to generate API key",
        variant: "destructive"
      });
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/brand/api-keys/${keyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSettings(prev => prev ? {
          ...prev,
          api: {
            ...prev.api,
            apiKeys: prev.api.apiKeys.filter(key => key.id !== keyId)
          }
        } : null);
        
        toast({
          title: "API Key Revoked",
          description: "API key has been revoked successfully"
        });
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard"
    });
  };

  const testIntegration = async (type: string) => {
    try {
      const response = await fetch(`/api/brand/test-integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, type, settings: settings?.integrations })
      });

      if (response.ok) {
        toast({
          title: "Test Successful",
          description: `${type} integration is working correctly`
        });
      } else {
        const error = await response.json();
        toast({
          title: "Test Failed",
          description: error.message || `${type} integration test failed`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing integration:', error);
      toast({
        title: "Test Failed",
        description: "Network error during integration test",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load settings. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Settings & Configuration
          </h2>
          <p className="text-gray-600">Manage your brand settings and integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchSettings} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={settings.company.name}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, name: e.target.value }
                    })}
                    placeholder="Enter company name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company-description">Description</Label>
                  <Textarea
                    id="company-description"
                    value={settings.company.description}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, description: e.target.value }
                    })}
                    placeholder="Brief description of your company"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    value={settings.company.website}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, website: e.target.value }
                    })}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-industry">Industry</Label>
                    <Select
                      value={settings.company.industry}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        company: { ...settings.company, industry: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="company-size">Company Size</Label>
                    <Select
                      value={settings.company.size}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        company: { ...settings.company, size: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-1000">201-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={settings.contact.email}
                    onChange={(e) => setSettings({
                      ...settings,
                      contact: { ...settings.contact, email: e.target.value }
                    })}
                    placeholder="contact@company.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={settings.contact.phone}
                    onChange={(e) => setSettings({
                      ...settings,
                      contact: { ...settings.contact, phone: e.target.value }
                    })}
                    placeholder="+91 9876543210"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address-street">Street Address</Label>
                  <Input
                    id="address-street"
                    value={settings.contact.address.street}
                    onChange={(e) => setSettings({
                      ...settings,
                      contact: {
                        ...settings.contact,
                        address: { ...settings.contact.address, street: e.target.value }
                      }
                    })}
                    placeholder="Street address"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address-city">City</Label>
                    <Input
                      id="address-city"
                      value={settings.contact.address.city}
                      onChange={(e) => setSettings({
                        ...settings,
                        contact: {
                          ...settings.contact,
                          address: { ...settings.contact.address, city: e.target.value }
                        }
                      })}
                      placeholder="City"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address-state">State</Label>
                    <Input
                      id="address-state"
                      value={settings.contact.address.state}
                      onChange={(e) => setSettings({
                        ...settings,
                        contact: {
                          ...settings.contact,
                          address: { ...settings.contact.address, state: e.target.value }
                        }
                      })}
                      placeholder="State"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address-pincode">Pincode</Label>
                    <Input
                      id="address-pincode"
                      value={settings.contact.address.pincode}
                      onChange={(e) => setSettings({
                        ...settings,
                        contact: {
                          ...settings.contact,
                          address: { ...settings.contact.address, pincode: e.target.value }
                        }
                      })}
                      placeholder="123456"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address-country">Country</Label>
                    <Select
                      value={settings.contact.address.country}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        contact: {
                          ...settings.contact,
                          address: { ...settings.contact.address, country: value }
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Keys
                </CardTitle>
                <CardDescription>Manage API keys for external integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Active API Keys</h4>
                  <Dialog open={showCreateApiKey} onOpenChange={setShowCreateApiKey}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate New API Key</DialogTitle>
                        <DialogDescription>
                          Create a new API key for external integrations
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="api-key-name">Key Name</Label>
                          <Input
                            id="api-key-name"
                            value={newApiKeyName}
                            onChange={(e) => setNewApiKeyName(e.target.value)}
                            placeholder="e.g., Mobile App, Third Party Integration"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowCreateApiKey(false)}>
                            Cancel
                          </Button>
                          <Button onClick={generateApiKey}>
                            Generate Key
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-3">
                  {settings.api.apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No API keys generated</p>
                    </div>
                  ) : (
                    settings.api.apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h5 className="font-medium">{apiKey.name}</h5>
                            <p className="text-sm text-gray-600">
                              Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={apiKey.active ? 'default' : 'secondary'}>
                              {apiKey.active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => revokeApiKey(apiKey.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            value={showApiKey === apiKey.id ? apiKey.key : '••••••••••••••••'}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                          >
                            {showApiKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(apiKey.key)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {apiKey.lastUsed && (
                          <p className="text-xs text-gray-500 mt-2">
                            Last used: {new Date(apiKey.lastUsed).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Rate Limits
                </CardTitle>
                <CardDescription>Configure API rate limiting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rate-limit-minute">Requests per minute</Label>
                  <Input
                    id="rate-limit-minute"
                    type="number"
                    value={settings.api.rateLimits.requestsPerMinute}
                    onChange={(e) => setSettings({
                      ...settings,
                      api: {
                        ...settings.api,
                        rateLimits: {
                          ...settings.api.rateLimits,
                          requestsPerMinute: parseInt(e.target.value) || 0
                        }
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="rate-limit-hour">Requests per hour</Label>
                  <Input
                    id="rate-limit-hour"
                    type="number"
                    value={settings.api.rateLimits.requestsPerHour}
                    onChange={(e) => setSettings({
                      ...settings,
                      api: {
                        ...settings.api,
                        rateLimits: {
                          ...settings.api.rateLimits,
                          requestsPerHour: parseInt(e.target.value) || 0
                        }
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="rate-limit-day">Requests per day</Label>
                  <Input
                    id="rate-limit-day"
                    type="number"
                    value={settings.api.rateLimits.requestsPerDay}
                    onChange={(e) => setSettings({
                      ...settings,
                      api: {
                        ...settings.api,
                        rateLimits: {
                          ...settings.api.rateLimits,
                          requestsPerDay: parseInt(e.target.value) || 0
                        }
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    value={settings.api.webhookUrl}
                    onChange={(e) => setSettings({
                      ...settings,
                      api: { ...settings.api, webhookUrl: e.target.value }
                    })}
                    placeholder="https://your-domain.com/webhook"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DTDC Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  DTDC Integration
                </CardTitle>
                <CardDescription>Configure DTDC courier service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dtdc-enabled">Enable DTDC</Label>
                  <Switch
                    id="dtdc-enabled"
                    checked={settings.integrations.dtdc.enabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        dtdc: { ...settings.integrations.dtdc, enabled: checked }
                      }
                    })}
                  />
                </div>
                
                {settings.integrations.dtdc.enabled && (
                  <>
                    <div>
                      <Label htmlFor="dtdc-customer-id">Customer ID</Label>
                      <Input
                        id="dtdc-customer-id"
                        value={settings.integrations.dtdc.customerId}
                        onChange={(e) => setSettings({
                          ...settings,
                          integrations: {
                            ...settings.integrations,
                            dtdc: { ...settings.integrations.dtdc, customerId: e.target.value }
                          }
                        })}
                        placeholder="DTDC Customer ID"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="dtdc-customer-code">Customer Code</Label>
                      <Input
                        id="dtdc-customer-code"
                        value={settings.integrations.dtdc.customerCode}
                        onChange={(e) => setSettings({
                          ...settings,
                          integrations: {
                            ...settings.integrations,
                            dtdc: { ...settings.integrations.dtdc, customerCode: e.target.value }
                          }
                        })}
                        placeholder="DTDC Customer Code"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="dtdc-api-key">API Key</Label>
                      <Input
                        id="dtdc-api-key"
                        type="password"
                        value={settings.integrations.dtdc.apiKey}
                        onChange={(e) => setSettings({
                          ...settings,
                          integrations: {
                            ...settings.integrations,
                            dtdc: { ...settings.integrations.dtdc, apiKey: e.target.value }
                          }
                        })}
                        placeholder="DTDC API Key"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="dtdc-service-type">Service Type</Label>
                      <Select
                        value={settings.integrations.dtdc.serviceType}
                        onValueChange={(value) => setSettings({
                          ...settings,
                          integrations: {
                            ...settings.integrations,
                            dtdc: { ...settings.integrations.dtdc, serviceType: value }
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="B2C PRIORITY">B2C Priority</SelectItem>
                          <SelectItem value="B2C EXPRESS">B2C Express</SelectItem>
                          <SelectItem value="B2B EXPRESS">B2B Express</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => testIntegration('dtdc')}
                      className="w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Test DTDC Connection
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Integration
                </CardTitle>
                <CardDescription>Configure payment gateway</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="razorpay-enabled">Enable Razorpay</Label>
                  <Switch
                    id="razorpay-enabled"
                    checked={settings.integrations.payment.razorpay.enabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        payment: {
                          ...settings.integrations.payment,
                          razorpay: { ...settings.integrations.payment.razorpay, enabled: checked }
                        }
                      }
                    })}
                  />
                </div>
                
                {settings.integrations.payment.razorpay.enabled && (
                  <>
                    <div>
                      <Label htmlFor="razorpay-key-id">Key ID</Label>
                      <Input
                        id="razorpay-key-id"
                        value={settings.integrations.payment.razorpay.keyId}
                        onChange={(e) => setSettings({
                          ...settings,
                          integrations: {
                            ...settings.integrations,
                            payment: {
                              ...settings.integrations.payment,
                              razorpay: { ...settings.integrations.payment.razorpay, keyId: e.target.value }
                            }
                          }
                        })}
                        placeholder="Razorpay Key ID"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="razorpay-key-secret">Key Secret</Label>
                      <Input
                        id="razorpay-key-secret"
                        type="password"
                        value={settings.integrations.payment.razorpay.keySecret}
                        onChange={(e) => setSettings({
                          ...settings,
                          integrations: {
                            ...settings.integrations,
                            payment: {
                              ...settings.integrations.payment,
                              razorpay: { ...settings.integrations.payment.razorpay, keySecret: e.target.value }
                            }
                          }
                        })}
                        placeholder="Razorpay Key Secret"
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => testIntegration('razorpay')}
                      className="w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Test Payment Gateway
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                  <Switch
                    id="two-factor"
                    checked={settings.security.twoFactorEnabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      security: { ...settings.security, twoFactorEnabled: checked }
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, sessionTimeout: parseInt(e.target.value) || 30 }
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="ip-whitelist">IP Whitelist (one per line)</Label>
                  <Textarea
                    id="ip-whitelist"
                    value={settings.security.ipWhitelist.join('\n')}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        ipWhitelist: e.target.value.split('\n').filter(ip => ip.trim())
                      }
                    })}
                    placeholder="192.168.1.1&#10;10.0.0.1"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Password Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="min-length">Minimum Length</Label>
                  <Input
                    id="min-length"
                    type="number"
                    value={settings.security.passwordPolicy.minLength}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        passwordPolicy: {
                          ...settings.security.passwordPolicy,
                          minLength: parseInt(e.target.value) || 8
                        }
                      }
                    })}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-uppercase">Require Uppercase</Label>
                    <Switch
                      id="require-uppercase"
                      checked={settings.security.passwordPolicy.requireUppercase}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            requireUppercase: checked
                          }
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-numbers">Require Numbers</Label>
                    <Switch
                      id="require-numbers"
                      checked={settings.security.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            requireNumbers: checked
                          }
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-special">Require Special Characters</Label>
                    <Switch
                      id="require-special"
                      checked={settings.security.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            requireSpecialChars: checked
                          }
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                General Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.preferences.timezone}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, timezone: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select
                    value={settings.preferences.dateFormat}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, dateFormat: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.preferences.currency}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, currency: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-backup">Auto Backup</Label>
                  <Switch
                    id="auto-backup"
                    checked={settings.preferences.autoBackup}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, autoBackup: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.preferences.maintenanceMode}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, maintenanceMode: checked }
                    })}
                  />
                </div>
                
                {settings.preferences.maintenanceMode && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Maintenance mode is enabled. Your system will be inaccessible to users.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedBrandSettingsConfiguration;