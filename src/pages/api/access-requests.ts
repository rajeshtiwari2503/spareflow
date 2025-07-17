import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import emailService from '@/lib/email';
import { NotificationData } from '@/lib/websocket';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only allow SERVICE_CENTER and DISTRIBUTOR roles
    if (user.role !== 'SERVICE_CENTER' && user.role !== 'DISTRIBUTOR') {
      return res.status(403).json({ message: 'Access denied. Only service centers and distributors can request brand access.' });
    }

    if (req.method === 'POST') {
      const { brandId, message, documentUrl } = req.body;

      // Validate required fields
      if (!brandId || !message) {
        return res.status(400).json({ message: 'Brand ID and message are required' });
      }

      // Check if brand exists and has BRAND role
      const brand = await prisma.user.findFirst({
        where: {
          id: brandId,
          role: 'BRAND'
        },
        include: {
          brandProfile: true
        }
      });

      if (!brand) {
        return res.status(404).json({ message: 'Brand not found' });
      }

      // Check if there's already a pending request
      const existingRequest = await prisma.brandAccessRequest.findFirst({
        where: {
          userId: user.id,
          brandId: brandId,
          status: 'PENDING'
        }
      });

      if (existingRequest) {
        return res.status(409).json({ message: 'You already have a pending request for this brand' });
      }

      // Check if user is already authorized for this brand
      if (user.role === 'SERVICE_CENTER') {
        const existingAuth = await prisma.brandAuthorizedServiceCenter.findFirst({
          where: {
            brandId: brandId,
            serviceCenterUserId: user.id,
            status: 'Active'
          }
        });

        if (existingAuth) {
          return res.status(409).json({ message: 'You are already authorized for this brand' });
        }
      } else if (user.role === 'DISTRIBUTOR') {
        const existingAuth = await prisma.brandAuthorizedDistributor.findFirst({
          where: {
            brandId: brandId,
            distributorUserId: user.id,
            status: 'Active'
          }
        });

        if (existingAuth) {
          return res.status(409).json({ message: 'You are already authorized for this brand' });
        }
      }

      // Create the access request
      const accessRequest = await prisma.brandAccessRequest.create({
        data: {
          userId: user.id,
          roleType: user.role === 'SERVICE_CENTER' ? 'SERVICE_CENTER' : 'DISTRIBUTOR',
          brandId: brandId,
          message: message,
          documentUrl: documentUrl || null,
          status: 'PENDING'
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      // Send email notification to brand
      try {
        const notification: NotificationData = {
          id: `access_request_${accessRequest.id}`,
          type: 'access_request',
          title: `New ${user.role === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'} Access Request`,
          message: `${user.name} has requested access to your brand network. Please review and approve/reject this request.`,
          timestamp: new Date().toISOString(),
          priority: 'medium',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard/brand?tab=access-requests`,
          actionLabel: 'Review Request',
          data: {
            requestId: accessRequest.id,
            requesterName: user.name,
            requesterEmail: user.email,
            requesterRole: user.role,
            brandName: brand.name,
            message: message
          }
        };

        await emailService.sendNotification(
          brand.email,
          notification,
          brand.name,
          {
            requesterPhone: user.phone,
            documentUrl: documentUrl
          }
        );

        console.log(`Access request notification sent to brand: ${brand.email}`);
      } catch (emailError) {
        console.error('Failed to send access request notification email:', emailError);
        // Don't fail the request if email fails
      }

      // Send notification to admin
      try {
        const adminUsers = await prisma.user.findMany({
          where: { role: 'SUPER_ADMIN' },
          select: { email: true, name: true }
        });

        const adminNotification: NotificationData = {
          id: `admin_access_request_${accessRequest.id}`,
          type: 'admin_notification',
          title: 'New Brand Access Request Submitted',
          message: `${user.name} (${user.role}) has submitted an access request for ${brand.name}. Admin review may be required.`,
          timestamp: new Date().toISOString(),
          priority: 'low',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard/super-admin?tab=access-requests`,
          actionLabel: 'View All Requests',
          data: {
            requestId: accessRequest.id,
            requesterName: user.name,
            brandName: brand.name,
            roleType: user.role
          }
        };

        for (const admin of adminUsers) {
          await emailService.sendNotification(admin.email, adminNotification, admin.name);
        }
      } catch (adminEmailError) {
        console.error('Failed to send admin notification:', adminEmailError);
      }

      // Create in-app notification
      try {
        await prisma.notification.create({
          data: {
            type: 'ACCESS_REQUEST',
            title: `New ${user.role === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'} Access Request`,
            message: `${user.name} has requested access to your brand network.`,
            priority: 'MEDIUM',
            recipients: [brandId],
            data: JSON.stringify({
              requestId: accessRequest.id,
              requesterName: user.name,
              requesterRole: user.role
            }),
            actionRequired: true,
            actionUrl: `/dashboard/brand?tab=access-requests&request=${accessRequest.id}`
          }
        });
      } catch (notificationError) {
        console.error('Failed to create in-app notification:', notificationError);
      }

      res.status(201).json({
        message: 'Access request submitted successfully',
        request: {
          id: accessRequest.id,
          brandName: accessRequest.brand.name,
          status: accessRequest.status,
          createdAt: accessRequest.createdAt
        }
      });

    } else if (req.method === 'GET') {
      // Get user's access requests
      const accessRequests = await prisma.brandAccessRequest.findMany({
        where: {
          userId: user.id
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          handledByAdmin: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const formattedRequests = accessRequests.map(request => ({
        id: request.id,
        brandId: request.brandId,
        brandName: request.brand.name,
        roleType: request.roleType,
        message: request.message,
        documentUrl: request.documentUrl,
        status: request.status,
        handledBy: request.handledByAdmin?.name || null,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString()
      }));

      res.status(200).json({
        requests: formattedRequests
      });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error handling access request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}