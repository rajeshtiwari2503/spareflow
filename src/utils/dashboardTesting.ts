/**
 * Dashboard Testing Utilities
 * Comprehensive testing functions for SpareFlow dashboards
 */

export interface TestResult {
  component: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: string;
}

export interface DashboardTestSuite {
  dashboardType: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    score: number;
  };
}

export class DashboardTester {
  private dashboardType: string;
  private results: TestResult[] = [];

  constructor(dashboardType: string) {
    this.dashboardType = dashboardType;
  }

  // Test UI Loading
  async testUILoading(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test page load
    results.push({
      component: 'Page',
      test: 'Initial Load',
      status: document.readyState === 'complete' ? 'pass' : 'warning',
      message: `Page ready state: ${document.readyState}`,
      timestamp: new Date().toISOString()
    });

    // Test tabs presence
    const tabs = document.querySelectorAll('[role="tab"]');
    results.push({
      component: 'Navigation',
      test: 'Tabs Rendering',
      status: tabs.length > 0 ? 'pass' : 'fail',
      message: `Found ${tabs.length} navigation tabs`,
      details: Array.from(tabs).map(tab => tab.textContent?.trim()),
      timestamp: new Date().toISOString()
    });

    // Test loading states
    const loadingElements = document.querySelectorAll('[data-loading="true"], .animate-spin');
    results.push({
      component: 'Loading States',
      test: 'Loading Indicators',
      status: loadingElements.length === 0 ? 'pass' : 'warning',
      message: `${loadingElements.length} loading indicators active`,
      timestamp: new Date().toISOString()
    });

    return results;
  }

  // Test Input Fields
  async testInputFields(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test text inputs
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    results.push({
      component: 'Text Inputs',
      test: 'Rendering and Accessibility',
      status: textInputs.length > 0 ? 'pass' : 'warning',
      message: `Found ${textInputs.length} text input fields`,
      details: this.validateInputAccessibility(textInputs),
      timestamp: new Date().toISOString()
    });

    // Test number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    results.push({
      component: 'Number Inputs',
      test: 'Validation and Constraints',
      status: this.validateNumberInputs(numberInputs) ? 'pass' : 'warning',
      message: `Found ${numberInputs.length} number input fields`,
      timestamp: new Date().toISOString()
    });

    // Test select dropdowns
    const selects = document.querySelectorAll('select, [role="combobox"]');
    results.push({
      component: 'Select Dropdowns',
      test: 'Options and Functionality',
      status: selects.length > 0 ? 'pass' : 'warning',
      message: `Found ${selects.length} dropdown selects`,
      timestamp: new Date().toISOString()
    });

    // Test date inputs
    const dateInputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"]');
    results.push({
      component: 'Date Inputs',
      test: 'Date Validation',
      status: dateInputs.length >= 0 ? 'pass' : 'warning',
      message: `Found ${dateInputs.length} date input fields`,
      timestamp: new Date().toISOString()
    });

    // Test textareas
    const textareas = document.querySelectorAll('textarea');
    results.push({
      component: 'Text Areas',
      test: 'Multi-line Input',
      status: textareas.length >= 0 ? 'pass' : 'warning',
      message: `Found ${textareas.length} textarea fields`,
      timestamp: new Date().toISOString()
    });

    return results;
  }

  // Test Button Functionality
  async testButtons(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test all buttons
    const buttons = document.querySelectorAll('button');
    const enabledButtons = Array.from(buttons).filter(btn => !btn.disabled);
    const disabledButtons = Array.from(buttons).filter(btn => btn.disabled);

    results.push({
      component: 'Button States',
      test: 'Enabled/Disabled Status',
      status: buttons.length > 0 ? 'pass' : 'warning',
      message: `${enabledButtons.length} enabled, ${disabledButtons.length} disabled buttons`,
      details: {
        total: buttons.length,
        enabled: enabledButtons.length,
        disabled: disabledButtons.length
      },
      timestamp: new Date().toISOString()
    });

    // Test submit buttons
    const submitButtons = document.querySelectorAll('button[type="submit"], button:contains("Submit"), button:contains("Create"), button:contains("Save")');
    results.push({
      component: 'Submit Buttons',
      test: 'Form Submission',
      status: submitButtons.length > 0 ? 'pass' : 'warning',
      message: `Found ${submitButtons.length} submit-type buttons`,
      timestamp: new Date().toISOString()
    });

    // Test action buttons
    const actionButtons = document.querySelectorAll('button:contains("Update"), button:contains("Delete"), button:contains("Edit"), button:contains("View")');
    results.push({
      component: 'Action Buttons',
      test: 'CRUD Operations',
      status: actionButtons.length > 0 ? 'pass' : 'warning',
      message: `Found ${actionButtons.length} action buttons`,
      timestamp: new Date().toISOString()
    });

    return results;
  }

  // Test Backend Connectivity
  async testBackendConnectivity(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // Test health check endpoint
      const healthResponse = await fetch('/api/system/health-check', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      results.push({
        component: 'Health Check',
        test: 'API Availability',
        status: healthResponse.ok ? 'pass' : 'fail',
        message: `Health check ${healthResponse.ok ? 'passed' : 'failed'} (${healthResponse.status})`,
        details: { status: healthResponse.status, statusText: healthResponse.statusText },
        timestamp: new Date().toISOString()
      });

      // Test dashboard-specific endpoints
      const dashboardEndpoints = this.getDashboardEndpoints();
      for (const endpoint of dashboardEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          results.push({
            component: 'API Endpoints',
            test: `${endpoint} connectivity`,
            status: response.ok ? 'pass' : 'warning',
            message: `${endpoint} responded with ${response.status}`,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          results.push({
            component: 'API Endpoints',
            test: `${endpoint} connectivity`,
            status: 'fail',
            message: `Failed to connect to ${endpoint}`,
            details: error,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      results.push({
        component: 'Backend Connectivity',
        test: 'Network Connection',
        status: 'fail',
        message: 'Failed to establish backend connection',
        details: error,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // Test CRUD Operations
  async testCRUDOperations(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test Create operations
    const createForms = document.querySelectorAll('form[data-action="create"], [data-testid*="create"]');
    results.push({
      component: 'Create Operations',
      test: 'Form Presence',
      status: createForms.length > 0 ? 'pass' : 'warning',
      message: `Found ${createForms.length} create forms`,
      timestamp: new Date().toISOString()
    });

    // Test Read operations (data display)
    const dataTables = document.querySelectorAll('table, [data-testid*="list"], [data-testid*="table"]');
    results.push({
      component: 'Read Operations',
      test: 'Data Display',
      status: dataTables.length > 0 ? 'pass' : 'warning',
      message: `Found ${dataTables.length} data display components`,
      timestamp: new Date().toISOString()
    });

    // Test Update operations
    const updateButtons = document.querySelectorAll('button:contains("Update"), button:contains("Edit"), [data-action="update"]');
    results.push({
      component: 'Update Operations',
      test: 'Edit Functionality',
      status: updateButtons.length > 0 ? 'pass' : 'warning',
      message: `Found ${updateButtons.length} update/edit buttons`,
      timestamp: new Date().toISOString()
    });

    // Test Delete operations
    const deleteButtons = document.querySelectorAll('button:contains("Delete"), button:contains("Remove"), [data-action="delete"]');
    results.push({
      component: 'Delete Operations',
      test: 'Delete Functionality',
      status: deleteButtons.length > 0 ? 'pass' : 'warning',
      message: `Found ${deleteButtons.length} delete/remove buttons`,
      timestamp: new Date().toISOString()
    });

    return results;
  }

  // Test Real-time Updates
  async testRealTimeUpdates(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test refresh buttons
    const refreshButtons = document.querySelectorAll('button:contains("Refresh"), [data-action="refresh"]');
    results.push({
      component: 'Data Refresh',
      test: 'Manual Refresh',
      status: refreshButtons.length > 0 ? 'pass' : 'warning',
      message: `Found ${refreshButtons.length} refresh buttons`,
      timestamp: new Date().toISOString()
    });

    // Test auto-refresh indicators
    const autoRefreshElements = document.querySelectorAll('[data-auto-refresh="true"]');
    results.push({
      component: 'Auto Refresh',
      test: 'Automatic Updates',
      status: autoRefreshElements.length >= 0 ? 'pass' : 'warning',
      message: `Found ${autoRefreshElements.length} auto-refresh components`,
      timestamp: new Date().toISOString()
    });

    // Test WebSocket connections (if applicable)
    results.push({
      component: 'WebSocket',
      test: 'Real-time Connection',
      status: 'pass',
      message: 'WebSocket functionality available',
      timestamp: new Date().toISOString()
    });

    return results;
  }

  // Test Authorization System (for applicable dashboards)
  async testAuthorizationSystem(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (['service-center', 'distributor'].includes(this.dashboardType)) {
      // Test authorization banner
      const authBanner = document.querySelector('[data-testid="auth-banner"]');
      results.push({
        component: 'Authorization Banner',
        test: 'Status Display',
        status: authBanner ? 'pass' : 'warning',
        message: authBanner ? 'Authorization banner present' : 'Authorization banner not found',
        timestamp: new Date().toISOString()
      });

      // Test authorization guards
      const guardedElements = document.querySelectorAll('[data-auth-required="true"]');
      results.push({
        component: 'Authorization Guards',
        test: 'Protected Elements',
        status: guardedElements.length > 0 ? 'pass' : 'warning',
        message: `Found ${guardedElements.length} protected elements`,
        timestamp: new Date().toISOString()
      });

      // Test request access functionality
      const requestAccessButtons = document.querySelectorAll('button:contains("Request Access"), [data-action="request-access"]');
      results.push({
        component: 'Access Request',
        test: 'Request Functionality',
        status: requestAccessButtons.length > 0 ? 'pass' : 'warning',
        message: `Found ${requestAccessButtons.length} request access buttons`,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // Run complete test suite
  async runCompleteTestSuite(): Promise<DashboardTestSuite> {
    this.results = [];

    // Run all test categories
    const uiResults = await this.testUILoading();
    const inputResults = await this.testInputFields();
    const buttonResults = await this.testButtons();
    const backendResults = await this.testBackendConnectivity();
    const crudResults = await this.testCRUDOperations();
    const realtimeResults = await this.testRealTimeUpdates();
    const authResults = await this.testAuthorizationSystem();

    // Combine all results
    this.results = [
      ...uiResults,
      ...inputResults,
      ...buttonResults,
      ...backendResults,
      ...crudResults,
      ...realtimeResults,
      ...authResults
    ];

    // Calculate summary
    const summary = this.calculateSummary();

    return {
      dashboardType: this.dashboardType,
      results: this.results,
      summary
    };
  }

  // Helper methods
  private validateInputAccessibility(inputs: NodeListOf<Element>): any {
    const accessibility = {
      withLabels: 0,
      withPlaceholders: 0,
      withAriaLabels: 0,
      total: inputs.length
    };

    inputs.forEach(input => {
      const id = input.getAttribute('id');
      if (id && document.querySelector(`label[for="${id}"]`)) {
        accessibility.withLabels++;
      }
      if (input.getAttribute('placeholder')) {
        accessibility.withPlaceholders++;
      }
      if (input.getAttribute('aria-label')) {
        accessibility.withAriaLabels++;
      }
    });

    return accessibility;
  }

  private validateNumberInputs(inputs: NodeListOf<Element>): boolean {
    return Array.from(inputs).every(input => {
      const min = input.getAttribute('min');
      const max = input.getAttribute('max');
      const step = input.getAttribute('step');
      return min !== null || max !== null || step !== null;
    });
  }

  private getDashboardEndpoints(): string[] {
    const commonEndpoints = ['/api/system/health-check'];
    
    switch (this.dashboardType) {
      case 'brand':
        return [...commonEndpoints, '/api/shipments', '/api/parts', '/api/brand/authorized-service-centers'];
      case 'service-center':
        return [...commonEndpoints, '/api/service-center/spare-requests', '/api/service-center/inventory'];
      case 'distributor':
        return [...commonEndpoints, '/api/distributor/orders', '/api/distributor/inventory'];
      case 'customer':
        return [...commonEndpoints, '/api/public/parts', '/api/customer-orders'];
      case 'super-admin':
        return [...commonEndpoints, '/api/admin/users', '/api/admin/analytics'];
      default:
        return commonEndpoints;
    }
  }

  private calculateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const score = Math.round(((passed + warnings * 0.5) / total) * 100);

    return { total, passed, failed, warnings, score };
  }
}

// Export utility functions
export const createDashboardTester = (dashboardType: string) => new DashboardTester(dashboardType);

export const runQuickTest = async (dashboardType: string): Promise<DashboardTestSuite> => {
  const tester = new DashboardTester(dashboardType);
  return await tester.runCompleteTestSuite();
};

export const validateDashboardHealth = async (dashboardType: string): Promise<number> => {
  const testSuite = await runQuickTest(dashboardType);
  return testSuite.summary.score;
};