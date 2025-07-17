import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') {
    try {
      // Get addresses based on user role
      let addresses = [];
      
      switch (user.role) {
        case 'BRAND':
          const brandProfile = await prisma.brandProfile.findUnique({
            where: { userId: user.id },
            include: { addresses: true },
          });
          addresses = brandProfile?.addresses || [];
          break;
          
        case 'DISTRIBUTOR':
          const distributorProfile = await prisma.distributorProfile.findUnique({
            where: { userId: user.id },
            include: { address: true },
          });
          addresses = distributorProfile?.address ? [distributorProfile.address] : [];
          break;
          
        case 'SERVICE_CENTER':
          const serviceCenterProfile = await prisma.serviceCenterProfile.findUnique({
            where: { userId: user.id },
            include: { addresses: true },
          });
          addresses = serviceCenterProfile?.addresses || [];
          break;
          
        case 'CUSTOMER':
          const customerProfile = await prisma.customerProfile.findUnique({
            where: { userId: user.id },
            include: { addresses: true },
          });
          addresses = customerProfile?.addresses || [];
          break;
          
        default:
          addresses = [];
      }

      res.status(200).json({ 
        success: true, 
        addresses 
      });
    } catch (error) {
      console.error('Get addresses error:', error);
      res.status(500).json({ error: 'Failed to get addresses' });
    }
  } else if (req.method === 'POST') {
    try {
      const { street, area, city, state, pincode, country, isDefault } = req.body;
      
      // Validate input
      if (!street || !city || !state || !pincode) {
        return res.status(400).json({ error: 'Street, city, state, and pincode are required' });
      }

      // Ensure user has a profile
      let profileId = null;
      
      switch (user.role) {
        case 'BRAND':
          let brandProfile = await prisma.brandProfile.findUnique({
            where: { userId: user.id },
          });
          
          if (!brandProfile) {
            brandProfile = await prisma.brandProfile.create({
              data: {
                userId: user.id,
                companyName: user.name,
              },
            });
          }
          profileId = brandProfile.id;
          break;
          
        case 'DISTRIBUTOR':
          let distributorProfile = await prisma.distributorProfile.findUnique({
            where: { userId: user.id },
          });
          
          if (!distributorProfile) {
            distributorProfile = await prisma.distributorProfile.create({
              data: {
                userId: user.id,
                companyName: user.name,
              },
            });
          }
          profileId = distributorProfile.id;
          break;
          
        case 'SERVICE_CENTER':
          let serviceCenterProfile = await prisma.serviceCenterProfile.findUnique({
            where: { userId: user.id },
          });
          
          if (!serviceCenterProfile) {
            serviceCenterProfile = await prisma.serviceCenterProfile.create({
              data: {
                userId: user.id,
                centerName: user.name,
              },
            });
          }
          profileId = serviceCenterProfile.id;
          break;
          
        case 'CUSTOMER':
          let customerProfile = await prisma.customerProfile.findUnique({
            where: { userId: user.id },
          });
          
          if (!customerProfile) {
            const nameParts = user.name.split(' ');
            customerProfile = await prisma.customerProfile.create({
              data: {
                userId: user.id,
                firstName: nameParts[0] || user.name,
                lastName: nameParts.slice(1).join(' ') || '',
              },
            });
          }
          profileId = customerProfile.id;
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid user role' });
      }

      // If this is set as default, unset other default addresses
      if (isDefault) {
        const profileField = user.role === 'BRAND' ? 'brandProfileId' :
                           user.role === 'DISTRIBUTOR' ? 'distributorProfileId' :
                           user.role === 'SERVICE_CENTER' ? 'serviceCenterProfileId' :
                           'customerProfileId';
        
        await prisma.address.updateMany({
          where: { [profileField]: profileId },
          data: { isDefault: false },
        });
      }

      // Create address
      const addressData: any = {
        street: street.trim(),
        area: area?.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country || 'India',
        isDefault: isDefault || false,
      };

      // Set the appropriate profile relation
      switch (user.role) {
        case 'BRAND':
          addressData.brandProfileId = profileId;
          break;
        case 'DISTRIBUTOR':
          addressData.distributorProfileId = profileId;
          break;
        case 'SERVICE_CENTER':
          addressData.serviceCenterProfileId = profileId;
          break;
        case 'CUSTOMER':
          addressData.customerProfileId = profileId;
          break;
      }

      const address = await prisma.address.create({
        data: addressData,
      });

      res.status(201).json({ 
        success: true, 
        address,
        message: 'Address added successfully'
      });
    } catch (error) {
      console.error('Create address error:', error);
      res.status(500).json({ error: 'Failed to create address' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});