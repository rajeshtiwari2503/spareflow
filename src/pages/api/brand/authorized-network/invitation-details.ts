import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, id } = req.query;

    if (!token || !id) {
      return res.status(400).json({ error: 'Token and ID are required' });
    }

    // Find the invitation
    const invitation = await prisma.brandPartnerInvitation.findUnique({
      where: { id: id as string },
      include: { brand: true }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Verify token
    if (invitation.invitationToken !== token) {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    // Return invitation details (without sensitive information)
    res.status(200).json({
      success: true,
      invitation: {
        id: invitation.id,
        brandName: invitation.brand.name,
        partnerType: invitation.partnerType,
        message: invitation.message,
        expiresAt: invitation.expiresAt.toISOString(),
        status: invitation.status,
        createdAt: invitation.createdAt.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error fetching invitation details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}