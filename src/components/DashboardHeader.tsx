import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  User, 
  Settings, 
  LogOut, 
  AlertTriangle, 
  RefreshCw,
  Bell,
  Menu,
  ChevronDown
} from 'lucide-react';
import EnhancedProfileManager from './EnhancedProfileManager';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function DashboardHeader({ title, description, children }: DashboardHeaderProps) {
  const { user, logout, refreshUser, loading } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  const handleLogout = () => {
    logout('manual');
    setShowLogoutDialog(false);
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = () => {
    if (!user?.role) return '';
    return user.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getProfileCompletionStatus = () => {
    if (!user) return { complete: false, missing: [] };
    
    const missing = [];
    
    // Check basic info
    if (!user.name || user.name.trim().length < 2) missing.push('Full Name');
    if (!user.email) missing.push('Email');
    
    // Role-specific checks
    switch (user.role) {
      case 'BRAND':
      case 'DISTRIBUTOR':
        // These roles should have company information
        break;
      case 'SERVICE_CENTER':
        // Service centers should have center information
        break;
      case 'CUSTOMER':
        // Customers should have personal information
        break;
    }
    
    return {
      complete: missing.length === 0,
      missing
    };
  };

  const profileStatus = getProfileCompletionStatus();

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and description */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {!profileStatus.complete && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Profile Incomplete
                </Badge>
              )}
            </div>
          </div>

          {/* Center - Additional content */}
          {children && (
            <div className="flex-1 flex justify-center">
              {children}
            </div>
          )}

          {/* Right side - User menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>

            {/* Refresh */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshUser}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{getRoleDisplayName()}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {getRoleDisplayName()}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
                  <SheetTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile & Settings</span>
                      {!profileStatus.complete && (
                        <Badge variant="outline" className="ml-auto text-xs text-orange-600">
                          !
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile & Settings
                      </SheetTitle>
                      <SheetDescription>
                        Manage your profile information, addresses, and preferences.
                        {!profileStatus.complete && (
                          <span className="block mt-2 text-orange-600">
                            Please complete your profile to enable all features.
                          </span>
                        )}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <EnhancedProfileManager />
                    </div>
                  </SheetContent>
                </Sheet>

                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Dashboard Settings</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Confirm Logout
                      </DialogTitle>
                      <DialogDescription>
                        Are you sure you want to logout? You will need to login again to access your dashboard.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}