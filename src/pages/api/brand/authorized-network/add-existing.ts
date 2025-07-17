import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userEmailOrId, roleType } = req.body;

    if (!userEmailOrId || !roleType) {
      return res.status(400).json({ error: 'User email/ID and role type are required' });
    }

    if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(roleType)) {
      return res.status(400).json({ error: 'Invalid role type' });
    }

    // Find the user by email or ID
    let targetUser;
    
    // Check if it's an email (contains @) or ID
    if (userEmailOrId.includes('@')) {
      targetUser = await prisma.user.findUnique({
        where: { email: userEmailOrId },
      });
    } else {
      // Try to find by ID
      targetUser = await prisma.user.findUnique({
        where: { id: userEmailOrId },
      });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the user has the correct role
    const expectedRole = roleType === 'SERVICE_CENTER' ? 'SERVICE_CENTER' : 'DISTRIBUTOR';
    if (targetUser.role !== expectedRole) {
      return res.status(400).json({ 
        error: `User must have ${expectedRole} role. Found: ${targetUser.role}` 
      });
    }

    // Check for existing authorization to prevent duplicates
    if (roleType === 'SERVICE_CENTER') {
      const existing = await prisma.brandAuthorizedServiceCenter.findUnique({
        where: {
          brandId_serviceCenterUserId: {
            brandId: user.id,
            serviceCenterUserId: targetUser.id,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'Service center is already authorized' });
      }

      // Create the authorization
      await prisma.brandAuthorizedServiceCenter.create({
        data: {
          brandId: user.id,
          serviceCenterUserId: targetUser.id,
          status: 'Active',
        },
      });
    } else {
      const existing = await prisma.brandAuthorizedDistributor.findUnique({
        where: {
          brandId_distributorUserId: {
            brandId: user.id,
            distributorUserId: targetUser.id,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'Distributor is already authorized' });
      }

      // Create the authorization
      await prisma.brandAuthorizedDistributor.create({
        data: {
          brandId: user.id,
          distributorUserId: targetUser.id,
          status: 'Active',
        },
      });
    }

    res.status(200).json({ 
      success: true, 
      message: `${roleType === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'} successfully added to authorized list`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      }
    });

  } catch (error) {
    console.error('Error adding existing user to authorized list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}