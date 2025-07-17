import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetDistributors(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetDistributors(req: NextApiRequest, res: NextApiResponse) {
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
      return res.status(403).json({ error: 'Access denied. Only brands can access distributors.' });
    }

    // Fetch authorized distributors through the junction table
    const authorizedDistributors = await prisma.brandAuthorizedDistributor.findMany({
      where: {
        brandId: user.id,
        status: 'Active'
      },
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
            distributorProfile: {
              select: {
                companyName: true,
                contactPerson: true,
                gstNumber: true,
                panNumber: true,
                website: true,
                address: {
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
        distributor: {
          name: 'asc'
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Filter by search if provided
    let filteredDistributors = authorizedDistributors;
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      filteredDistributors = authorizedDistributors.filter(ad => {
        const dist = ad.distributor;
        return (
          dist.name.toLowerCase().includes(searchTerm) ||
          dist.email.toLowerCase().includes(searchTerm) ||
          (dist.phone && dist.phone.includes(searchTerm)) ||
          (dist.distributorProfile?.companyName?.toLowerCase().includes(searchTerm)) ||
          (dist.distributorProfile?.contactPerson?.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Get total count for pagination
    const totalCount = await prisma.brandAuthorizedDistributor.count({
      where: {
        brandId: user.id,
        status: 'Active'
      }
    });

    // Format response
    const formattedDistributors = filteredDistributors.map(ad => {
      const dist = ad.distributor;
      const profile = dist.distributorProfile;
      const address = profile?.address;
      
      return {
        id: dist.id,
        name: dist.name,
        email: dist.email,
        phone: dist.phone || '',
        type: 'DISTRIBUTOR' as const,
        companyName: profile?.companyName || dist.name,
        contactPerson: profile?.contactPerson || '',
        gstNumber: profile?.gstNumber || '',
        panNumber: profile?.panNumber || '',
        website: profile?.website || '',
        address: {
          street: address?.street || '',
          area: address?.area || '',
          city: address?.city || '',
          state: address?.state || '',
          pincode: address?.pincode || '',
          country: address?.country || 'India'
        },
        status: 'ACTIVE' as const,
        createdAt: dist.createdAt,
        updatedAt: dist.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      distributors: formattedDistributors,
      recipients: formattedDistributors, // Alias for unified component
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + formattedDistributors.length < totalCount
      },
      meta: {
        searchTerm: search || null,
        resultCount: formattedDistributors.length
      }
    });

  } catch (error) {
    console.error('Error fetching authorized distributors:', error);
    return res.status(500).json({
      error: 'Failed to fetch authorized distributors',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}