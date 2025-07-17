/**
 * Customer Dashboard Testing Utilities
 * Comprehensive testing functions for all Customer Dashboard features
 */

interface TestResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export class CustomerDashboardTester {
  private results: TestResult[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // Test authentication and token retrieval
  async testAuthentication(): Promise<TestResult> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          feature: 'Authentication',
          status: 'FAIL',
          message: 'No authentication token found'
        };
      }

      // Test token validity
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          feature: 'Authentication',
          status: 'PASS',
          message: 'Authentication successful',
          details: { userId: data.user?.id, role: data.user?.role }
        };
      } else {
        return {
          feature: 'Authentication',
          status: 'FAIL',
          message: `Authentication failed: ${response.status}`
        };
      }
    } catch (error) {
      return {
        feature: 'Authentication',
        status: 'FAIL',
        message: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test spare parts search functionality
  async testSparePartsSearch(): Promise<TestResult> {
    try {
      const testQueries = [
        'brake pad',
        'engine oil',
        'headlight',
        'battery'
      ];

      const results = [];
      for (const query of testQueries) {
        const response = await fetch(`/api/public/parts?search=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          results.push({
            query,
            success: data.success,
            partsCount: data.parts?.length || 0
          });
        } else {
          results.push({
            query,
            success: false,
            error: response.status
          });
        }
      }

      const successfulQueries = results.filter(r => r.success);
      if (successfulQueries.length === testQueries.length) {
        return {
          feature: 'Spare Parts Search',
          status: 'PASS',
          message: 'All search queries successful',
          details: results
        };
      } else {
        return {
          feature: 'Spare Parts Search',
          status: 'WARNING',
          message: `${successfulQueries.length}/${testQueries.length} search queries successful`,
          details: results
        };
      }
    } catch (error) {
      return {
        feature: 'Spare Parts Search',
        status: 'FAIL',
        message: `Search test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test AI DIY Assistant functionality
  async testAIDiagnostic(): Promise<TestResult> {
    try {
      const testIssues = [
        'car not starting',
        'brake noise',
        'engine overheating',
        'headlight not working'
      ];

      const results = [];
      for (const issue of testIssues) {
        const response = await fetch('/api/ai-support/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue,
            appliance: 'car',
            userId: 'test-user',
            userRole: 'CUSTOMER'
          })
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            issue,
            success: data.success,
            partsFound: data.probableParts?.length || 0,
            confidence: data.diagnosis?.confidence || 0
          });
        } else {
          results.push({
            issue,
            success: false,
            error: response.status
          });
        }
      }

      const successfulDiagnoses = results.filter(r => r.success);
      if (successfulDiagnoses.length === testIssues.length) {
        return {
          feature: 'AI Diagnostic',
          status: 'PASS',
          message: 'All AI diagnoses successful',
          details: results
        };
      } else {
        return {
          feature: 'AI Diagnostic',
          status: 'WARNING',
          message: `${successfulDiagnoses.length}/${testIssues.length} AI diagnoses successful`,
          details: results
        };
      }
    } catch (error) {
      return {
        feature: 'AI Diagnostic',
        status: 'FAIL',
        message: `AI diagnostic test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test customer orders functionality
  async testCustomerOrders(): Promise<TestResult> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          feature: 'Customer Orders',
          status: 'FAIL',
          message: 'No authentication token for orders test'
        };
      }

      const response = await fetch('/api/customer-orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          feature: 'Customer Orders',
          status: 'PASS',
          message: 'Orders fetched successfully',
          details: {
            ordersCount: data.orders?.length || 0,
            success: data.success
          }
        };
      } else {
        return {
          feature: 'Customer Orders',
          status: 'FAIL',
          message: `Orders fetch failed: ${response.status}`
        };
      }
    } catch (error) {
      return {
        feature: 'Customer Orders',
        status: 'FAIL',
        message: `Orders test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test warranty functionality
  async testWarrantyManagement(): Promise<TestResult> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          feature: 'Warranty Management',
          status: 'FAIL',
          message: 'No authentication token for warranty test'
        };
      }

      const response = await fetch('/api/customer/warranty', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          feature: 'Warranty Management',
          status: 'PASS',
          message: 'Warranty items fetched successfully',
          details: {
            warrantyCount: data.warranties?.length || 0,
            success: data.success
          }
        };
      } else {
        return {
          feature: 'Warranty Management',
          status: 'FAIL',
          message: `Warranty fetch failed: ${response.status}`
        };
      }
    } catch (error) {
      return {
        feature: 'Warranty Management',
        status: 'FAIL',
        message: `Warranty test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test service tickets functionality
  async testServiceTickets(): Promise<TestResult> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          feature: 'Service Tickets',
          status: 'FAIL',
          message: 'No authentication token for service tickets test'
        };
      }

      const response = await fetch('/api/customer/service-tickets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          feature: 'Service Tickets',
          status: 'PASS',
          message: 'Service tickets fetched successfully',
          details: {
            ticketsCount: data.serviceTickets?.length || 0,
            success: data.success
          }
        };
      } else {
        return {
          feature: 'Service Tickets',
          status: 'FAIL',
          message: `Service tickets fetch failed: ${response.status}`
        };
      }
    } catch (error) {
      return {
        feature: 'Service Tickets',
        status: 'FAIL',
        message: `Service tickets test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test checkout functionality (without actual payment)
  async testCheckoutValidation(): Promise<TestResult> {
    try {
      const testOrderData = {
        customerName: 'Test Customer',
        customerPhone: '9876543210',
        customerEmail: 'test@example.com',
        shippingAddress: {
          name: 'Test Customer',
          phone: '9876543210',
          address: 'Test Address, Test Street, Test Area',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456'
        },
        items: [
          {
            partId: 'test-part-1',
            quantity: 1,
            price: 100,
            partName: 'Test Part'
          }
        ],
        totalAmount: 100,
        paymentMethod: 'COD'
      };

      // Test validation without actually creating order
      const response = await fetch('/api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrderData)
      });

      // We expect this to fail due to invalid part ID, but it should validate the structure
      if (response.status === 400 || response.status === 500) {
        const data = await response.json();
        if (data.error && data.error.includes('part')) {
          return {
            feature: 'Checkout Validation',
            status: 'PASS',
            message: 'Checkout validation working correctly',
            details: { validationError: data.error }
          };
        }
      }

      return {
        feature: 'Checkout Validation',
        status: 'WARNING',
        message: 'Checkout validation response unexpected',
        details: { status: response.status }
      };
    } catch (error) {
      return {
        feature: 'Checkout Validation',
        status: 'FAIL',
        message: `Checkout test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test UI component rendering (client-side only)
  testUIComponents(): TestResult {
    try {
      if (typeof window === 'undefined') {
        return {
          feature: 'UI Components',
          status: 'WARNING',
          message: 'UI test skipped (server-side)'
        };
      }

      const requiredElements = [
        '[data-testid="search-input"]',
        '[data-testid="search-button"]',
        '[data-testid="cart-tab"]',
        '[data-testid="orders-tab"]',
        '[data-testid="warranty-tab"]',
        '[data-testid="ai-diy-tab"]'
      ];

      const missingElements = [];
      const foundElements = [];

      requiredElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          foundElements.push(selector);
        } else {
          missingElements.push(selector);
        }
      });

      if (missingElements.length === 0) {
        return {
          feature: 'UI Components',
          status: 'PASS',
          message: 'All required UI components found',
          details: { foundElements }
        };
      } else {
        return {
          feature: 'UI Components',
          status: 'WARNING',
          message: `${missingElements.length} UI components missing`,
          details: { missingElements, foundElements }
        };
      }
    } catch (error) {
      return {
        feature: 'UI Components',
        status: 'FAIL',
        message: `UI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test error handling
  async testErrorHandling(): Promise<TestResult> {
    try {
      const errorTests = [
        {
          name: 'Invalid API endpoint',
          url: '/api/invalid-endpoint',
          expectedStatus: 404
        },
        {
          name: 'Malformed search query',
          url: '/api/public/parts?search=',
          expectedStatus: 200 // Should handle empty search gracefully
        },
        {
          name: 'Invalid auth token',
          url: '/api/customer-orders',
          headers: { 'Authorization': 'Bearer invalid-token' },
          expectedStatus: 401
        }
      ];

      const results = [];
      for (const test of errorTests) {
        try {
          const response = await fetch(test.url, {
            headers: test.headers || {}
          });
          
          results.push({
            name: test.name,
            expectedStatus: test.expectedStatus,
            actualStatus: response.status,
            passed: response.status === test.expectedStatus
          });
        } catch (error) {
          results.push({
            name: test.name,
            expectedStatus: test.expectedStatus,
            actualStatus: 'ERROR',
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const passedTests = results.filter(r => r.passed);
      if (passedTests.length === errorTests.length) {
        return {
          feature: 'Error Handling',
          status: 'PASS',
          message: 'All error handling tests passed',
          details: results
        };
      } else {
        return {
          feature: 'Error Handling',
          status: 'WARNING',
          message: `${passedTests.length}/${errorTests.length} error handling tests passed`,
          details: results
        };
      }
    } catch (error) {
      return {
        feature: 'Error Handling',
        status: 'FAIL',
        message: `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Run all tests
  async runAllTests(): Promise<TestSuite> {
    console.log('🧪 Starting Customer Dashboard comprehensive testing...');
    
    const tests = [
      this.testAuthentication(),
      this.testSparePartsSearch(),
      this.testAIDiagnostic(),
      this.testCustomerOrders(),
      this.testWarrantyManagement(),
      this.testServiceTickets(),
      this.testCheckoutValidation(),
      this.testErrorHandling()
    ];

    // Add UI test if in browser
    if (typeof window !== 'undefined') {
      tests.push(Promise.resolve(this.testUIComponents()));
    }

    const results = await Promise.all(tests);
    
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      warnings: results.filter(r => r.status === 'WARNING').length
    };

    console.log('📊 Test Results Summary:', summary);
    results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.feature}: ${result.message}`);
    });

    return {
      name: 'Customer Dashboard Test Suite',
      results,
      summary
    };
  }

  // Utility method to get auth token
  private getAuthToken(): string | null {
    try {
      if (typeof document === 'undefined') {
        return null;
      }
      
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1] || null;
    } catch (error) {
      return null;
    }
  }

  // Generate test report
  generateReport(testSuite: TestSuite): string {
    const { results, summary } = testSuite;
    
    let report = `
# Customer Dashboard Test Report
Generated: ${new Date().toISOString()}

## Summary
- Total Tests: ${summary.total}
- Passed: ${summary.passed} ✅
- Failed: ${summary.failed} ❌
- Warnings: ${summary.warnings} ⚠️
- Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%

## Detailed Results

`;

    results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      report += `### ${icon} ${result.feature}
**Status:** ${result.status}
**Message:** ${result.message}
`;
      
      if (result.details) {
        report += `**Details:** \`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`
`;
      }
      report += '\n';
    });

    return report;
  }
}

// Export singleton instance
export const customerDashboardTester = new CustomerDashboardTester();

// Export test runner function for easy use
export async function runCustomerDashboardTests(): Promise<TestSuite> {
  return await customerDashboardTester.runAllTests();
}

// Export individual test functions
export {
  CustomerDashboardTester
};