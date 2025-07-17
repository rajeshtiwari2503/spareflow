import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Alternative endpoints to test
  const endpoints = [
    // Primary endpoint
    { name: 'Primary API', url: 'https://api.dtdc.com' },
    
    // Potential alternative endpoints
    { name: 'DTDC Main Site', url: 'https://dtdc.com' },
    { name: 'DTDC WWW', url: 'https://www.dtdc.com' },
    { name: 'DTDC API v2', url: 'https://api.dtdc.com/v2' },
    { name: 'DTDC Tracking', url: 'https://tracking.dtdc.com' },
    { name: 'DTDC Portal', url: 'https://portal.dtdc.com' },
    { name: 'DTDC Services', url: 'https://services.dtdc.com' },
    
    // Common IP addresses (these would need to be obtained from DTDC)
    // Note: These are examples - real IPs need to be provided by DTDC
    { name: 'Direct IP Test 1', url: 'http://103.21.58.192', note: 'Example IP - replace with actual DTDC IP' },
    { name: 'Direct IP Test 2', url: 'http://172.67.74.226', note: 'Example IP - replace with actual DTDC IP' },
  ];

  for (const endpoint of endpoints) {
    const test = {
      name: endpoint.name,
      url: endpoint.url,
      note: endpoint.note,
      results: {} as any
    };

    try {
      // Test basic connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        signal: controller.signal
      });
      const endTime = Date.now();
      
      clearTimeout(timeoutId);
      
      test.results.connectivity = {
        success: true,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries())
      };

      // If this is an API endpoint, test with a simple API call
      if (endpoint.url.includes('api.dtdc.com')) {
        try {
          const apiController = new AbortController();
          const apiTimeoutId = setTimeout(() => apiController.abort(), 15000);
          
          const apiResponse = await fetch(`${endpoint.url}/api/shipment/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': process.env.DTDC_API_KEY || 'test'
            },
            body: JSON.stringify({ test: 'connectivity' }),
            signal: apiController.signal
          });
          
          clearTimeout(apiTimeoutId);
          
          test.results.apiTest = {
            success: true,
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            note: 'API endpoint accessible'
          };
        } catch (apiError: any) {
          test.results.apiTest = {
            success: false,
            error: apiError.message,
            name: apiError.name
          };
        }
      }

    } catch (error: any) {
      test.results.connectivity = {
        success: false,
        error: error.message,
        name: error.name,
        code: error.code
      };
    }

    testResults.tests.push(test);
  }

  // Analysis
  const workingEndpoints = testResults.tests.filter(t => t.results.connectivity?.success);
  const failedEndpoints = testResults.tests.filter(t => !t.results.connectivity?.success);

  const analysis = {
    workingEndpoints: workingEndpoints.length,
    failedEndpoints: failedEndpoints.length,
    recommendations: [] as string[]
  };

  if (workingEndpoints.length === 0) {
    analysis.recommendations.push('No DTDC endpoints are reachable - likely hosting environment network issue');
    analysis.recommendations.push('Contact hosting provider immediately');
  } else if (workingEndpoints.some(e => e.url.includes('dtdc.com'))) {
    analysis.recommendations.push('DTDC infrastructure is reachable - API endpoint specific issue');
    analysis.recommendations.push('Contact DTDC for alternative API endpoints');
  }

  if (workingEndpoints.length > 0) {
    analysis.recommendations.push('Consider using working endpoints as alternatives');
  }

  return res.status(200).json({
    success: true,
    results: testResults,
    analysis,
    nextSteps: [
      'Use working endpoints if available',
      'Contact DTDC for official alternative endpoints',
      'Implement endpoint failover in production code',
      'Consider proxy/relay service if direct connection impossible'
    ]
  });
}