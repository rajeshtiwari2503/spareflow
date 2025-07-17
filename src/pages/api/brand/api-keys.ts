import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyAuth(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const { brandId, name } = req.body;
      
      // Generate a new API key
      const apiKey = {
        id: crypto.randomUUID(),
        name,
        key: `sk_${crypto.randomBytes(32).toString('hex')}`,
        permissions: ['read', 'write'],
        createdAt: new Date().toISOString(),
        active: true
      };

      // Here you would save the API key to the database
      
      res.status(201).json({ apiKey });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}