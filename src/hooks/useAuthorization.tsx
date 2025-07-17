import { useState, useEffect } from 'react';

interface AuthorizationStatus {
  isAuthorized: boolean;
  authorizedBrands?: string[];
  userRole?: string;
  userId?: string;
  pendingRequests?: number;
  lastChecked?: string;
}

interface UseAuthorizationReturn {
  authStatus: AuthorizationStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuthorization(): UseAuthorizationReturn {
  const [authStatus, setAuthStatus] = useState<AuthorizationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthorizationStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user info first
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        throw new Error('Failed to get user information');
      }
      
      const userData = await userResponse.json();
      const userRole = userData.user?.role;
      const userId = userData.user?.id;

      // Only check authorization for SERVICE_CENTER and DISTRIBUTOR roles
      if (!userRole || !['SERVICE_CENTER', 'DISTRIBUTOR'].includes(userRole)) {
        setAuthStatus({
          isAuthorized: true, // Other roles (BRAND, SUPER_ADMIN, CUSTOMER) are always authorized
          userRole,
          userId,
          lastChecked: new Date().toISOString()
        });
        return;
      }

      // Check authorization status for SERVICE_CENTER and DISTRIBUTOR
      const authResponse = await fetch('/api/auth/authorization-status');
      
      if (!authResponse.ok) {
        // If the endpoint doesn't exist or fails, assume not authorized
        setAuthStatus({
          isAuthorized: false,
          authorizedBrands: [],
          userRole,
          userId,
          pendingRequests: 0,
          lastChecked: new Date().toISOString()
        });
        return;
      }

      const authData = await authResponse.json();
      
      setAuthStatus({
        isAuthorized: authData.isAuthorized || false,
        authorizedBrands: authData.authorizedBrands || [],
        userRole,
        userId,
        pendingRequests: authData.pendingRequests || 0,
        lastChecked: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error fetching authorization status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check authorization');
      
      // Fallback: assume not authorized for SERVICE_CENTER and DISTRIBUTOR
      setAuthStatus({
        isAuthorized: false,
        authorizedBrands: [],
        pendingRequests: 0,
        lastChecked: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchAuthorizationStatus();
  };

  useEffect(() => {
    fetchAuthorizationStatus();
  }, []);

  return {
    authStatus,
    loading,
    error,
    refetch
  };
}