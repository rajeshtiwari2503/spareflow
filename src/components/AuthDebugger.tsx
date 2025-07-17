import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAuthToken, setAuthToken, clearAuthToken } from '@/lib/token-utils';
import { useAuth } from '@/contexts/AuthContext';
import Cookies from 'js-cookie';

interface AuthDebuggerProps {
  showDebugInfo?: boolean;
}

export default function AuthDebugger({ showDebugInfo = false }: AuthDebuggerProps) {
  const { user, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAuthDiagnostics = async () => {
    setLoading(true);
    try {
      // Check token from different sources
      const tokenFromUtility = getAuthToken();
      const tokenFromCookies = Cookies.get('token');
      const tokenFromLocalStorage = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

      // Test auth endpoint
      let authTestResult = null;
      try {
        const response = await fetch('/api/debug/auth-test', {
          headers: {
            'Authorization': tokenFromUtility ? `Bearer ${tokenFromUtility}` : '',
          },
        });
        authTestResult = await response.json();
      } catch (error) {
        authTestResult = { error: 'Failed to call auth test API', details: error };
      }

      // Test user endpoint
      let userTestResult = null;
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': tokenFromUtility ? `Bearer ${tokenFromUtility}` : '',
          },
        });
        userTestResult = await response.json();
      } catch (error) {
        userTestResult = { error: 'Failed to call user API', details: error };
      }

      setDebugInfo({
        timestamp: new Date().toISOString(),
        tokens: {
          fromUtility: tokenFromUtility ? `${tokenFromUtility.substring(0, 20)}...` : null,
          fromCookies: tokenFromCookies ? `${tokenFromCookies.substring(0, 20)}...` : null,
          fromLocalStorage: tokenFromLocalStorage ? `${tokenFromLocalStorage.substring(0, 20)}...` : null,
          tokensMatch: tokenFromUtility === tokenFromCookies,
        },
        authContext: {
          user: user ? { id: user.id, email: user.email, role: user.role } : null,
          isAuthenticated,
        },
        apiTests: {
          authTest: authTestResult,
          userTest: userTestResult,
        },
        browser: {
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
          cookiesEnabled: typeof window !== 'undefined' ? navigator.cookieEnabled : false,
          localStorageAvailable: typeof window !== 'undefined' && typeof localStorage !== 'undefined',
        },
      });
    } catch (error) {
      setDebugInfo({
        error: 'Failed to run diagnostics',
        details: error,
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestToken = () => {
    // Create a test token for debugging
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoidGVzdCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJyb2xlIjoiU1VQRVJfQURNSU4ifSwiaWF0IjoxNzM2NzQ4MDAwLCJleHAiOjE3Mzc0NDgwMDB9.test';
    setAuthToken(testToken, 7);
    alert('Test token created. This is for debugging only.');
  };

  const clearAllTokens = () => {
    clearAuthToken();
    alert('All tokens cleared.');
  };

  useEffect(() => {
    if (showDebugInfo) {
      runAuthDiagnostics();
    }
  }, [showDebugInfo]);

  if (!showDebugInfo) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={runAuthDiagnostics}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {loading ? 'Running...' : 'Auth Debug'}
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Authentication Debugger
          <div className="flex gap-2">
            <Button onClick={runAuthDiagnostics} size="sm" disabled={loading}>
              {loading ? 'Running...' : 'Refresh'}
            </Button>
            <Button onClick={createTestToken} size="sm" variant="outline">
              Create Test Token
            </Button>
            <Button onClick={clearAllTokens} size="sm" variant="destructive">
              Clear Tokens
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {debugInfo ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Token Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>From Utility:</strong> {debugInfo.tokens?.fromUtility || 'None'}
                </div>
                <div>
                  <strong>From Cookies:</strong> {debugInfo.tokens?.fromCookies || 'None'}
                </div>
                <div>
                  <strong>From LocalStorage:</strong> {debugInfo.tokens?.fromLocalStorage || 'None'}
                </div>
                <div>
                  <strong>Tokens Match:</strong>{' '}
                  <Badge variant={debugInfo.tokens?.tokensMatch ? 'default' : 'destructive'}>
                    {debugInfo.tokens?.tokensMatch ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Auth Context</h3>
              <div className="text-sm">
                <div>
                  <strong>User:</strong> {debugInfo.authContext?.user ? JSON.stringify(debugInfo.authContext.user) : 'None'}
                </div>
                <div>
                  <strong>Is Authenticated:</strong>{' '}
                  <Badge variant={debugInfo.authContext?.isAuthenticated ? 'default' : 'destructive'}>
                    {debugInfo.authContext?.isAuthenticated ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">API Tests</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Auth Test:</strong>
                  <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(debugInfo.apiTests?.authTest, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>User Test:</strong>
                  <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(debugInfo.apiTests?.userTest, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Browser Info</h3>
              <div className="text-sm">
                <div>
                  <strong>Cookies Enabled:</strong>{' '}
                  <Badge variant={debugInfo.browser?.cookiesEnabled ? 'default' : 'destructive'}>
                    {debugInfo.browser?.cookiesEnabled ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <strong>LocalStorage Available:</strong>{' '}
                  <Badge variant={debugInfo.browser?.localStorageAvailable ? 'default' : 'destructive'}>
                    {debugInfo.browser?.localStorageAvailable ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Last updated: {debugInfo.timestamp}
            </div>
          </div>
        ) : (
          <div>Click "Refresh" to run authentication diagnostics.</div>
        )}
      </CardContent>
    </Card>
  );
}