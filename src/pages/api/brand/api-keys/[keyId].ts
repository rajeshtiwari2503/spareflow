import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyAuth(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { keyId } = req.query;

    if (req.method === 'DELETE') {
      // Here you would delete the API key from the database
      
      res.status(200).json({ message: 'API key revoked successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Key deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}