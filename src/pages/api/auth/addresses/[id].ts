import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default withAuth(async (req, res, user) => {
  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid address ID' });
  }

  if (req.method === 'PUT') {
    try {
      const { street, area, city, state, pincode, country, isDefault } = req.body;
      
      // Validate input
      if (!street || !city || !state || !pincode) {
        return res.status(400).json({ error: 'Street, city, state, and pincode are required' });
      }

      // Check if address belongs to user
      const existingAddress = await prisma.address.findUnique({
        where: { id },
        include: {
          brandProfile: true,
          distributorProfile: true,
          serviceCenterProfile: true,
          customerProfile: true,
        },
      });

      if (!existingAddress) {
        return res.status(404).json({ error: 'Address not found' });
      }

      // Verify ownership
      let isOwner = false;
      switch (user.role) {
        case 'BRAND':
          isOwner = existingAddress.brandProfile?.userId === user.id;
          break;
        case 'DISTRIBUTOR':
          isOwner = existingAddress.distributorProfile?.userId === user.id;
          break;
        case 'SERVICE_CENTER':
          isOwner = existingAddress.serviceCenterProfile?.userId === user.id;
          break;
        case 'CUSTOMER':
          isOwner = existingAddress.customerProfile?.userId === user.id;
          break;
      }

      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // If this is set as default, unset other default addresses
      if (isDefault && !existingAddress.isDefault) {
        const profileField = user.role === 'BRAND' ? 'brandProfileId' :
                           user.role === 'DISTRIBUTOR' ? 'distributorProfileId' :
                           user.role === 'SERVICE_CENTER' ? 'serviceCenterProfileId' :
                           'customerProfileId';
        
        const profileId = existingAddress.brandProfileId || 
                         existingAddress.distributorProfileId || 
                         existingAddress.serviceCenterProfileId || 
                         existingAddress.customerProfileId;
        
        await prisma.address.updateMany({
          where: { 
            [profileField]: profileId,
            id: { not: id }
          },
          data: { isDefault: false },
        });
      }

      // Update address
      const updatedAddress = await prisma.address.update({
        where: { id },
        data: {
          street: street.trim(),
          area: area?.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country || 'India',
          isDefault: isDefault || false,
        },
      });

      res.status(200).json({ 
        success: true, 
        address: updatedAddress,
        message: 'Address updated successfully'
      });
    } catch (error) {
      console.error('Update address error:', error);
      res.status(500).json({ error: 'Failed to update address' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if address belongs to user
      const existingAddress = await prisma.address.findUnique({
        where: { id },
        include: {
          brandProfile: true,
          distributorProfile: true,
          serviceCenterProfile: true,
          customerProfile: true,
        },
      });

      if (!existingAddress) {
        return res.status(404).json({ error: 'Address not found' });
      }

      // Verify ownership
      let isOwner = false;
      switch (user.role) {
        case 'BRAND':
          isOwner = existingAddress.brandProfile?.userId === user.id;
          break;
        case 'DISTRIBUTOR':
          isOwner = existingAddress.distributorProfile?.userId === user.id;
          break;
        case 'SERVICE_CENTER':
          isOwner = existingAddress.serviceCenterProfile?.userId === user.id;
          break;
        case 'CUSTOMER':
          isOwner = existingAddress.customerProfile?.userId === user.id;
          break;
      }

      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Don't allow deletion of default address if it's the only one
      if (existingAddress.isDefault) {
        const profileField = user.role === 'BRAND' ? 'brandProfileId' :
                           user.role === 'DISTRIBUTOR' ? 'distributorProfileId' :
                           user.role === 'SERVICE_CENTER' ? 'serviceCenterProfileId' :
                           'customerProfileId';
        
        const profileId = existingAddress.brandProfileId || 
                         existingAddress.distributorProfileId || 
                         existingAddress.serviceCenterProfileId || 
                         existingAddress.customerProfileId;
        
        const addressCount = await prisma.address.count({
          where: { [profileField]: profileId },
        });

        if (addressCount === 1) {
          return res.status(400).json({ error: 'Cannot delete the only address. Add another address first.' });
        }

        // If deleting default address, make another one default
        const otherAddress = await prisma.address.findFirst({
          where: { 
            [profileField]: profileId,
            id: { not: id }
          },
        });

        if (otherAddress) {
          await prisma.address.update({
            where: { id: otherAddress.id },
            data: { isDefault: true },
          });
        }
      }

      // Delete address
      await prisma.address.delete({
        where: { id },
      });

      res.status(200).json({ 
        success: true, 
        message: 'Address deleted successfully'
      });
    } catch (error) {
      console.error('Delete address error:', error);
      res.status(500).json({ error: 'Failed to delete address' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});