import { NextApiRequest, NextApiResponse } from 'next';
import { SystemHealthChecker } from '@/lib/system-health';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Starting System Health Check at:', new Date().toISOString());
    
    const healthChecker = new SystemHealthChecker();
    const result = await healthChecker.runFullHealthCheck();

    // Generate summary
    const failedChecks = Object.values(result.checks).filter(check => check.status === 'fail').length;
    const warningChecks = Object.values(result.checks).filter(check => check.status === 'warning').length;
    
    const summary = failedChecks > 0 
      ? `${failedChecks} critical issue(s) and ${warningChecks} warning(s) detected`
      : warningChecks > 0 
        ? `${warningChecks} warning(s) detected`
        : 'All systems operational';

    const response = {
      ...result,
      summary,
      checks: {
        authorizedTablesSync: result.checks.authorizedNetworkIntegrity,
        shipmentDropdownData: result.checks.shipmentFormDataConsistency,
        brandsWithoutPartners: result.checks.brandsWithoutPartners,
        databaseConnectivity: result.checks.databaseConnectivity
      }
    };

    console.log('✅ System Health Check completed:', summary);
    console.log('📋 Full Report:', JSON.stringify(response, null, 2));

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ System Health Check failed:', error);
    return res.status(500).json({
      error: 'System health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}