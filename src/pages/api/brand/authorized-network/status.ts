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

    const { partnerId, partnerType, status } = req.body;

    if (!partnerId || !partnerType || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    if (partnerType === 'service_center') {
      // Update service center status
      const updatedServiceCenter = await prisma.brandAuthorizedServiceCenter.updateMany({
        where: {
          id: partnerId,
          brandId: user.id, // Ensure the brand owns this relationship
        },
        data: {
          status,
        },
      });

      if (updatedServiceCenter.count === 0) {
        return res.status(404).json({ message: 'Service center not found or not authorized' });
      }
    } else if (partnerType === 'distributor') {
      // Update distributor status
      const updatedDistributor = await prisma.brandAuthorizedDistributor.updateMany({
        where: {
          id: partnerId,
          brandId: user.id, // Ensure the brand owns this relationship
        },
        data: {
          status,
        },
      });

      if (updatedDistributor.count === 0) {
        return res.status(404).json({ message: 'Distributor not found or not authorized' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid partner type' });
    }

    res.status(200).json({ message: 'Partner status updated successfully' });
  } catch (error) {
    console.error('Error updating partner status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}