import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Manual trigger for background tracking job');
    
    // Call the background job directly
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
      console.log('✅ Manual trigger completed successfully');
      return res.status(200).json({
        success: true,
        message: 'Manual tracking job completed',
        ...result
      });
    } else {
      console.error('❌ Manual trigger failed:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Manual tracking job failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ Manual trigger error:', error);
    return res.status(500).json({
      success: false,
      error: 'Manual tracking job error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}