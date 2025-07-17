import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple authentication check (in production, use proper API keys)
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET || 'default-secret';
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕐 Scheduled tracking job triggered');
    
    // Call the background job
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (req.headers.host?.includes('localhost') ? 'http://localhost:3000' : `https://${req.headers.host}`);
    
    const response = await fetch(`${baseUrl}/api/tracking/background-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Scheduled tracking job completed successfully');
      return res.status(200).json({
        success: true,
        message: 'Scheduled tracking job completed',
        ...result
      });
    } else {
      console.error('❌ Scheduled tracking job failed:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Scheduled tracking job failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ Scheduled tracking job error:', error);
    return res.status(500).json({
      success: false,
      error: 'Scheduled tracking job error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}