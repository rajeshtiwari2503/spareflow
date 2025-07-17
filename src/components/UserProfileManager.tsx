import React, { useState } from 'react';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  User, 
  Settings, 
  Shield, 
  Clock, 
  Bell, 
  Palette, 
  Globe, 
  Monitor,
  Eye,
  EyeOff,
  Save,
  RefreshCw
} from 'lucide-react';

export default function UserProfileManager() {
  const { 
    userInfo, 
    sessionInfo, 
    updateProfile, 
    updatePreferences, 
    changePassword,
    refreshUser,
    can,
    loading,
    error,
    clearError
  } = useUserContext();
  
  const { toast } = useToast();
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: userInfo?.name || '',
    email: userInfo?.email || '',
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showPasswords: false,
  });
  
  // Preferences state
  const [preferences, setPreferences] = useState(userInfo?.preferences || {
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    dashboard: {
      defaultView: 'overview',
      itemsPerPage: 10,
    },
  });
  
  const [isUpdating, setIsUpdating] = useState(false);

  if (!userInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Please log in to view your profile.</p>
        </CardContent>
      </Card>
    );
  }

  const handleProfileUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await updateProfile(profileForm);
      if (result.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update profile.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (result.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been changed successfully.",
        });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          showPasswords: false,
        });
      } else {
        toast({
          title: "Password Change Failed",
          description: result.error || "Failed to change password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await updatePreferences(preferences);
      if (result.success) {
        toast({
          title: "Preferences Updated",
          description: "Your preferences have been saved.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update preferences.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-semibold">
                {userInfo.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {userInfo.name}
                {!userInfo.profileComplete && (
                  <Badge variant="outline" className="text-orange-600">
                    Profile Incomplete
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span>{userInfo.email}</span>
                <Badge variant="secondary">{userInfo.displayRole}</Badge>
                {userInfo.isActive && (
                  <Badge variant="outline" className="text-green-600">
                    Active
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshUser}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Session Info */}
      {sessionInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Session Status</Label>
                <p className={sessionInfo.isValid ? 'text-green-600' : 'text-red-600'}>
                  {sessionInfo.isValid ? 'Active' : 'Expired'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Time Remaining</Label>
                <p className={sessionInfo.isExpiringSoon ? 'text-orange-600' : ''}>
                  {sessionInfo.formattedTimeLeft}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Login</Label>
                <p>{userInfo.lastLogin?.toLocaleString() || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Permissions</Label>
                <p>{userInfo.permissions.length} granted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-red-800">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={userInfo.displayRole} disabled />
              </div>
              <Button 
                onClick={handleProfileUpdate} 
                disabled={isUpdating}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={passwordForm.showPasswords ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={passwordForm.showPasswords ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={passwordForm.showPasswords ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="showPasswords"
                  checked={passwordForm.showPasswords}
                  onCheckedChange={(checked) => setPasswordForm(prev => ({ ...prev, showPasswords: checked }))}
                />
                <Label htmlFor="showPasswords" className="flex items-center gap-2">
                  {passwordForm.showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  Show passwords
                </Label>
              </div>
              <Button 
                onClick={handlePasswordChange} 
                disabled={isUpdating || !passwordForm.currentPassword || !passwordForm.newPassword}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                {isUpdating ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>User Preferences</CardTitle>
              <CardDescription>
                Customize your experience and notification settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Settings */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme
                </Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, theme: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Language Settings */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language
                </Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Notification Settings */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <Switch
                      id="emailNotifications"
                      checked={preferences.notifications?.email}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, email: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushNotifications">Push Notifications</Label>
                    <Switch
                      id="pushNotifications"
                      checked={preferences.notifications?.push}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, push: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <Switch
                      id="smsNotifications"
                      checked={preferences.notifications?.sms}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, sms: checked }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dashboard Settings */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Dashboard
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultView">Default View</Label>
                    <Select
                      value={preferences.dashboard?.defaultView}
                      onValueChange={(value) => 
                        setPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, defaultView: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overview">Overview</SelectItem>
                        <SelectItem value="analytics">Analytics</SelectItem>
                        <SelectItem value="recent">Recent Activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemsPerPage">Items Per Page</Label>
                    <Select
                      value={preferences.dashboard?.itemsPerPage?.toString()}
                      onValueChange={(value) => 
                        setPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, itemsPerPage: parseInt(value) }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handlePreferencesUpdate} 
                disabled={isUpdating}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions & Access</CardTitle>
              <CardDescription>
                View your current permissions and access levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Role</Label>
                  <p className="text-sm text-muted-foreground">{userInfo.displayRole}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-base font-medium">Permissions</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {userInfo.permissions.map((permission) => (
                      <Badge key={permission} variant="outline">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                  {userInfo.permissions.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">No specific permissions assigned.</p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-base font-medium">Access Level</Label>
                  <div className="mt-2 space-y-2">
                    {can('all.access') && (
                      <Badge className="bg-red-100 text-red-800">Full System Access</Badge>
                    )}
                    {can('user.manage') && (
                      <Badge className="bg-blue-100 text-blue-800">User Management</Badge>
                    )}
                    {can('system.config') && (
                      <Badge className="bg-purple-100 text-purple-800">System Configuration</Badge>
                    )}
                    {can('wallet.manage') && (
                      <Badge className="bg-green-100 text-green-800">Wallet Management</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}