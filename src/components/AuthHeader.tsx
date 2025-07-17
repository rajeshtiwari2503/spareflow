import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Zap, 
  User, 
  LogOut, 
  Settings, 
  Shield,
  Building,
  Truck,
  Wrench,
  Users
} from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';

const roleIcons = {
  BRAND: Building,
  DISTRIBUTOR: Truck,
  SERVICE_CENTER: Wrench,
  CUSTOMER: Users,
};

const roleColors = {
  BRAND: 'bg-blue-100 text-spareflow-blue',
  DISTRIBUTOR: 'bg-green-100 text-spareflow-green',
  SERVICE_CENTER: 'bg-gradient-to-r from-blue-100 to-green-100 text-spareflow-blue',
  CUSTOMER: 'bg-gradient-to-r from-green-100 to-blue-100 text-spareflow-green',
};

interface AuthHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function AuthHeader({ title, showBackButton = false }: AuthHeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mr-2"
              >
                ← Back
              </Button>
            )}
            
            <Link href="/" className="flex items-center space-x-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 spareflow-gradient rounded-lg flex items-center justify-center shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <g transform="translate(10, 10)">
                    <circle cx="6" cy="6" r="4.5" fill="white" opacity="0.9"/>
                    <path d="M6 1L7 2.5L6 4L5 2.5Z" fill="white" opacity="0.8"/>
                    <path d="M11 6L9.5 7L8 6L9.5 5Z" fill="white" opacity="0.8"/>
                    <path d="M6 11L5 9.5L6 8L7 9.5Z" fill="white" opacity="0.8"/>
                    <path d="M1 6L2.5 5L4 6L2.5 7Z" fill="white" opacity="0.8"/>
                    <circle cx="6" cy="6" r="1.8" fill="url(#gradient1)"/>
                  </g>
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#3B82F6', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#1E40AF', stopOpacity:1}} />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
              <span className="text-xl font-bold spareflow-text-gradient">SpareFlow</span>
            </Link>

            {title && (
              <>
                <div className="w-px h-6 bg-gray-300" />
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              </>
            )}
          </div>

          {/* Right side - User menu or Auth buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                {/* Notification Center */}
                <NotificationCenter />

                {/* User Role Badge */}
                <Badge variant="secondary" className={`${roleColors[user.role]} hidden sm:flex`}>
                  {(() => {
                    const Icon = roleIcons[user.role];
                    return (
                      <div className="flex items-center space-x-1">
                        <Icon className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          {getRoleDisplayName(user.role)}
                        </span>
                      </div>
                    );
                  })()}
                </Badge>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="spareflow-gradient text-white font-medium">
                          {getUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Role Badge in Mobile */}
                    <div className="sm:hidden px-2 py-1">
                      <Badge variant="secondary" className={`${roleColors[user.role]} w-full justify-center`}>
                        {(() => {
                          const Icon = roleIcons[user.role];
                          return (
                            <div className="flex items-center space-x-1">
                              <Icon className="w-3 h-3" />
                              <span className="text-xs font-medium">
                                {getRoleDisplayName(user.role)}
                              </span>
                            </div>
                          );
                        })()}
                      </Badge>
                    </div>
                    <DropdownMenuSeparator className="sm:hidden" />

                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              /* Auth buttons for non-authenticated users */
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/auth/login')}
                >
                  Sign in
                </Button>
                <Button
                  onClick={() => router.push('/auth/register')}
                  className="spareflow-btn-primary"
                >
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}