import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, partnerType, message } = req.body;

    if (!email || !partnerType) {
      return res.status(400).json({ error: 'Email and partner type are required' });
    }

    if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(partnerType)) {
      return res.status(400).json({ error: 'Invalid partner type' });
    }

    // Check if invitation already exists and is pending
    const existingInvitation = await prisma.brandPartnerInvitation.findFirst({
      where: {
        brandId: user.id,
        inviteeEmail: email,
        partnerType,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return res.status(409).json({ 
        error: 'An invitation is already pending for this email and partner type' 
      });
    }

    // Check if user already exists and is already authorized
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if already authorized
      if (partnerType === 'SERVICE_CENTER') {
        const existing = await prisma.brandAuthorizedServiceCenter.findFirst({
          where: {
            brandId: user.id,
            serviceCenterUserId: existingUser.id,
          },
        });
        if (existing) {
          return res.status(409).json({ 
            error: 'This service center is already in your authorized network' 
          });
        }
      } else {
        const existing = await prisma.brandAuthorizedDistributor.findFirst({
          where: {
            brandId: user.id,
            distributorUserId: existingUser.id,
          },
        });
        if (existing) {
          return res.status(409).json({ 
            error: 'This distributor is already in your authorized network' 
          });
        }
      }
    }

    // Create invitation record
    const invitation = await prisma.brandPartnerInvitation.create({
      data: {
        brandId: user.id,
        inviteeEmail: email,
        partnerType,
        message: message || `You have been invited to join ${user.name || user.companyName || 'our brand'}'s authorized partner network as a ${partnerType.toLowerCase().replace('_', ' ')}.`,
        status: 'PENDING',
        invitationToken: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });

    // TODO: Send actual email invitation
    // For now, we'll simulate sending the invitation
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    
    try {
      await sendInvitationEmail({
        to: email,
        brandName: user.name || user.companyName || 'Brand',
        partnerType,
        message: invitation.message,
        invitationToken: invitation.invitationToken,
        invitationId: invitation.id,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the API call if email fails, but log it
    }

    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.inviteeEmail,
        partnerType: invitation.partnerType,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateInvitationToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
}

async function sendInvitationEmail({
  to,
  brandName,
  partnerType,
  message,
  invitationToken,
  invitationId,
}: {
  to: string;
  brandName: string;
  partnerType: string;
  message: string;
  invitationToken: string;
  invitationId: string;
}) {
  // TODO: Implement actual email sending
  // This is a placeholder for the email service integration
  
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitation/accept?token=${invitationToken}&id=${invitationId}`;
  
  const emailContent = `
    <h2>Partner Network Invitation</h2>
    <p>Hello,</p>
    <p>You have been invited by <strong>${brandName}</strong> to join their authorized partner network as a <strong>${partnerType.toLowerCase().replace('_', ' ')}</strong>.</p>
    <p><strong>Message from ${brandName}:</strong></p>
    <p>${message}</p>
    <p>To accept this invitation, please click the link below:</p>
    <a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
    <p>This invitation will expire in 7 days.</p>
    <p>If you don't have an account with SpareFlow, you'll be prompted to create one.</p>
    <p>Best regards,<br>SpareFlow Team</p>
  `;

  // Log the invitation for now (in production, send actual email)
  console.log('=== INVITATION EMAIL ===');
  console.log('To:', to);
  console.log('Subject: Partner Network Invitation from', brandName);
  console.log('Content:', emailContent);
  console.log('Invitation URL:', invitationUrl);
  console.log('========================');

  // In production, replace this with actual email service
  // Example with SendGrid:
  // await sgMail.send({
  //   to,
  //   from: process.env.FROM_EMAIL,
  //   subject: `Partner Network Invitation from ${brandName}`,
  //   html: emailContent,
  // });
}