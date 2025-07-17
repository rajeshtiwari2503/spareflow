import type { NextApiRequest, NextApiResponse } from 'next';

interface ConnectivityTestResult {
  success: boolean;
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    userAgent?: string;
  };
  credentials: {
    hasApiKey: boolean;
    hasCustomerCode: boolean;
    apiKeyPreview: string;
    customerCode: string;
  };
  connectivityTests: {
    testName: string;
    url: string;
    method: string;
    success: boolean;
    status: number;
    statusText: string;
    responseTime: number;
    error?: string;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
  }[];
  recommendations: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConnectivityTestResult>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      },
      credentials: {
        hasApiKey: false,
        hasCustomerCode: false,
        apiKeyPreview: '',
        customerCode: ''
      },
      connectivityTests: [],
      recommendations: ['Method not allowed']
    });
  }

  const DTDC_API_KEY = process.env.DTDC_API_KEY_NEW;
  const DTDC_CUSTOMER_CODE = process.env.DTDC_CUSTOMER_CODE;

  const connectivityTests = [];
  const recommendations = [];

  // Test 1: Basic DNS resolution and HTTPS connectivity
  const basicTests = [
    {
      testName: 'Basic DTDC API Connectivity',
      url: 'https://api.dtdc.com',
      method: 'GET'
    },
    {
      testName: 'DTDC API Health Check',
      url: 'https://api.dtdc.com/health',
      method: 'GET'
    },
    {
      testName: 'DTDC API Status',
      url: 'https://api.dtdc.com/status',
      method: 'GET'
    },
    {
      testName: 'Google DNS Test (Control)',
      url: 'https://dns.google',
      method: 'GET'
    }
  ];

  for (const test of basicTests) {
    const startTime = Date.now();
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'User-Agent': 'SpareFlow-DTDC-Test/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody;
      try {
        const text = await response.text();
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text.substring(0, 200); // First 200 chars if not JSON
        }
      } catch {
        responseBody = 'Unable to read response body';
      }

      connectivityTests.push({
        testName: test.testName,
        url: test.url,
        method: test.method,
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        responseHeaders,
        responseBody
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      connectivityTests.push({
        testName: test.testName,
        url: test.url,
        method: test.method,
        success: false,
        status: 0,
        statusText: 'Network Error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Test 2: DTDC API with authentication
  if (DTDC_API_KEY && DTDC_CUSTOMER_CODE) {
    const authTests = [
      {
        testName: 'DTDC Account Info with Auth',
        url: 'https://api.dtdc.com/api/account/info',
        method: 'GET',
        headers: {
          'api-key': DTDC_API_KEY,
          'Content-Type': 'application/json'
        }
      },
      {
        testName: 'DTDC Service Types with Auth',
        url: 'https://api.dtdc.com/api/service-types',
        method: 'GET',
        headers: {
          'api-key': DTDC_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    ];

    for (const test of authTests) {
      const startTime = Date.now();
      try {
        const response = await fetch(test.url, {
          method: test.method,
          headers: {
            ...test.headers,
            'User-Agent': 'SpareFlow-DTDC-Test/1.0'
          },
          signal: AbortSignal.timeout(10000)
        });

        const responseTime = Date.now() - startTime;
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        let responseBody;
        try {
          const text = await response.text();
          try {
            responseBody = JSON.parse(text);
          } catch {
            responseBody = text.substring(0, 200);
          }
        } catch {
          responseBody = 'Unable to read response body';
        }

        connectivityTests.push({
          testName: test.testName,
          url: test.url,
          method: test.method,
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          responseTime,
          responseHeaders,
          responseBody
        });

      } catch (error) {
        const responseTime = Date.now() - startTime;
        connectivityTests.push({
          testName: test.testName,
          url: test.url,
          method: test.method,
          success: false,
          status: 0,
          statusText: 'Network Error',
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  // Generate recommendations
  const failedTests = connectivityTests.filter(test => !test.success);
  const networkErrors = connectivityTests.filter(test => test.error?.includes('fetch failed') || test.status === 0);

  if (networkErrors.length === connectivityTests.length) {
    recommendations.push('🚨 Complete network connectivity failure detected');
    recommendations.push('🔧 Check if deployment environment allows outbound HTTPS requests');
    recommendations.push('🔧 Verify firewall/security group settings');
    recommendations.push('🔧 Check if proxy configuration is required');
  } else if (failedTests.length > 0) {
    recommendations.push(`⚠️ ${failedTests.length}/${connectivityTests.length} tests failed`);
    recommendations.push('🔧 Some connectivity issues detected');
  } else {
    recommendations.push('✅ All connectivity tests passed');
  }

  if (!DTDC_API_KEY || !DTDC_CUSTOMER_CODE) {
    recommendations.push('⚠️ Missing DTDC credentials');
  }

  const result: ConnectivityTestResult = {
    success: true,
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      userAgent: req.headers['user-agent']
    },
    credentials: {
      hasApiKey: !!DTDC_API_KEY,
      hasCustomerCode: !!DTDC_CUSTOMER_CODE,
      apiKeyPreview: DTDC_API_KEY ? DTDC_API_KEY.substring(0, 8) + '***' : '',
      customerCode: DTDC_CUSTOMER_CODE || ''
    },
    connectivityTests,
    recommendations
  };

  return res.status(200).json(result);
}