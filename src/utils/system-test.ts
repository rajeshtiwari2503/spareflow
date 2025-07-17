// System Test Utility for Brand Dashboard Shipment Tab
// This utility helps verify that all components are working correctly

export interface TestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export class BrandDashboardTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    
    console.log('🧪 Starting Brand Dashboard System Tests...');
    
    // Test API endpoints
    await this.testAuthorizedServiceCenters();
    await this.testAuthorizedDistributors();
    await this.testNotificationsAPI();
    await this.testDTDCConfiguration();
    await this.testUnifiedPricing();
    
    return this.results;
  }

  private async testAuthorizedServiceCenters(): Promise<void> {
    try {
      const response = await fetch('/api/brand/authorized-service-centers?limit=10');
      
      if (response.ok) {
        const data = await response.json();
        this.addResult({
          component: 'Authorized Service Centers API',
          status: 'pass',
          message: `Successfully loaded ${data.recipients?.length || 0} service centers`,
          details: data
        });
      } else if (response.status === 401) {
        this.addResult({
          component: 'Authorized Service Centers API',
          status: 'warning',
          message: 'Authentication required - this is expected behavior',
          details: { status: response.status }
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      this.addResult({
        component: 'Authorized Service Centers API',
        status: 'fail',
        message: `Failed to load service centers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testAuthorizedDistributors(): Promise<void> {
    try {
      const response = await fetch('/api/brand/authorized-distributors?limit=10');
      
      if (response.ok) {
        const data = await response.json();
        this.addResult({
          component: 'Authorized Distributors API',
          status: 'pass',
          message: `Successfully loaded ${data.recipients?.length || 0} distributors`,
          details: data
        });
      } else if (response.status === 401) {
        this.addResult({
          component: 'Authorized Distributors API',
          status: 'warning',
          message: 'Authentication required - this is expected behavior',
          details: { status: response.status }
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      this.addResult({
        component: 'Authorized Distributors API',
        status: 'fail',
        message: `Failed to load distributors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testNotificationsAPI(): Promise<void> {
    try {
      const response = await fetch('/api/notifications?limit=5');
      
      if (response.ok) {
        const data = await response.json();
        this.addResult({
          component: 'Notifications API',
          status: 'pass',
          message: `Successfully loaded ${data.data?.length || 0} notifications`,
          details: data
        });
      } else if (response.status === 401) {
        this.addResult({
          component: 'Notifications API',
          status: 'warning',
          message: 'Authentication required - this is expected behavior',
          details: { status: response.status }
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      this.addResult({
        component: 'Notifications API',
        status: 'fail',
        message: `Failed to load notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testDTDCConfiguration(): Promise<void> {
    try {
      // Test DTDC pincode check (public endpoint)
      const response = await fetch('/api/dtdc/pincode-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgPincode: '400069',
          desPincode: '110001'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult({
          component: 'DTDC Configuration',
          status: 'pass',
          message: `DTDC API responding correctly. Serviceability: ${data.serviceable ? 'Yes' : 'No'}`,
          details: data
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      this.addResult({
        component: 'DTDC Configuration',
        status: 'fail',
        message: `DTDC API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testUnifiedPricing(): Promise<void> {
    try {
      // Test unified pricing calculation (requires auth)
      const response = await fetch('/api/admin/unified-pricing?action=calculate&brandId=brand-1&weight=1&pieces=1&pincode=400069');
      
      if (response.ok) {
        const data = await response.json();
        this.addResult({
          component: 'Unified Pricing System',
          status: 'pass',
          message: `Pricing calculation working. Total cost: ₹${data.totalCost || 'N/A'}`,
          details: data
        });
      } else if (response.status === 401 || response.status === 403) {
        this.addResult({
          component: 'Unified Pricing System',
          status: 'warning',
          message: 'Authentication required - this is expected behavior for admin endpoints',
          details: { status: response.status }
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      this.addResult({
        component: 'Unified Pricing System',
        status: 'fail',
        message: `Pricing system test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private addResult(result: TestResult): void {
    this.results.push(result);
    
    const emoji = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${emoji} ${result.component}: ${result.message}`);
  }

  generateReport(): string {
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    
    let report = '\n🔍 Brand Dashboard System Test Report\n';
    report += '=' .repeat(50) + '\n\n';
    
    report += `📊 Summary:\n`;
    report += `  ✅ Passed: ${passCount}\n`;
    report += `  ⚠️  Warnings: ${warningCount}\n`;
    report += `  ❌ Failed: ${failCount}\n\n`;
    
    report += `📋 Detailed Results:\n`;
    this.results.forEach((result, index) => {
      const emoji = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      report += `  ${index + 1}. ${emoji} ${result.component}\n`;
      report += `     ${result.message}\n\n`;
    });
    
    if (failCount === 0) {
      report += '🎉 All critical systems are functioning correctly!\n';
    } else {
      report += '🔧 Some systems need attention. Check the failed tests above.\n';
    }
    
    return report;
  }
}

// Utility function to run tests from browser console
export async function runBrandDashboardTests(): Promise<void> {
  const tester = new BrandDashboardTester();
  const results = await tester.runAllTests();
  const report = tester.generateReport();
  
  console.log(report);
  
  // Also return results for programmatic access
  return results as any;
}

// Export for use in components
export default BrandDashboardTester;