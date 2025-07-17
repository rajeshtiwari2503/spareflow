import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play, 
  RefreshCw,
  AlertCircle,
  Package,
  Truck,
  Users,
  Wallet,
  Bell,
  Settings
} from 'lucide-react';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface TestReport {
  overall: 'PASS' | 'FAIL' | 'RUNNING';
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

const TestShipmentFlow: React.FC = () => {
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [credentials, setCredentials] = useState({
    email: 'brand@example.com',
    password: 'password123'
  });
  const [token, setToken] = useState<string | null>(null);

  const addResult = (step: string, success: boolean, data?: any, error?: string) => {
    const result: TestResult = {
      step,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    };

    setTestReport(prev => {
      if (!prev) {
        return {
          overall: 'RUNNING',
          results: [result],
          summary: { total: 1, passed: success ? 1 : 0, failed: success ? 0 : 1 }
        };
      }

      const newResults = [...prev.results, result];
      const passed = newResults.filter(r => r.success).length;
      const failed = newResults.filter(r => !r.success).length;

      return {
        overall: 'RUNNING',
        results: newResults,
        summary: { total: newResults.length, passed, failed }
      };
    });
  };

  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await response.json();
    return { response, data };
  };

  const testAuthentication = async (): Promise<boolean> => {
    try {
      const { response, data } = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (response.ok && data.token) {
        setToken(data.token);
        addResult('Authentication', true, { 
          user: data.user, 
          role: data.user?.role 
        });
        return true;
      } else {
        addResult('Authentication', false, null, data.error || 'Login failed');
        return false;
      }
    } catch (error) {
      addResult('Authentication', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const testUserProfile = async (): Promise<boolean> => {
    try {
      const { response, data } = await makeRequest('/api/auth/me');

      if (response.ok && data.user) {
        addResult('User Profile', true, { 
          user: data.user,
          role: data.user.role,
          hasProfile: !!data.user.brandProfile || !!data.user.serviceCenterProfile
        });
        return true;
      } else {
        addResult('User Profile', false, null, data.error || 'Profile fetch failed');
        return false;
      }
    } catch (error) {
      addResult('User Profile', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const testServiceCentersLoad = async (): Promise<boolean> => {
    try {
      const { response, data } = await makeRequest('/api/brand/authorized-service-centers?limit=50');

      if (response.ok) {
        addResult('Service Centers Load', true, { 
          count: data.serviceCenters?.length || data.recipients?.length || 0,
          hasData: !!(data.serviceCenters || data.recipients),
          data: data.serviceCenters || data.recipients || []
        });
        return true;
      } else {
        addResult('Service Centers Load', false, null, 
          `${response.status}: ${data.error || 'Failed to load service centers'}`);
        return false;
      }
    } catch (error) {
      addResult('Service Centers Load', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const testDistributorsLoad = async (): Promise<boolean> => {
    try {
      const { response, data } = await makeRequest('/api/brand/authorized-distributors?limit=50');

      if (response.ok) {
        addResult('Distributors Load', true, { 
          count: data.distributors?.length || data.recipients?.length || 0,
          hasData: !!(data.distributors || data.recipients),
          data: data.distributors || data.recipients || []
        });
        return true;
      } else {
        addResult('Distributors Load', false, null, 
          `${response.status}: ${data.error || 'Failed to load distributors'}`);
        return false;
      }
    } catch (error) {
      addResult('Distributors Load', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const testPartsLoad = async (): Promise<boolean> => {
    try {
      const { response, data } = await makeRequest('/api/parts');

      if (response.ok) {
        addResult('Parts Load', true, { 
          count: data.parts?.length || 0,
          hasData: !!(data.parts && data.parts.length > 0),
          parts: data.parts || []
        });
        return true;
      } else {
        addResult('Parts Load', false, null, data.error || 'Failed to load parts');
        return false;
      }
    } catch (error) {
      addResult('Parts Load', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const testWalletBalance = async (): Promise<boolean> => {
    try {
      const { response, data } = await makeRequest('/api/brand/wallet');

      if (response.ok) {
        addResult('Wallet Balance', true, { 
          balance: data.balance || 0,
          hasBalance: (data.balance || 0) > 0
        });
        return true;
      } else {
        addResult('Wallet Balance', false, null, data.error || 'Wallet check failed');
        return false;
      }
    } catch (error) {
      addResult('Wallet Balance', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const testNotificationSystem = async (): Promise<boolean> => {
    try {
      const { response, data } = await makeRequest('/api/notifications');

      if (response.ok) {
        addResult('Notification System', true, { 
          count: data.notifications?.length || 0,
          working: true
        });
        return true;
      } else {
        addResult('Notification System', false, null, data.error || 'Notifications failed');
        return false;
      }
    } catch (error) {
      addResult('Notification System', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const runCompleteTest = async () => {
    setIsRunning(true);
    setTestReport(null);
    setToken(null);

    try {
      // Run all tests in sequence
      const tests = [
        testAuthentication,
        testUserProfile,
        testServiceCentersLoad,
        testDistributorsLoad,
        testPartsLoad,
        testWalletBalance,
        testNotificationSystem
      ];

      for (const test of tests) {
        await test();
        // Add small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Finalize report
      setTestReport(prev => {
        if (!prev) return null;
        
        const passed = prev.results.filter(r => r.success).length;
        const failed = prev.results.filter(r => !r.success).length;
        
        return {
          ...prev,
          overall: failed === 0 ? 'PASS' : 'FAIL',
          summary: { ...prev.summary, passed, failed }
        };
      });

    } catch (error) {
      console.error('Test execution error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Shipment Flow Test Suite
            </CardTitle>
            <CardDescription>
              Comprehensive testing of the complete shipment creation flow from authentication to DTDC integration
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isRunning}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isRunning}
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={runCompleteTest} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRunning ? 'Running Tests...' : 'Run Complete Test'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setTestReport(null);
                  setToken(null);
                }}
                disabled={isRunning}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testReport && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Test Results
                  {testReport.overall === 'PASS' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {testReport.overall === 'FAIL' && <XCircle className="h-5 w-5 text-red-600" />}
                  {testReport.overall === 'RUNNING' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                </CardTitle>
                <Badge 
                  variant={testReport.overall === 'PASS' ? 'default' : testReport.overall === 'FAIL' ? 'destructive' : 'secondary'}
                >
                  {testReport.overall}
                </Badge>
              </div>
              <CardDescription>
                {testReport.summary.passed} passed, {testReport.summary.failed} failed out of {testReport.summary.total} tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="details">Detailed Results</TabsTrigger>
                  <TabsTrigger value="data">Test Data</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-600">{testReport.summary.passed}</p>
                            <p className="text-sm text-gray-600">Passed</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-semibold text-red-600">{testReport.summary.failed}</p>
                            <p className="text-sm text-gray-600">Failed</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-semibold text-blue-600">{testReport.summary.total}</p>
                            <p className="text-sm text-gray-600">Total</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    {testReport.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.success)}
                          <span className="font-medium">{result.step}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${getStatusColor(result.success)}`}>
                            {result.success ? 'PASS' : 'FAIL'}
                          </span>
                          <p className="text-xs text-gray-500">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  {testReport.results.map((result, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {getStatusIcon(result.success)}
                            {result.step}
                          </CardTitle>
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.success ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {result.error && (
                          <Alert className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Error:</strong> {result.error}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {result.data && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium mb-2">Test Data:</h4>
                            <pre className="text-sm overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-500 mt-2">
                          Executed at: {new Date(result.timestamp).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="data" className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This tab shows the raw data returned by each test for debugging purposes.
                    </AlertDescription>
                  </Alert>
                  
                  {testReport.results
                    .filter(result => result.data)
                    .map((result, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg">{result.step} - Raw Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">What This Test Does:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Tests user authentication with provided credentials</li>
                  <li>• Verifies user profile loading</li>
                  <li>• Checks authorized service centers loading</li>
                  <li>• Checks authorized distributors loading</li>
                  <li>• Tests parts inventory loading</li>
                  <li>• Verifies wallet balance check</li>
                  <li>• Tests notification system</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Expected Results:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• All tests should pass for a working system</li>
                  <li>• Service centers/distributors may be empty (normal)</li>
                  <li>• Parts should load if inventory exists</li>
                  <li>• Wallet balance may be 0 (normal)</li>
                  <li>• Authentication failure indicates login issues</li>
                </ul>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> This test suite verifies the core functionality needed for shipment creation. 
                If all tests pass, the shipment flow should work correctly.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestShipmentFlow;