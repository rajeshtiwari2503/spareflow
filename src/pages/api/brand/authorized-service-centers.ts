import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetServiceCenters(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetServiceCenters(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    const { search, limit = 50, offset = 0 } = req.query;

    // Only brands can access this endpoint
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Only brands can access service centers.' });
    }

    // Build search conditions for service centers
    let serviceCenterWhereClause: any = {
      role: 'SERVICE_CENTER'
    };

    // Add search functionality
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      serviceCenterWhereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } }
      ];
    }

    // Fetch authorized service centers through the junction table
    const authorizedServiceCenters = await prisma.brandAuthorizedServiceCenter.findMany({
      where: {
        brandId: user.id,
        status: 'Active'
      },
      include: {
        serviceCenter: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
            serviceCenterProfile: {
              select: {
                centerName: true,
                contactPerson: true,
                addresses: {
                  select: {
                    street: true,
                    area: true,
                    city: true,
                    state: true,
                    pincode: true,
                    country: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        serviceCenter: {
          name: 'asc'
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Filter by search if provided
    let filteredServiceCenters = authorizedServiceCenters;
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      filteredServiceCenters = authorizedServiceCenters.filter(asc => {
        const sc = asc.serviceCenter;
        return (
          sc.name.toLowerCase().includes(searchTerm) ||
          sc.email.toLowerCase().includes(searchTerm) ||
          (sc.phone && sc.phone.includes(searchTerm)) ||
          (sc.serviceCenterProfile?.centerName?.toLowerCase().includes(searchTerm)) ||
          (sc.serviceCenterProfile?.contactPerson?.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Get total count for pagination
    const totalCount = await prisma.brandAuthorizedServiceCenter.count({
      where: {
        brandId: user.id,
        status: 'Active'
      }
    });

    // Format response
    const formattedServiceCenters = filteredServiceCenters.map(asc => {
      const sc = asc.serviceCenter;
      const profile = sc.serviceCenterProfile;
      const address = profile?.addresses?.[0];
      
      return {
        id: sc.id,
        name: sc.name,
        email: sc.email,
        phone: sc.phone || '',
        type: 'SERVICE_CENTER' as const,
        centerName: profile?.centerName || sc.name,
        contactPerson: profile?.contactPerson || '',
        address: {
          street: address?.street || '',
          area: address?.area || '',
          city: address?.city || '',
          state: address?.state || '',
          pincode: address?.pincode || '',
          country: address?.country || 'India'
        },
        status: 'ACTIVE' as const,
        createdAt: sc.createdAt,
        updatedAt: sc.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      serviceCenters: formattedServiceCenters,
      recipients: formattedServiceCenters, // Alias for unified component
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + formattedServiceCenters.length < totalCount
      },
      meta: {
        searchTerm: search || null,
        resultCount: formattedServiceCenters.length
      }
    });

  } catch (error) {
    console.error('Error fetching authorized service centers:', error);
    return res.status(500).json({
      error: 'Failed to fetch authorized service centers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}