import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query, roleType } = req.query;

    if (!query || !roleType) {
      return res.status(400).json({ error: 'Query and roleType are required' });
    }

    if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(roleType as string)) {
      return res.status(400).json({ error: 'Invalid role type' });
    }

    const searchQuery = query as string;
    const searchRoleType = roleType as 'SERVICE_CENTER' | 'DISTRIBUTOR';

    // Convert to Prisma enum format
    const prismaRole = searchRoleType === 'SERVICE_CENTER' ? 'SERVICE_CENTER' : 'DISTRIBUTOR';

    // Get already authorized users to exclude them from search results
    const authorizedUserIds = new Set<string>();
    
    if (searchRoleType === 'SERVICE_CENTER') {
      const authorizedServiceCenters = await prisma.brandAuthorizedServiceCenter.findMany({
        where: { brandId: user.id },
        select: { serviceCenterUserId: true }
      });
      authorizedServiceCenters.forEach(sc => authorizedUserIds.add(sc.serviceCenterUserId));
    } else {
      const authorizedDistributors = await prisma.brandAuthorizedDistributor.findMany({
        where: { brandId: user.id },
        select: { distributorUserId: true }
      });
      authorizedDistributors.forEach(d => authorizedUserIds.add(d.distributorUserId));
    }

    // Search for users
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { role: prismaRole },
          { id: { notIn: Array.from(authorizedUserIds) } }, // Exclude already authorized users
          {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { phone: { contains: searchQuery, mode: 'insensitive' } },
              // Search in service center profiles
              ...(searchRoleType === 'SERVICE_CENTER' ? [{
                serviceCenterProfile: {
                  OR: [
                    { centerName: { contains: searchQuery, mode: 'insensitive' } },
                    { contactPerson: { contains: searchQuery, mode: 'insensitive' } }
                  ]
                }
              }] : []),
              // Search in distributor profiles
              ...(searchRoleType === 'DISTRIBUTOR' ? [{
                distributorProfile: {
                  OR: [
                    { companyName: { contains: searchQuery, mode: 'insensitive' } },
                    { contactPerson: { contains: searchQuery, mode: 'insensitive' } }
                  ]
                }
              }] : [])
            ]
          }
        ]
      },
      include: {
        serviceCenterProfile: searchRoleType === 'SERVICE_CENTER' ? {
          include: { addresses: true }
        } : false,
        distributorProfile: searchRoleType === 'DISTRIBUTOR' ? {
          include: { address: true }
        } : false
      },
      take: 20, // Limit results
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ]
    });

    // Format the response
    const formattedUsers = users.map(user => {
      let companyName = '';
      let city = '';
      let state = '';
      let pincode = '';

      // Get company name and address from appropriate profile
      if (searchRoleType === 'SERVICE_CENTER' && user.serviceCenterProfile) {
        companyName = user.serviceCenterProfile.centerName || '';
        const address = user.serviceCenterProfile.addresses?.[0];
        if (address) {
          city = address.city;
          state = address.state;
          pincode = address.pincode;
        }
      } else if (searchRoleType === 'DISTRIBUTOR' && user.distributorProfile) {
        companyName = user.distributorProfile.companyName || '';
        // For distributors, the address is directly on the profile, not in a separate addresses array
        if (user.distributorProfile.address) {
          city = user.distributorProfile.address.city || '';
          state = user.distributorProfile.address.state || '';
          pincode = user.distributorProfile.address.pincode || '';
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        companyName,
        city,
        state,
        pincode,
        role: user.role,
        createdAt: user.createdAt.toISOString()
      };
    });

    res.status(200).json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length,
      query: searchQuery,
      roleType: searchRoleType
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}