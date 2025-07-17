import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, invitationId } = req.body;

    if (!token || !invitationId) {
      return res.status(400).json({ error: 'Token and invitation ID are required' });
    }

    // Find the invitation
    const invitation = await prisma.brandPartnerInvitation.findUnique({
      where: { id: invitationId },
      include: { brand: true }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation is valid
    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invitation is no longer valid' });
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.brandPartnerInvitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    if (invitation.invitationToken !== token) {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    // Check if user is authenticated
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: `/auth/login?invitation=${invitationId}&token=${token}`
      });
    }

    // Check if user's email matches the invitation
    if (user.email !== invitation.inviteeEmail) {
      return res.status(403).json({ 
        error: 'This invitation is for a different email address' 
      });
    }

    // Check if user has the correct role
    const expectedRole = invitation.partnerType === 'SERVICE_CENTER' ? 'SERVICE_CENTER' : 'DISTRIBUTOR';
    if (user.role !== expectedRole) {
      return res.status(400).json({ 
        error: `You must have a ${expectedRole.toLowerCase().replace('_', ' ')} account to accept this invitation` 
      });
    }

    // Check if already authorized
    if (invitation.partnerType === 'SERVICE_CENTER') {
      const existing = await prisma.brandAuthorizedServiceCenter.findFirst({
        where: {
          brandId: invitation.brandId,
          serviceCenterUserId: user.id,
        },
      });
      if (existing) {
        return res.status(409).json({ 
          error: 'You are already authorized with this brand' 
        });
      }
    } else {
      const existing = await prisma.brandAuthorizedDistributor.findFirst({
        where: {
          brandId: invitation.brandId,
          distributorUserId: user.id,
        },
      });
      if (existing) {
        return res.status(409).json({ 
          error: 'You are already authorized with this brand' 
        });
      }
    }

    // Create the authorization relationship
    if (invitation.partnerType === 'SERVICE_CENTER') {
      await prisma.brandAuthorizedServiceCenter.create({
        data: {
          brandId: invitation.brandId,
          serviceCenterUserId: user.id,
          status: 'Active',
        },
      });
    } else {
      await prisma.brandAuthorizedDistributor.create({
        data: {
          brandId: invitation.brandId,
          distributorUserId: user.id,
          status: 'Active',
        },
      });
    }

    // Mark invitation as accepted
    await prisma.brandPartnerInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: `Successfully joined ${invitation.brand.name}'s authorized network`,
      brandName: invitation.brand.name,
      partnerType: invitation.partnerType,
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}