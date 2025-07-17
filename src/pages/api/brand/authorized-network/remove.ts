import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { partnerId, partnerType } = req.body;

    if (!partnerId || !partnerType) {
      return res.status(400).json({ message: 'Partner ID and partner type are required' });
    }

    if (partnerType !== 'service_center' && partnerType !== 'distributor') {
      return res.status(400).json({ message: 'Invalid partner type' });
    }

    // Set status to Inactive instead of deleting the record
    if (partnerType === 'service_center') {
      const existingPartner = await prisma.brandAuthorizedServiceCenter.findFirst({
        where: {
          id: partnerId,
          brandId: user.id,
        },
      });

      if (!existingPartner) {
        return res.status(404).json({ message: 'Service center not found in your authorized network' });
      }

      await prisma.brandAuthorizedServiceCenter.update({
        where: {
          id: partnerId,
        },
        data: {
          status: 'Inactive',
        },
      });
    } else {
      const existingPartner = await prisma.brandAuthorizedDistributor.findFirst({
        where: {
          id: partnerId,
          brandId: user.id,
        },
      });

      if (!existingPartner) {
        return res.status(404).json({ message: 'Distributor not found in your authorized network' });
      }

      await prisma.brandAuthorizedDistributor.update({
        where: {
          id: partnerId,
        },
        data: {
          status: 'Inactive',
        },
      });
    }

    res.status(200).json({
      message: 'Partner access removed successfully (status set to inactive)',
    });
  } catch (error) {
    console.error('Error removing partner access:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}