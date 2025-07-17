import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

interface Address {
  id?: string;
  street: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  addresses: Address[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user from token using the enhanced verifyToken function
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userId = user.id;

    if (req.method === 'GET') {
      // Get user profile
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true
        }
      });

      if (!userData) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Get addresses based on user role and profile
      let addresses: Address[] = [];
      
      if (userData.role === 'SERVICE_CENTER') {
        const profile = await prisma.serviceCenterProfile.findFirst({
          where: { userId: userData.id }
        });
        if (profile) {
          const profileAddresses = await prisma.address.findMany({
            where: { serviceCenterProfileId: profile.id }
          });
          addresses = profileAddresses.map(addr => ({
            id: addr.id,
            street: addr.street,
            area: addr.area || undefined,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            country: addr.country,
            isDefault: addr.isDefault
          }));
        }
      } else if (userData.role === 'BRAND') {
        const profile = await prisma.brandProfile.findFirst({
          where: { userId: userData.id }
        });
        if (profile) {
          const profileAddresses = await prisma.address.findMany({
            where: { brandProfileId: profile.id }
          });
          addresses = profileAddresses.map(addr => ({
            id: addr.id,
            street: addr.street,
            area: addr.area || undefined,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            country: addr.country,
            isDefault: addr.isDefault
          }));
        }
      } else if (userData.role === 'CUSTOMER') {
        const profile = await prisma.customerProfile.findFirst({
          where: { userId: userData.id }
        });
        if (profile) {
          const profileAddresses = await prisma.address.findMany({
            where: { customerProfileId: profile.id }
          });
          addresses = profileAddresses.map(addr => ({
            id: addr.id,
            street: addr.street,
            area: addr.area || undefined,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            country: addr.country,
            isDefault: addr.isDefault
          }));
        }
      } else if (userData.role === 'DISTRIBUTOR') {
        const profile = await prisma.distributorProfile.findFirst({
          where: { userId: userData.id },
          include: { address: true }
        });
        if (profile && profile.address) {
          addresses = [{
            id: profile.address.id,
            street: profile.address.street,
            area: profile.address.area || undefined,
            city: profile.address.city,
            state: profile.address.state,
            pincode: profile.address.pincode,
            country: profile.address.country,
            isDefault: profile.address.isDefault
          }];
        }
      }

      const profile: UserProfile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || undefined,
        role: userData.role,
        addresses: addresses
      };

      return res.status(200).json({ success: true, profile });

    } else if (req.method === 'PUT') {
      // Update user profile
      const { name, email, phone, addresses } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name and email are required' 
        });
      }

      // Start a transaction to update user and related data
      const result = await prisma.$transaction(async (tx) => {
        // Update user basic info
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            name: name,
            email: email,
            phone: phone || null
          }
        });

        // Handle addresses based on user role
        if (addresses && Array.isArray(addresses)) {
          if (updatedUser.role === 'SERVICE_CENTER') {
            const profile = await tx.serviceCenterProfile.findFirst({
              where: { userId: updatedUser.id }
            });
            if (profile) {
              // Delete existing addresses
              await tx.address.deleteMany({
                where: { serviceCenterProfileId: profile.id }
              });
              // Create new addresses
              for (const address of addresses) {
                await tx.address.create({
                  data: {
                    serviceCenterProfileId: profile.id,
                    street: address.street,
                    area: address.area || null,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    country: address.country || 'India',
                    isDefault: address.isDefault || false
                  }
                });
              }
            }
          } else if (updatedUser.role === 'BRAND') {
            const profile = await tx.brandProfile.findFirst({
              where: { userId: updatedUser.id }
            });
            if (profile) {
              // Delete existing addresses
              await tx.address.deleteMany({
                where: { brandProfileId: profile.id }
              });
              // Create new addresses
              for (const address of addresses) {
                await tx.address.create({
                  data: {
                    brandProfileId: profile.id,
                    street: address.street,
                    area: address.area || null,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    country: address.country || 'India',
                    isDefault: address.isDefault || false
                  }
                });
              }
            }
          } else if (updatedUser.role === 'CUSTOMER') {
            const profile = await tx.customerProfile.findFirst({
              where: { userId: updatedUser.id }
            });
            if (profile) {
              // Delete existing addresses
              await tx.address.deleteMany({
                where: { customerProfileId: profile.id }
              });
              // Create new addresses
              for (const address of addresses) {
                await tx.address.create({
                  data: {
                    customerProfileId: profile.id,
                    street: address.street,
                    area: address.area || null,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    country: address.country || 'India',
                    isDefault: address.isDefault || false
                  }
                });
              }
            }
          } else if (updatedUser.role === 'DISTRIBUTOR') {
            const profile = await tx.distributorProfile.findFirst({
              where: { userId: updatedUser.id }
            });
            if (profile && addresses.length > 0) {
              const address = addresses[0]; // Distributor has single address
              // Delete existing address
              await tx.address.deleteMany({
                where: { distributorProfileId: profile.id }
              });
              // Create new address
              await tx.address.create({
                data: {
                  distributorProfileId: profile.id,
                  street: address.street,
                  area: address.area || null,
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

        return updatedUser;
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Profile updated successfully',
        user: result
      });

    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}