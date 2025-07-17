import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch all access requests with related data
    const requests = await prisma.brandAccessRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        handledByAdmin: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Pending first
        { createdAt: 'desc' } // Most recent first
      ]
    });

    return res.status(200).json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Error fetching access requests:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch access requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}