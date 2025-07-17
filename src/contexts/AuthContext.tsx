import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { AuthUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getAuthToken, setAuthToken, clearAuthToken } from '@/lib/token-utils';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    defaultView: string;
    itemsPerPage: number;
  };
}

interface UserSession {
  id: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

interface EnhancedAuthUser extends AuthUser {
  preferences?: UserPreferences;
  session?: UserSession;
  permissions?: string[];
  lastLogin?: Date;
  isActive?: boolean;
  profileComplete?: boolean;
}

interface AuthContextType {
  user: EnhancedAuthUser | null;
  loading: boolean;
  error: string | null;
  sessionExpiry: Date | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: 'manual' | 'timeout' | 'security') => void;
  refreshUser: () => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<{ name: string; email: string }>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  isSessionValid: boolean;
  timeUntilExpiry: number | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During SSR, return a safe default instead of throwing
    if (typeof window === 'undefined') {
      return {
        user: null,
        loading: true,
        error: null,
        sessionExpiry: null,
        login: async () => ({ success: false, error: 'SSR context' }),
        register: async () => ({ success: false, error: 'SSR context' }),
        logout: () => {},
        refreshUser: async () => {},
        updatePreferences: async () => ({ success: false, error: 'SSR context' }),
        updateProfile: async () => ({ success: false, error: 'SSR context' }),
        changePassword: async () => ({ success: false, error: 'SSR context' }),
        isAuthenticated: false,
        hasRole: () => false,
        hasPermission: () => false,
        isSessionValid: false,
        timeUntilExpiry: null,
        clearError: () => {},
      } as AuthContextType;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<EnhancedAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const router = useRouter();

  // Session timeout handler
  const [sessionTimeoutId, setSessionTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [activityTimeoutId, setActivityTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const updateLastActivity = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      if (token) {
        await fetch('/api/auth/activity', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }, []);

  // Setup activity tracking
  const setupActivityTracking = useCallback(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const updateActivity = () => {
      if (user) {
        updateLastActivity();
      }
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [user, updateLastActivity]);

  // Setup session timeout
  const setupSessionTimeout = useCallback((expiryTime: Date) => {
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    
    const timeUntilExpiry = expiryTime.getTime() - Date.now();
    const warningTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000); // 5 minutes before expiry
    
    // Show warning 5 minutes before expiry
    const warningTimeoutId = setTimeout(() => {
      if (user) {
        // You can implement a warning modal here
        console.warn('Session will expire in 5 minutes');
      }
    }, warningTime);

    // Auto logout on expiry
    const logoutTimeoutId = setTimeout(() => {
      logout('timeout');
    }, timeUntilExpiry);

    setSessionTimeoutId(logoutTimeoutId);
  }, [user]);

  const checkAuth = async () => {
    try {
      setError(null);
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        const enhancedUser: EnhancedAuthUser = {
          ...userData.user,
          preferences: userData.preferences || getDefaultPreferences(),
          session: userData.session,
          permissions: userData.permissions || [],
          lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : undefined,
          isActive: userData.isActive !== false,
          profileComplete: userData.profileComplete !== false,
        };
        
        setUser(enhancedUser);
        
        // Setup session expiry if provided
        if (userData.sessionExpiry) {
          const expiry = new Date(userData.sessionExpiry);
          setSessionExpiry(expiry);
          setupSessionTimeout(expiry);
        }
      } else {
        // Token is invalid, remove it
        clearAuthToken();
        setError('Session expired. Please login again.');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthToken();
      setError('Authentication check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPreferences = (): UserPreferences => ({
    theme: 'system',
    language: 'en',
    timezone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
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

  // Check if user is authenticated on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      checkAuth();
      setupActivityTracking();
    }
    
    return () => {
      if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
      if (activityTimeoutId) clearTimeout(activityTimeoutId);
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          rememberMe,
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
          timezone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token using improved utility with appropriate expiry
        const expires = rememberMe ? 30 : 7; // 30 days if remember me, otherwise 7 days
        setAuthToken(data.token, expires);
        
        const enhancedUser: EnhancedAuthUser = {
          ...data.user,
          preferences: data.preferences || getDefaultPreferences(),
          session: data.session,
          permissions: data.permissions || [],
          lastLogin: data.lastLogin ? new Date(data.lastLogin) : new Date(),
          isActive: true,
          profileComplete: data.profileComplete !== false,
        };
        
        setUser(enhancedUser);
        
        // Setup session expiry
        if (data.sessionExpiry) {
          const expiry = new Date(data.sessionExpiry);
          setSessionExpiry(expiry);
          setupSessionTimeout(expiry);
        }
        
        setError(null);
        return { success: true };
      } else {
        setError(data.error || 'Login failed');
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'Network error. Please check your connection.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          role,
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
          timezone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in cookie
        Cookies.set('token', data.token, { expires: 7 }); // 7 days
        
        const enhancedUser: EnhancedAuthUser = {
          ...data.user,
          preferences: data.preferences || getDefaultPreferences(),
          session: data.session,
          permissions: data.permissions || [],
          lastLogin: new Date(),
          isActive: true,
          profileComplete: false, // New users need to complete profile
        };
        
        setUser(enhancedUser);
        setError(null);
        return { success: true };
      } else {
        setError(data.error || 'Registration failed');
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = 'Network error. Please check your connection.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback((reason: 'manual' | 'timeout' | 'security' = 'manual') => {
    // Clear timeouts
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (activityTimeoutId) clearTimeout(activityTimeoutId);
    
    // Call logout API to invalidate session on server
    const token = getAuthToken();
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }).catch(console.error);
    }
    
    // Clear local state using improved utility
    clearAuthToken();
    setUser(null);
    setSessionExpiry(null);
    setError(null);
    
    // Redirect based on reason
    const redirectPath = reason === 'timeout' 
      ? `/auth/login?reason=timeout&redirect=${encodeURIComponent(router.asPath)}`
      : '/auth/login';
    
    router.push(redirectPath);
  }, [sessionTimeoutId, activityTimeoutId, router]);

  const refreshUser = useCallback(async (): Promise<void> => {
    await checkAuth();
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = Cookies.get('token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user preferences in state
        setUser(prev => prev ? {
          ...prev,
          preferences: { ...prev.preferences, ...preferences } as UserPreferences
        } : null);
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to update preferences' };
      }
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<{ name: string; email: string }>): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = Cookies.get('token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        // Update user data in state
        setUser(prev => prev ? {
          ...prev,
          ...data,
          profileComplete: true
        } : null);
        
        return { success: true };
      } else {
        return { success: false, error: responseData.error || 'Failed to update profile' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = Cookies.get('token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to change password' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const isAuthenticated = !!user;

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  const isSessionValid = useCallback((): boolean => {
    if (!sessionExpiry) return true; // No expiry set means session is valid
    return sessionExpiry.getTime() > Date.now();
  }, [sessionExpiry]);

  const timeUntilExpiry = useCallback((): number | null => {
    if (!sessionExpiry) return null;
    const remaining = sessionExpiry.getTime() - Date.now();
    return Math.max(0, remaining);
  }, [sessionExpiry]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    sessionExpiry,
    login,
    register,
    logout,
    refreshUser,
    updatePreferences,
    updateProfile,
    changePassword,
    isAuthenticated,
    hasRole,
    hasPermission,
    isSessionValid: isSessionValid(),
    timeUntilExpiry: timeUntilExpiry(),
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}