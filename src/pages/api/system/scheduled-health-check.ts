import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the request is from a legitimate source (optional security)
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET_TOKEN;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕐 Scheduled System Health Check triggered at:', new Date().toISOString());
    
    // Call the health check endpoint internally
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const healthCheckResponse = await fetch(`${baseUrl}/api/system/health-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!healthCheckResponse.ok) {
      throw new Error(`Health check failed with status: ${healthCheckResponse.status}`);
    }

    const healthCheckResult = await healthCheckResponse.json();
    
    // Log results based on status
    if (healthCheckResult.status === 'critical') {
      console.error('🚨 CRITICAL: System health check detected critical issues!');
      console.error('Issues:', JSON.stringify(healthCheckResult.checks, null, 2));
    } else if (healthCheckResult.status === 'warning') {
      console.warn('⚠️  WARNING: System health check detected warnings');
      console.warn('Issues:', JSON.stringify(healthCheckResult.checks, null, 2));
    } else {
      console.log('✅ System health check passed - all systems operational');
    }

    return res.status(200).json({
      message: 'Scheduled health check completed',
      status: healthCheckResult.status,
      timestamp: new Date().toISOString(),
      summary: healthCheckResult.summary
    });

  } catch (error) {
    console.error('❌ Scheduled health check failed:', error);
    return res.status(500).json({
      error: 'Scheduled health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}