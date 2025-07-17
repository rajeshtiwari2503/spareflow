/**
 * Comprehensive Shipment Flow Test Utility
 * Tests the complete end-to-end shipment creation flow
 */

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface TestReport {
  overall: 'PASS' | 'FAIL';
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  recommendations: string[];
}

export class ShipmentFlowTester {
  private results: TestResult[] = [];
  private token: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private addResult(step: string, success: boolean, data?: any, error?: string) {
    this.results.push({
      step,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    });
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    return { response, data };
  }

  async testAuthentication(email: string, password: string): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.ok && data.token) {
        this.token = data.token;
        this.addResult('Authentication', true, { 
          user: data.user, 
          role: data.user?.role 
        });
        return true;
      } else {
        this.addResult('Authentication', false, null, data.error || 'Login failed');
        return false;
      }
    } catch (error) {
      this.addResult('Authentication', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testUserProfile(): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/auth/me');

      if (response.ok && data.user) {
        this.addResult('User Profile', true, { 
          user: data.user,
          role: data.user.role,
          hasProfile: !!data.user.brandProfile || !!data.user.serviceCenterProfile
        });
        return true;
      } else {
        this.addResult('User Profile', false, null, data.error || 'Profile fetch failed');
        return false;
      }
    } catch (error) {
      this.addResult('User Profile', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testServiceCentersLoad(): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/brand/authorized-service-centers?limit=50');

      if (response.ok) {
        this.addResult('Service Centers Load', true, { 
          count: data.serviceCenters?.length || data.recipients?.length || 0,
          hasData: !!(data.serviceCenters || data.recipients)
        });
        return true;
      } else {
        this.addResult('Service Centers Load', false, null, 
          `${response.status}: ${data.error || 'Failed to load service centers'}`);
        return false;
      }
    } catch (error) {
      this.addResult('Service Centers Load', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testDistributorsLoad(): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/brand/authorized-distributors?limit=50');

      if (response.ok) {
        this.addResult('Distributors Load', true, { 
          count: data.distributors?.length || data.recipients?.length || 0,
          hasData: !!(data.distributors || data.recipients)
        });
        return true;
      } else {
        this.addResult('Distributors Load', false, null, 
          `${response.status}: ${data.error || 'Failed to load distributors'}`);
        return false;
      }
    } catch (error) {
      this.addResult('Distributors Load', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testPartsLoad(): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/parts');

      if (response.ok) {
        this.addResult('Parts Load', true, { 
          count: data.parts?.length || 0,
          hasData: !!(data.parts && data.parts.length > 0)
        });
        return true;
      } else {
        this.addResult('Parts Load', false, null, data.error || 'Failed to load parts');
        return false;
      }
    } catch (error) {
      this.addResult('Parts Load', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testCostEstimate(): Promise<boolean> {
    try {
      const estimateData = {
        brandId: 'test-brand-id',
        shipments: [{
          recipientId: 'test-recipient-id',
          recipientType: 'SERVICE_CENTER',
          recipientPincode: '400001',
          numBoxes: 1,
          estimatedWeight: 1.0,
          priority: 'MEDIUM'
        }]
      };

      const { response, data } = await this.makeRequest('/api/shipments/cost-estimate', {
        method: 'POST',
        body: JSON.stringify(estimateData)
      });

      if (response.ok) {
        this.addResult('Cost Estimate', true, { 
          hasEstimates: !!(data.estimates && data.estimates.length > 0),
          estimate: data.estimates?.[0]
        });
        return true;
      } else {
        this.addResult('Cost Estimate', false, null, data.error || 'Cost estimate failed');
        return false;
      }
    } catch (error) {
      this.addResult('Cost Estimate', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testDTDCIntegration(): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/admin/test-dtdc-integration');

      if (response.ok) {
        this.addResult('DTDC Integration', true, { 
          status: data.status,
          connectivity: data.connectivity
        });
        return true;
      } else {
        this.addResult('DTDC Integration', false, null, data.error || 'DTDC test failed');
        return false;
      }
    } catch (error) {
      this.addResult('DTDC Integration', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testWalletBalance(): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/brand/wallet');

      if (response.ok) {
        this.addResult('Wallet Balance', true, { 
          balance: data.balance || 0,
          hasBalance: (data.balance || 0) > 0
        });
        return true;
      } else {
        this.addResult('Wallet Balance', false, null, data.error || 'Wallet check failed');
        return false;
      }
    } catch (error) {
      this.addResult('Wallet Balance', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async testNotificationSystem(): Promise<boolean> {
    try {
      const { response, data } = await this.makeRequest('/api/notifications');

      if (response.ok) {
        this.addResult('Notification System', true, { 
          count: data.notifications?.length || 0,
          working: true
        });
        return true;
      } else {
        this.addResult('Notification System', false, null, data.error || 'Notifications failed');
        return false;
      }
    } catch (error) {
      this.addResult('Notification System', false, null, error instanceof Error ? error.message : 'Network error');
      return false;
    }
  }

  async runCompleteTest(email: string, password: string): Promise<TestReport> {
    console.log('🚀 Starting Comprehensive Shipment Flow Test...');
    
    // Reset results
    this.results = [];
    this.token = null;

    // Run all tests in sequence
    const tests = [
      () => this.testAuthentication(email, password),
      () => this.testUserProfile(),
      () => this.testServiceCentersLoad(),
      () => this.testDistributorsLoad(),
      () => this.testPartsLoad(),
      () => this.testCostEstimate(),
      () => this.testDTDCIntegration(),
      () => this.testWalletBalance(),
      () => this.testNotificationSystem()
    ];

    for (const test of tests) {
      await test();
    }

    // Generate report
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    const recommendations: string[] = [];

    // Analyze results and provide recommendations
    const failedSteps = this.results.filter(r => !r.success);
    
    if (failedSteps.some(r => r.step === 'Authentication')) {
      recommendations.push('🔐 Authentication failed - Check login credentials and JWT configuration');
    }
    
    if (failedSteps.some(r => r.step === 'Service Centers Load')) {
      recommendations.push('👥 Service Centers loading failed - Check brand authorization and database relationships');
    }
    
    if (failedSteps.some(r => r.step === 'Parts Load')) {
      recommendations.push('📦 Parts loading failed - Check parts API and database');
    }
    
    if (failedSteps.some(r => r.step === 'DTDC Integration')) {
      recommendations.push('🚚 DTDC integration issues - Check API keys and configuration');
    }
    
    if (failedSteps.some(r => r.step === 'Wallet Balance')) {
      recommendations.push('💰 Wallet system issues - Check wallet initialization and balance');
    }

    if (failed === 0) {
      recommendations.push('✅ All systems operational - Ready for shipment creation');
    }

    const report: TestReport = {
      overall: failed === 0 ? 'PASS' : 'FAIL',
      results: this.results,
      summary: { total, passed, failed },
      recommendations
    };

    return report;
  }

  generateDetailedReport(report: TestReport): string {
    let output = '\n🔍 SHIPMENT FLOW TEST REPORT\n';
    output += '=' .repeat(50) + '\n\n';
    
    output += `📊 SUMMARY:\n`;
    output += `   Overall Status: ${report.overall === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`;
    output += `   Total Tests: ${report.summary.total}\n`;
    output += `   Passed: ${report.summary.passed}\n`;
    output += `   Failed: ${report.summary.failed}\n\n`;

    output += `📋 DETAILED RESULTS:\n`;
    report.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      output += `   ${index + 1}. ${status} ${result.step}\n`;
      
      if (!result.success && result.error) {
        output += `      Error: ${result.error}\n`;
      }
      
      if (result.data && typeof result.data === 'object') {
        const dataStr = JSON.stringify(result.data, null, 6).replace(/\n/g, '\n      ');
        output += `      Data: ${dataStr}\n`;
      }
      
      output += `      Time: ${result.timestamp}\n\n`;
    });

    if (report.recommendations.length > 0) {
      output += `💡 RECOMMENDATIONS:\n`;
      report.recommendations.forEach((rec, index) => {
        output += `   ${index + 1}. ${rec}\n`;
      });
      output += '\n';
    }

    output += '=' .repeat(50) + '\n';
    
    return output;
  }
}

// Export utility functions for browser usage
export const runShipmentFlowTest = async (email: string, password: string) => {
  const tester = new ShipmentFlowTester();
  const report = await tester.runCompleteTest(email, password);
  const detailedReport = tester.generateDetailedReport(report);
  
  console.log(detailedReport);
  return report;
};

// Browser-friendly test runner
if (typeof window !== 'undefined') {
  (window as any).runShipmentFlowTest = runShipmentFlowTest;
}