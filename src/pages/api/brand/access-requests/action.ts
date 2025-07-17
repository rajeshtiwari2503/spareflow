import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import emailService from '@/lib/email';
import { NotificationData } from '@/lib/websocket';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify brand authentication
    const user = await verifyToken(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Brand access required' });
    }

    const { requestId, action, reason } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ error: 'Request ID and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    if (action === 'reject' && !reason?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Find the access request with all related data
    const accessRequest = await prisma.brandAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!accessRequest) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    // Verify that this request belongs to the current brand
    if (accessRequest.brandId !== user.id) {
      return res.status(403).json({ error: 'You can only manage requests for your own brand' });
    }

    if (accessRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    let updatedRequest;

    // Start a transaction to handle both the request update and authorization table update
    await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        // Update the access request status
        updatedRequest = await tx.brandAccessRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            handledByAdminId: user.id, // Brand user acting as approver
            updatedAt: new Date()
          }
        });

        // Add to the appropriate authorization table
        if (accessRequest.roleType === 'SERVICE_CENTER') {
          // Check if already exists to prevent duplicates
          const existing = await tx.brandAuthorizedServiceCenter.findUnique({
            where: {
              brandId_serviceCenterUserId: {
                brandId: accessRequest.brandId,
                serviceCenterUserId: accessRequest.userId
              }
            }
          });

          if (!existing) {
            await tx.brandAuthorizedServiceCenter.create({
              data: {
                brandId: accessRequest.brandId,
                serviceCenterUserId: accessRequest.userId,
                status: 'Active'
              }
            });
          }
        } else if (accessRequest.roleType === 'DISTRIBUTOR') {
          // Check if already exists to prevent duplicates
          const existing = await tx.brandAuthorizedDistributor.findUnique({
            where: {
              brandId_distributorUserId: {
                brandId: accessRequest.brandId,
                distributorUserId: accessRequest.userId
              }
            }
          });

          if (!existing) {
            await tx.brandAuthorizedDistributor.create({
              data: {
                brandId: accessRequest.brandId,
                distributorUserId: accessRequest.userId,
                status: 'Active'
              }
            });
          }
        }

        // Create in-app notification for approval
        await tx.notification.create({
          data: {
            type: 'ACCESS_REQUEST_APPROVED',
            title: 'Brand Access Request Approved',
            message: `Your access request for ${accessRequest.brand.name} has been approved! You can now access their spare parts catalog.`,
            priority: 'HIGH',
            recipients: [accessRequest.userId],
            data: JSON.stringify({
              requestId: accessRequest.id,
              brandName: accessRequest.brand.name,
              approvedBy: user.name,
              approvedByBrand: true
            }),
            actionRequired: false,
            actionUrl: `/dashboard?tab=authorized-brands`
          }
        });

      } else if (action === 'reject') {
        // Update the access request status with rejection reason
        updatedRequest = await tx.brandAccessRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            handledByAdminId: user.id, // Brand user acting as rejector
            updatedAt: new Date(),
            message: `${accessRequest.message}\n\nREJECTED BY BRAND: ${reason}`
          }
        });

        // Create in-app notification for rejection
        await tx.notification.create({
          data: {
            type: 'ACCESS_REQUEST_REJECTED',
            title: 'Brand Access Request Rejected',
            message: `Your access request for ${accessRequest.brand.name} has been rejected by the brand.`,
            priority: 'MEDIUM',
            recipients: [accessRequest.userId],
            data: JSON.stringify({
              requestId: accessRequest.id,
              brandName: accessRequest.brand.name,
              rejectedBy: user.name,
              rejectedByBrand: true,
              reason: reason
            }),
            actionRequired: false,
            actionUrl: `/dashboard?tab=access-requests`
          }
        });
      }
    });

    // Send email notifications after successful transaction
    try {
      if (action === 'approve') {
        // Send approval email to requester
        const approvalNotification: NotificationData = {
          id: `brand_access_approved_${requestId}`,
          type: 'access_request_approved',
          title: '🎉 Brand Access Request Approved!',
          message: `Excellent news! ${accessRequest.brand.name} has approved your access request. You can now access their spare parts catalog, place orders, and start collaborating with them.`,
          timestamp: new Date().toISOString(),
          priority: 'high',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=authorized-brands`,
          actionLabel: 'View Authorized Brands',
          data: {
            requestId: accessRequest.id,
            brandName: accessRequest.brand.name,
            approvedBy: user.name,
            roleType: accessRequest.roleType,
            approvedByBrand: true
          }
        };

        await emailService.sendNotification(
          accessRequest.user.email,
          approvalNotification,
          accessRequest.user.name
        );

        // Send welcome email with onboarding information
        const welcomeNotification: NotificationData = {
          id: `brand_welcome_${requestId}`,
          type: 'brand_welcome',
          title: `Welcome to ${accessRequest.brand.name} Network!`,
          message: `Welcome to the ${accessRequest.brand.name} authorized network! Here's what you can do now: Browse spare parts catalog, Place orders directly, Track shipments in real-time, Access technical documentation, and Get priority support.`,
          timestamp: new Date().toISOString(),
          priority: 'medium',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=parts-catalog&brand=${accessRequest.brandId}`,
          actionLabel: 'Browse Parts Catalog',
          data: {
            brandName: accessRequest.brand.name,
            roleType: accessRequest.roleType,
            nextSteps: [
              'Browse the parts catalog',
              'Update your profile information',
              'Set up inventory preferences',
              'Contact brand for any questions'
            ]
          }
        };

        // Send welcome email after a short delay
        setTimeout(async () => {
          try {
            await emailService.sendNotification(
              accessRequest.user.email,
              welcomeNotification,
              accessRequest.user.name
            );
          } catch (welcomeEmailError) {
            console.error('Failed to send welcome email:', welcomeEmailError);
          }
        }, 5000);

      } else if (action === 'reject') {
        // Send rejection email to requester
        const rejectionNotification: NotificationData = {
          id: `brand_access_rejected_${requestId}`,
          type: 'access_request_rejected',
          title: 'Brand Access Request Update',
          message: `We regret to inform you that ${accessRequest.brand.name} has declined your access request. Reason: ${reason}. You may contact the brand directly for more information or submit a new request with additional details.`,
          timestamp: new Date().toISOString(),
          priority: 'medium',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=access-requests`,
          actionLabel: 'View Requests',
          data: {
            requestId: accessRequest.id,
            brandName: accessRequest.brand.name,
            rejectedBy: user.name,
            rejectedByBrand: true,
            reason: reason,
            roleType: accessRequest.roleType,
            brandContact: accessRequest.brand.email
          }
        };

        await emailService.sendNotification(
          accessRequest.user.email,
          rejectionNotification,
          accessRequest.user.name
        );
      }

      console.log(`Brand access request ${action} notifications sent successfully`);
    } catch (emailError) {
      console.error(`Failed to send brand ${action} notification emails:`, emailError);
      // Don't fail the request if email fails
    }

    // Notify admin about brand action
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { email: true, name: true }
      });

      const adminNotification: NotificationData = {
        id: `admin_brand_action_${requestId}`,
        type: 'admin_notification',
        title: `Brand ${action === 'approve' ? 'Approved' : 'Rejected'} Access Request`,
        message: `${accessRequest.brand.name} has ${action}d an access request from ${accessRequest.user.name} (${accessRequest.roleType}).${action === 'reject' ? ` Reason: ${reason}` : ''}`,
        timestamp: new Date().toISOString(),
        priority: 'low',
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard/super-admin?tab=access-requests`,
        actionLabel: 'View All Requests',
        data: {
          requestId: accessRequest.id,
          brandName: accessRequest.brand.name,
          requesterName: accessRequest.user.name,
          action: action,
          reason: action === 'reject' ? reason : null
        }
      };

      for (const admin of adminUsers) {
        await emailService.sendNotification(admin.email, adminNotification, admin.name);
      }
    } catch (adminEmailError) {
      console.error('Failed to send admin notification:', adminEmailError);
    }

    // Log the brand action
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: `BRAND_ACCESS_REQUEST_${action.toUpperCase()}`,
          details: JSON.stringify({
            requestId: accessRequest.id,
            requesterName: accessRequest.user.name,
            requesterRole: accessRequest.roleType,
            brandName: accessRequest.brand.name,
            reason: action === 'reject' ? reason : null,
            actionByBrand: true
          }),
          ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (logError) {
      console.error('Failed to log brand action:', logError);
    }

    return res.status(200).json({
      success: true,
      message: `Access request ${action}d successfully`,
      data: {
        requestId: accessRequest.id,
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        handledBy: user.name,
        handledByBrand: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing brand access request:', error);
    return res.status(500).json({ 
      error: 'Failed to process access request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}