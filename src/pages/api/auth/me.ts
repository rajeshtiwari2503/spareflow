import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get complete user information from database
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    });

    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user addresses based on their profile type
    let addresses: any[] = [];
    
    let userDetails: any = {
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      phone: fullUser.phone,
      role: fullUser.role,
      addresses: addresses
    };

    // Add role-specific details
    if (user.role === 'SERVICE_CENTER') {
      const serviceCenterProfile = await prisma.serviceCenterProfile.findFirst({
        where: { userId: user.id }
      });

      if (serviceCenterProfile) {
        // Get addresses separately for service center
        addresses = await prisma.address.findMany({
          where: { serviceCenterProfileId: serviceCenterProfile.id }
        });
        
        userDetails.serviceCenterProfile = {
          id: serviceCenterProfile.id,
          centerName: serviceCenterProfile.centerName,
          gstNumber: serviceCenterProfile.gstNumber,
          contactPerson: serviceCenterProfile.contactPerson,
          serviceTypes: serviceCenterProfile.serviceTypes,
          isVerified: serviceCenterProfile.isVerified,
          addresses: addresses
        };
      } else {
        // If no service center profile exists, create a basic one
        userDetails.serviceCenterProfile = {
          id: '',
          centerName: '',
          gstNumber: '',
          contactPerson: '',
          serviceTypes: [],
          isVerified: false,
          addresses: []
        };
      }
    } else if (user.role === 'BRAND') {
      const brandProfile = await prisma.brandProfile.findFirst({
        where: { userId: user.id }
      });

      if (brandProfile) {
        // Get addresses separately for brand
        addresses = await prisma.address.findMany({
          where: { brandProfileId: brandProfile.id }
        });
        
        userDetails.brandProfile = {
          id: brandProfile.id,
          companyName: brandProfile.companyName,
          gstNumber: brandProfile.gstNumber,
          contactPerson: brandProfile.contactPerson,
          isVerified: brandProfile.isVerified,
          addresses: addresses
        };
      }
    } else if (user.role === 'DISTRIBUTOR') {
      const distributorProfile = await prisma.distributorProfile.findFirst({
        where: { userId: user.id },
        include: {
          address: true
        }
      });

      if (distributorProfile) {
        // Distributor has single address, not addresses array
        addresses = distributorProfile.address ? [distributorProfile.address] : [];
        userDetails.distributorProfile = {
          id: distributorProfile.id,
          companyName: distributorProfile.companyName,
          gstNumber: distributorProfile.gstNumber,
          contactPerson: distributorProfile.contactPerson,
          isVerified: distributorProfile.isVerified,
          addresses: addresses
        };
      }
    } else if (user.role === 'CUSTOMER') {
      const customerProfile = await prisma.customerProfile.findFirst({
        where: { userId: user.id }
      });

      if (customerProfile) {
        // Get addresses separately for customer
        addresses = await prisma.address.findMany({
          where: { customerProfileId: customerProfile.id }
        });
        
        userDetails.customerProfile = {
          id: customerProfile.id,
          firstName: customerProfile.firstName,
          lastName: customerProfile.lastName,
          dateOfBirth: customerProfile.dateOfBirth,
          gender: customerProfile.gender,
          addresses: addresses
        };
      }
    }

    // Update the main addresses array
    userDetails.addresses = addresses;

    return res.status(200).json({
      success: true,
      user: userDetails
    });

  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}