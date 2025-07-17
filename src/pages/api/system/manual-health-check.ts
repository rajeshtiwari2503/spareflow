import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated and has admin role
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Super Admin role required.' });
    }

    console.log(`🔧 Manual System Health Check triggered by ${user.name} (${user.email}) at:`, new Date().toISOString());
    
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
    
    // Log the manual trigger
    console.log(`👤 Manual health check completed by ${user.name}:`, healthCheckResult.summary);

    return res.status(200).json({
      message: 'Manual health check completed',
      triggeredBy: {
        name: user.name,
        email: user.email
      },
      result: healthCheckResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual health check failed:', error);
    return res.status(500).json({
      error: 'Manual health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}