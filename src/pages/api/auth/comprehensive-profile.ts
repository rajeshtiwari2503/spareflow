import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

interface Address {
  id?: string;
  type: 'REGISTERED_OFFICE' | 'WAREHOUSE' | 'BILLING' | 'SHIPPING' | 'OTHER';
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  isDefaultFor?: string[];
}

interface BusinessSettings {
  operatingHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  serviceAreas: string[];
  preferredCourierPartners: string[];
  specialInstructions: string;
  termsAndConditions: string;
}

interface CompanyInfo {
  companyName: string;
  registrationNumber: string;
  gstNumber: string;
  panNumber: string;
  industryType: string;
  companySize: string;
}

interface ContactDetails {
  primaryContactPerson: string;
  emailAddress: string;
  phoneNumbers: {
    primary: string;
    secondary?: string;
    whatsapp?: string;
  };
  websiteUrl?: string;
  socialMediaLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  companyInfo?: CompanyInfo;
  contactDetails?: ContactDetails;
  addresses: Address[];
  businessSettings?: BusinessSettings;
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    language: string;
    timezone: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user from token
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userId = user.id;

    if (req.method === 'GET') {
      // Get comprehensive user profile
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

      // Get profile data based on user role
      let profileData: any = {};
      let addresses: Address[] = [];

      if (userData.role === 'SERVICE_CENTER') {
        const profile = await prisma.serviceCenterProfile.findFirst({
          where: { userId: userData.id },
          include: { addresses: true }
        });
        if (profile) {
          profileData = profile;
          addresses = profile.addresses.map(addr => ({
            id: addr.id,
            type: 'OTHER' as const,
            label: addr.street || 'Address',
            addressLine1: addr.street,
            addressLine2: addr.area || undefined,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            country: addr.country,
            isDefault: addr.isDefault,
            isDefaultFor: []
          }));
        }
      } else if (userData.role === 'BRAND') {
        const profile = await prisma.brandProfile.findFirst({
          where: { userId: userData.id },
          include: { addresses: true }
        });
        if (profile) {
          profileData = profile;
          addresses = profile.addresses.map(addr => ({
            id: addr.id,
            type: 'OTHER' as const,
            label: addr.street || 'Address',
            addressLine1: addr.street,
            addressLine2: addr.area || undefined,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            country: addr.country,
            isDefault: addr.isDefault,
            isDefaultFor: []
          }));
        }
      } else if (userData.role === 'CUSTOMER') {
        const profile = await prisma.customerProfile.findFirst({
          where: { userId: userData.id },
          include: { addresses: true }
        });
        if (profile) {
          profileData = profile;
          addresses = profile.addresses.map(addr => ({
            id: addr.id,
            type: 'OTHER' as const,
            label: addr.street || 'Address',
            addressLine1: addr.street,
            addressLine2: addr.area || undefined,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            country: addr.country,
            isDefault: addr.isDefault,
            isDefaultFor: []
          }));
        }
      } else if (userData.role === 'DISTRIBUTOR') {
        const profile = await prisma.distributorProfile.findFirst({
          where: { userId: userData.id },
          include: { address: true }
        });
        if (profile && profile.address) {
          profileData = profile;
          addresses = [{
            id: profile.address.id,
            type: 'OTHER' as const,
            label: profile.address.street || 'Address',
            addressLine1: profile.address.street,
            addressLine2: profile.address.area || undefined,
            city: profile.address.city,
            state: profile.address.state,
            pincode: profile.address.pincode,
            country: profile.address.country,
            isDefault: profile.address.isDefault,
            isDefaultFor: []
          }];
        }
      }

      // Build comprehensive profile
      const comprehensiveProfile: UserProfile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || undefined,
        role: userData.role,
        companyInfo: {
          companyName: profileData.companyName || profileData.centerName || '',
          registrationNumber: '',
          gstNumber: profileData.gstNumber || '',
          panNumber: profileData.panNumber || '',
          industryType: '',
          companySize: ''
        },
        contactDetails: {
          primaryContactPerson: profileData.contactPerson || userData.name,
          emailAddress: userData.email,
          phoneNumbers: {
            primary: userData.phone || ''
          },
          socialMediaLinks: {}
        },
        addresses: addresses,
        businessSettings: {
          operatingHours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '18:00', closed: false },
            sunday: { open: '09:00', close: '18:00', closed: true }
          },
          serviceAreas: [],
          preferredCourierPartners: [],
          specialInstructions: '',
          termsAndConditions: ''
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
          language: 'en',
          timezone: 'Asia/Kolkata'
        }
      };

      return res.status(200).json({ success: true, profile: comprehensiveProfile });

    } else if (req.method === 'PUT') {
      // Update comprehensive user profile
      const profileData: UserProfile = req.body;

      // Validate required fields
      if (!profileData.name || !profileData.email) {
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
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone || null
          }
        });

        // Handle profile updates based on user role
        if (updatedUser.role === 'SERVICE_CENTER') {
          // Update or create service center profile
          const existingProfile = await tx.serviceCenterProfile.findFirst({
            where: { userId: updatedUser.id }
          });

          if (existingProfile) {
            await tx.serviceCenterProfile.update({
              where: { id: existingProfile.id },
              data: {
                centerName: profileData.companyInfo?.companyName || '',
                gstNumber: profileData.companyInfo?.gstNumber || null,
                contactPerson: profileData.contactDetails?.primaryContactPerson || null,
                serviceTypes: JSON.stringify([])
              }
            });

            // Update addresses
            await tx.address.deleteMany({
              where: { serviceCenterProfileId: existingProfile.id }
            });

            for (const address of profileData.addresses) {
              await tx.address.create({
                data: {
                  serviceCenterProfileId: existingProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
                }
              });
            }
          } else {
            // Create new profile
            const newProfile = await tx.serviceCenterProfile.create({
              data: {
                userId: updatedUser.id,
                centerName: profileData.companyInfo?.companyName || '',
                gstNumber: profileData.companyInfo?.gstNumber || null,
                contactPerson: profileData.contactDetails?.primaryContactPerson || null,
                serviceTypes: JSON.stringify([])
              }
            });

            for (const address of profileData.addresses) {
              await tx.address.create({
                data: {
                  serviceCenterProfileId: newProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
                }
              });
            }
          }
        } else if (updatedUser.role === 'BRAND') {
          // Update or create brand profile
          const existingProfile = await tx.brandProfile.findFirst({
            where: { userId: updatedUser.id }
          });

          if (existingProfile) {
            await tx.brandProfile.update({
              where: { id: existingProfile.id },
              data: {
                companyName: profileData.companyInfo?.companyName || '',
                gstNumber: profileData.companyInfo?.gstNumber || null,
                panNumber: profileData.companyInfo?.panNumber || null,
                contactPerson: profileData.contactDetails?.primaryContactPerson || null,
                website: profileData.contactDetails?.websiteUrl || null
              }
            });

            // Update addresses
            await tx.address.deleteMany({
              where: { brandProfileId: existingProfile.id }
            });

            for (const address of profileData.addresses) {
              await tx.address.create({
                data: {
                  brandProfileId: existingProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
                }
              });
            }
          } else {
            // Create new profile
            const newProfile = await tx.brandProfile.create({
              data: {
                userId: updatedUser.id,
                companyName: profileData.companyInfo?.companyName || '',
                gstNumber: profileData.companyInfo?.gstNumber || null,
                panNumber: profileData.companyInfo?.panNumber || null,
                contactPerson: profileData.contactDetails?.primaryContactPerson || null,
                website: profileData.contactDetails?.websiteUrl || null
              }
            });

            for (const address of profileData.addresses) {
              await tx.address.create({
                data: {
                  brandProfileId: newProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
                }
              });
            }
          }
        } else if (updatedUser.role === 'CUSTOMER') {
          // Update or create customer profile
          const existingProfile = await tx.customerProfile.findFirst({
            where: { userId: updatedUser.id }
          });

          if (existingProfile) {
            await tx.customerProfile.update({
              where: { id: existingProfile.id },
              data: {
                firstName: profileData.name.split(' ')[0] || '',
                lastName: profileData.name.split(' ').slice(1).join(' ') || ''
              }
            });

            // Update addresses
            await tx.address.deleteMany({
              where: { customerProfileId: existingProfile.id }
            });

            for (const address of profileData.addresses) {
              await tx.address.create({
                data: {
                  customerProfileId: existingProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
                }
              });
            }
          } else {
            // Create new profile
            const newProfile = await tx.customerProfile.create({
              data: {
                userId: updatedUser.id,
                firstName: profileData.name.split(' ')[0] || '',
                lastName: profileData.name.split(' ').slice(1).join(' ') || ''
              }
            });

            for (const address of profileData.addresses) {
              await tx.address.create({
                data: {
                  customerProfileId: newProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
                }
              });
            }
          }
        } else if (updatedUser.role === 'DISTRIBUTOR') {
          // Update or create distributor profile
          const existingProfile = await tx.distributorProfile.findFirst({
            where: { userId: updatedUser.id }
          });

          if (existingProfile) {
            await tx.distributorProfile.update({
              where: { id: existingProfile.id },
              data: {
                companyName: profileData.companyInfo?.companyName || '',
                gstNumber: profileData.companyInfo?.gstNumber || null,
                panNumber: profileData.companyInfo?.panNumber || null,
                contactPerson: profileData.contactDetails?.primaryContactPerson || null,
                website: profileData.contactDetails?.websiteUrl || null
              }
            });

            // Update address (distributor has single address)
            if (profileData.addresses.length > 0) {
              const address = profileData.addresses[0];
              await tx.address.deleteMany({
                where: { distributorProfileId: existingProfile.id }
              });

              await tx.address.create({
                data: {
                  distributorProfileId: existingProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
                }
              });
            }
          } else {
            // Create new profile
            const newProfile = await tx.distributorProfile.create({
              data: {
                userId: updatedUser.id,
                companyName: profileData.companyInfo?.companyName || '',
                gstNumber: profileData.companyInfo?.gstNumber || null,
                panNumber: profileData.companyInfo?.panNumber || null,
                contactPerson: profileData.contactDetails?.primaryContactPerson || null,
                website: profileData.contactDetails?.websiteUrl || null
              }
            });

            if (profileData.addresses.length > 0) {
              const address = profileData.addresses[0];
              await tx.address.create({
                data: {
                  distributorProfileId: newProfile.id,
                  street: address.addressLine1,
                  area: address.addressLine2 || null,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country,
                  isDefault: address.isDefault
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
    console.error('Comprehensive Profile API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}