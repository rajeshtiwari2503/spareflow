import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';
import { UserRole } from '@prisma/client';

export function useUserContext() {
  const auth = useAuth();

  // Memoized user info
  const userInfo = useMemo(() => {
    if (!auth.user) return null;

    return {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      role: auth.user.role,
      initials: auth.user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      displayRole: auth.user.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      isActive: auth.user.isActive,
      profileComplete: auth.user.profileComplete,
      lastLogin: auth.user.lastLogin,
      preferences: auth.user.preferences,
      permissions: auth.user.permissions || [],
    };
  }, [auth.user]);

  // Permission checking utilities
  const can = useCallback((permission: string): boolean => {
    return auth.hasPermission(permission);
  }, [auth]);

  const canAny = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => auth.hasPermission(permission));
  }, [auth]);

  const canAll = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => auth.hasPermission(permission));
  }, [auth]);

  // Role checking utilities
  const isRole = useCallback((role: UserRole): boolean => {
    return auth.hasRole([role]);
  }, [auth]);

  const isAnyRole = useCallback((roles: UserRole[]): boolean => {
    return auth.hasRole(roles);
  }, [auth]);

  // Admin utilities
  const isAdmin = useCallback((): boolean => {
    return auth.hasRole(['SUPER_ADMIN']);
  }, [auth]);

  const isBrand = useCallback((): boolean => {
    return auth.hasRole(['BRAND']);
  }, [auth]);

  const isDistributor = useCallback((): boolean => {
    return auth.hasRole(['DISTRIBUTOR']);
  }, [auth]);

  const isServiceCenter = useCallback((): boolean => {
    return auth.hasRole(['SERVICE_CENTER']);
  }, [auth]);

  const isCustomer = useCallback((): boolean => {
    return auth.hasRole(['CUSTOMER']);
  }, [auth]);

  // Session utilities
  const sessionInfo = useMemo(() => {
    if (!auth.sessionExpiry) return null;

    const now = Date.now();
    const expiry = auth.sessionExpiry.getTime();
    const timeLeft = expiry - now;
    const isExpiringSoon = timeLeft < 5 * 60 * 1000; // 5 minutes

    return {
      expiry: auth.sessionExpiry,
      timeLeft,
      isExpiringSoon,
      isValid: auth.isSessionValid,
      formattedTimeLeft: formatTimeLeft(timeLeft),
    };
  }, [auth.sessionExpiry, auth.isSessionValid]);

  // Preference utilities
  const updateTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    return auth.updatePreferences({ theme });
  }, [auth]);

  const updateLanguage = useCallback(async (language: string) => {
    return auth.updatePreferences({ language });
  }, [auth]);

  const updateNotificationSettings = useCallback(async (notifications: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  }) => {
    return auth.updatePreferences({ notifications });
  }, [auth]);

  const updateDashboardSettings = useCallback(async (dashboard: {
    defaultView?: string;
    itemsPerPage?: number;
  }) => {
    return auth.updatePreferences({ dashboard });
  }, [auth]);

  // Profile utilities
  const updateName = useCallback(async (name: string) => {
    return auth.updateProfile({ name });
  }, [auth]);

  const updateEmail = useCallback(async (email: string) => {
    return auth.updateProfile({ email });
  }, [auth]);

  return {
    // Core auth state
    ...auth,
    
    // Enhanced user info
    userInfo,
    
    // Permission utilities
    can,
    canAny,
    canAll,
    
    // Role utilities
    isRole,
    isAnyRole,
    isAdmin,
    isBrand,
    isDistributor,
    isServiceCenter,
    isCustomer,
    
    // Session utilities
    sessionInfo,
    
    // Preference utilities
    updateTheme,
    updateLanguage,
    updateNotificationSettings,
    updateDashboardSettings,
    
    // Profile utilities
    updateName,
    updateEmail,
  };
}

function formatTimeLeft(milliseconds: number): string {
  if (milliseconds <= 0) return 'Expired';
  
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}