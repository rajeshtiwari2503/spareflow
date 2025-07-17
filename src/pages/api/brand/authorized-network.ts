import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch authorized service centers
    const serviceCenters = await prisma.brandAuthorizedServiceCenter.findMany({
      where: {
        brandId: user.id,
      },
      include: {
        serviceCenter: {
          include: {
            serviceCenterProfile: {
              include: {
                addresses: {
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch authorized distributors
    const distributors = await prisma.brandAuthorizedDistributor.findMany({
      where: {
        brandId: user.id,
      },
      include: {
        distributor: {
          include: {
            distributorProfile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match the expected format
    const formattedServiceCenters = serviceCenters.map(sc => ({
      id: sc.id,
      userId: sc.serviceCenterUserId,
      status: sc.status,
      createdAt: sc.createdAt.toISOString(),
      user: {
        id: sc.serviceCenter.id,
        name: sc.serviceCenter.name,
        email: sc.serviceCenter.email,
        phone: sc.serviceCenter.phone,
        companyName: sc.serviceCenter.serviceCenterProfile?.centerName || '',
        city: sc.serviceCenter.serviceCenterProfile?.addresses?.[0]?.city || '',
        state: sc.serviceCenter.serviceCenterProfile?.addresses?.[0]?.state || '',
        pincode: sc.serviceCenter.serviceCenterProfile?.addresses?.[0]?.pincode || '',
      },
    }));

    const formattedDistributors = distributors.map(d => ({
      id: d.id,
      userId: d.distributorUserId,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      user: {
        id: d.distributor.id,
        name: d.distributor.name,
        email: d.distributor.email,
        phone: d.distributor.phone,
        companyName: d.distributor.distributorProfile?.companyName || '',
        city: d.distributor.distributorProfile?.address?.city || '',
        state: d.distributor.distributorProfile?.address?.state || '',
        pincode: d.distributor.distributorProfile?.address?.pincode || '',
      },
    }));

    res.status(200).json({
      serviceCenters: formattedServiceCenters,
      distributors: formattedDistributors,
    });
  } catch (error) {
    console.error('Error fetching authorized network:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}