import { NextApiRequest, NextApiResponse } from 'next';
import { promisify } from 'util';
import { lookup, resolve } from 'dns';

const dnsLookup = promisify(lookup);
const dnsResolve = promisify(resolve);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const testResults = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: [] as any[]
  };

  // Test domains to check
  const domains = [
    'api.dtdc.com',
    'dtdc.com',
    'www.dtdc.com',
    'google.com', // Control test
    'api.google.com' // Control test
  ];

  // Test different DNS resolution methods
  for (const domain of domains) {
    const domainTest = {
      domain,
      methods: {} as any
    };

    try {
      // Method 1: Node.js dns.lookup
      try {
        const lookupResult = await dnsLookup(domain);
        domainTest.methods.nodeLookup = {
          success: true,
          address: lookupResult.address,
          family: lookupResult.family
        };
      } catch (error: any) {
        domainTest.methods.nodeLookup = {
          success: false,
          error: error.message,
          code: error.code
        };
      }

      // Method 2: Node.js dns.resolve (A records)
      try {
        const resolveResult = await dnsResolve(domain, 'A');
        domainTest.methods.nodeResolveA = {
          success: true,
          addresses: resolveResult
        };
      } catch (error: any) {
        domainTest.methods.nodeResolveA = {
          success: false,
          error: error.message,
          code: error.code
        };
      }

      // Method 3: Fetch test (HTTP connectivity)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const fetchResult = await fetch(`https://${domain}`, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        domainTest.methods.httpConnectivity = {
          success: true,
          status: fetchResult.status,
          statusText: fetchResult.statusText,
          headers: Object.fromEntries(fetchResult.headers.entries())
        };
      } catch (error: any) {
        domainTest.methods.httpConnectivity = {
          success: false,
          error: error.message,
          name: error.name
        };
      }

      // Method 4: Specific DTDC API endpoint test
      if (domain === 'api.dtdc.com') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const apiTest = await fetch('https://api.dtdc.com/api/shipment/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': process.env.DTDC_API_KEY || 'test'
            },
            body: JSON.stringify({ test: 'connectivity' }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          domainTest.methods.dtdcApiTest = {
            success: true,
            status: apiTest.status,
            statusText: apiTest.statusText,
            note: 'API endpoint reachable (may return auth error, but connectivity works)'
          };
        } catch (error: any) {
          domainTest.methods.dtdcApiTest = {
            success: false,
            error: error.message,
            name: error.name,
            note: 'API endpoint unreachable'
          };
        }
      }

    } catch (error: any) {
      domainTest.error = error.message;
    }

    testResults.tests.push(domainTest);
  }

  // Environment information
  const envInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: process.env.NODE_ENV,
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    vercelUrl: process.env.VERCEL_URL || 'unknown'
  };

  // Recommendations based on results
  const recommendations = [];
  
  const dtdcTest = testResults.tests.find(t => t.domain === 'api.dtdc.com');
  const googleTest = testResults.tests.find(t => t.domain === 'google.com');
  
  if (googleTest?.methods?.nodeLookup?.success && !dtdcTest?.methods?.nodeLookup?.success) {
    recommendations.push('DNS resolution works for other domains but fails for DTDC - likely DTDC-specific issue');
  }
  
  if (!googleTest?.methods?.nodeLookup?.success) {
    recommendations.push('DNS resolution fails for all domains - hosting environment DNS issue');
  }
  
  if (dtdcTest?.methods?.httpConnectivity?.success) {
    recommendations.push('DTDC domain is reachable via HTTP - DNS resolution working');
  }

  return res.status(200).json({
    success: true,
    results: testResults,
    environment: envInfo,
    recommendations,
    nextSteps: [
      'Contact hosting provider if DNS fails for all domains',
      'Contact DTDC if only their domain fails',
      'Consider using IP addresses if domain resolution consistently fails',
      'Implement custom DNS resolver if needed'
    ]
  });
}