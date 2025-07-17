import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only SERVICE_CENTER and DISTRIBUTOR roles need authorization checks
    if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(user.role)) {
      return res.status(200).json({
        isAuthorized: true,
        authorizedBrands: [],
        pendingRequests: 0
      });
    }

    let authorizedBrands: string[] = [];
    let pendingRequests = 0;

    if (user.role === 'SERVICE_CENTER') {
      // Check authorized service centers
      const authorizations = await prisma.brandAuthorizedServiceCenter.findMany({
        where: {
          serviceCenterUserId: user.id,
          status: 'Active'
        },
        include: {
          brand: {
            select: {
              name: true
            }
          }
        }
      });

      authorizedBrands = authorizations.map(auth => auth.brand.name);

      // Check pending requests
      const pending = await prisma.brandAccessRequest.count({
        where: {
          userId: user.id,
          roleType: 'SERVICE_CENTER',
          status: 'PENDING'
        }
      });

      pendingRequests = pending;

    } else if (user.role === 'DISTRIBUTOR') {
      // Check authorized distributors
      const authorizations = await prisma.brandAuthorizedDistributor.findMany({
        where: {
          distributorUserId: user.id,
          status: 'Active'
        },
        include: {
          brand: {
            select: {
              name: true
            }
          }
        }
      });

      authorizedBrands = authorizations.map(auth => auth.brand.name);

      // Check pending requests
      const pending = await prisma.brandAccessRequest.count({
        where: {
          userId: user.id,
          roleType: 'DISTRIBUTOR',
          status: 'PENDING'
        }
      });

      pendingRequests = pending;
    }

    return res.status(200).json({
      isAuthorized: authorizedBrands.length > 0,
      authorizedBrands,
      pendingRequests,
      userRole: user.role,
      userId: user.id
    });

  } catch (error) {
    console.error('Error checking authorization status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}