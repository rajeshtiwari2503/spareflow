import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'SERVICE_CENTER') {
      return res.status(403).json({ error: 'Access denied. Service center role required.' });
    }

    if (req.method === 'GET') {
      // Get service center profile
      const profile = await prisma.serviceCenterProfile.findFirst({
        where: { userId: user.id }
      });

      // Get addresses separately
      let addresses = [];
      if (profile) {
        addresses = await prisma.address.findMany({
          where: { serviceCenterProfileId: profile.id }
        });
      }

      return res.status(200).json({
        success: true,
        profile: profile ? { ...profile, addresses } : null
      });

    } else if (req.method === 'PUT') {
      // Update service center profile
      const { centerName, gstNumber, contactPerson, serviceTypes, addresses } = req.body;

      console.log('Received profile update request:', {
        centerName,
        gstNumber,
        contactPerson,
        serviceTypes,
        addressesCount: addresses?.length || 0
      });

      // Use transaction to update profile and addresses atomically
      const result = await prisma.$transaction(async (tx) => {
        // Check if profile exists
        const existingProfile = await tx.serviceCenterProfile.findFirst({
          where: { userId: user.id }
        });

        let profile;
        if (existingProfile) {
          // Update existing profile
          profile = await tx.serviceCenterProfile.update({
            where: { id: existingProfile.id },
            data: {
              centerName: centerName || existingProfile.centerName,
              gstNumber: gstNumber || existingProfile.gstNumber,
              contactPerson: contactPerson || existingProfile.contactPerson,
              serviceTypes: JSON.stringify(serviceTypes || existingProfile.serviceTypes || [])
            }
          });
        } else {
          // Create new profile
          profile = await tx.serviceCenterProfile.create({
            data: {
              userId: user.id,
              centerName: centerName || user.name,
              gstNumber,
              contactPerson,
              serviceTypes: JSON.stringify(serviceTypes || []),
              isVerified: false
            }
          });
        }

        // Handle addresses if provided
        if (addresses && Array.isArray(addresses)) {
          // Delete existing addresses for this profile
          await tx.address.deleteMany({
            where: { serviceCenterProfileId: profile.id }
          });

          // Create new addresses
          if (addresses.length > 0) {
            for (const address of addresses) {
              if (address.label && address.addressLine1 && address.city && address.state && address.pincode) {
                await tx.address.create({
                  data: {
                    serviceCenterProfileId: profile.id,
                    street: address.addressLine1,
                    area: address.addressLine2 || null,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    country: address.country || 'India',
                    isDefault: address.isDefault || false
                  }
                });
              }
            }
          }
        }

        // Return profile with addresses
        const updatedProfile = await tx.serviceCenterProfile.findUnique({
          where: { id: profile.id }
        });

        // Get addresses separately
        const profileAddresses = await tx.address.findMany({
          where: { serviceCenterProfileId: profile.id }
        });

        return { ...updatedProfile, addresses: profileAddresses };
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        profile: result
      });

    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Service center profile API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}