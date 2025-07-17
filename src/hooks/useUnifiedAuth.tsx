import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER' | 'CUSTOMER';
  avatar?: string;
  isVerified?: boolean;
  permissions?: string[];
}

interface AuthStatus {
  isAuthorized: boolean;
  hasAccess: boolean;
  pendingRequests: number;
  authorizedBrands: string[];
  message?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface UnifiedAuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  loading: boolean;
  authStatus: AuthStatus | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuthorization: () => Promise<AuthStatus>;
}

const UnifiedAuthContext = createContext<UnifiedAuthState | null>(null);

export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth must be used within UnifiedAuthProvider');
  }
  return context;
}

export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const router = useRouter();

  // Unified token management
  const getAuthToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Try multiple sources in order of preference
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    
    const localStorageToken = localStorage.getItem('token');
    const sessionStorageToken = sessionStorage.getItem('token');
    
    return cookieToken || localStorageToken || sessionStorageToken;
  }, []);

  const setAuthToken = useCallback((token: string) => {
    // Set token in multiple places for reliability
    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 days
    localStorage.setItem('token', token);
    sessionStorage.setItem('token', token);
  }, []);

  const removeAuthToken = useCallback(() => {
    // Remove token from all sources
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }, []);

  // Unified API request method
  const makeAuthenticatedRequest = useCallback(async (
    endpoint: string, 
    options: RequestInit = {}
  ) => {
    const token = getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(endpoint, config);
    
    if (response.status === 401) {
      // Token expired or invalid
      await logout('session_expired');
      throw new Error('Authentication required');
    }
    
    return response;
  }, [getAuthToken]);

  // Check current authentication status
  const checkAuth = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setAuthStatus(null);
        return;
      }

      const response = await makeAuthenticatedRequest('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Check authorization status for non-admin roles
        if (data.user.role !== 'SUPER_ADMIN' && data.user.role !== 'CUSTOMER') {
          const authStatusResponse = await makeAuthenticatedRequest('/api/auth/authorization-status');
          if (authStatusResponse.ok) {
            const authData = await authStatusResponse.json();
            setAuthStatus(authData);
            setIsAuthorized(authData.isAuthorized);
          }
        } else {
          setIsAuthorized(true);
          setAuthStatus({ isAuthorized: true, hasAccess: true, pendingRequests: 0, authorizedBrands: [] });
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setIsAuthorized(false);
      setUser(null);
      setAuthStatus(null);
      removeAuthToken();
    }
  }, [getAuthToken, makeAuthenticatedRequest, removeAuthToken]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      if (data.success && data.token) {
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Check authorization for non-admin roles
        if (data.user.role !== 'SUPER_ADMIN' && data.user.role !== 'CUSTOMER') {
          await checkAuthorization();
        } else {
          setIsAuthorized(true);
        }
        
        // Redirect to appropriate dashboard
        const dashboardRoutes = {
          SUPER_ADMIN: '/dashboard/super-admin',
          BRAND: '/dashboard/brand',
          DISTRIBUTOR: '/dashboard/distributor',
          SERVICE_CENTER: '/dashboard/service-center',
          CUSTOMER: '/dashboard/customer'
        };
        
        router.push(dashboardRoutes[data.user.role] || '/dashboard');
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [setAuthToken, router]);

  // Logout function
  const logout = useCallback(async (reason?: string) => {
    try {
      // Call logout API if authenticated
      if (isAuthenticated) {
        await makeAuthenticatedRequest('/api/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state
      setUser(null);
      setIsAuthenticated(false);
      setIsAuthorized(false);
      setAuthStatus(null);
      removeAuthToken();
      
      // Redirect to login with reason
      const redirectUrl = reason ? `/auth/login?reason=${reason}` : '/auth/login';
      router.push(redirectUrl);
    }
  }, [isAuthenticated, makeAuthenticatedRequest, removeAuthToken, router]);

  // Refresh authentication
  const refreshAuth = useCallback(async () => {
    setLoading(true);
    await checkAuth();
    setLoading(false);
  }, [checkAuth]);

  // Check authorization status
  const checkAuthorization = useCallback(async (): Promise<AuthStatus> => {
    try {
      const response = await makeAuthenticatedRequest('/api/auth/authorization-status');
      
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
        setIsAuthorized(data.isAuthorized);
        return data;
      } else {
        const defaultStatus = { isAuthorized: false, hasAccess: false, pendingRequests: 0, authorizedBrands: [] };
        setAuthStatus(defaultStatus);
        setIsAuthorized(false);
        return defaultStatus;
      }
    } catch (error) {
      console.error('Authorization check failed:', error);
      const defaultStatus = { isAuthorized: false, hasAccess: false, pendingRequests: 0, authorizedBrands: [] };
      setAuthStatus(defaultStatus);
      setIsAuthorized(false);
      return defaultStatus;
    }
  }, [makeAuthenticatedRequest]);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await checkAuth();
      setLoading(false);
    };

    initAuth();
  }, [checkAuth]);

  // Auto-refresh auth periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, checkAuth]);

  const authState: UnifiedAuthState = {
    user,
    isAuthenticated,
    isAuthorized,
    loading,
    authStatus,
    login,
    logout,
    refreshAuth,
    checkAuthorization
  };

  return (
    <UnifiedAuthContext.Provider value={authState}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}

// Export for backward compatibility
export const useAuth = useUnifiedAuth;
export const AuthContext = UnifiedAuthContext;