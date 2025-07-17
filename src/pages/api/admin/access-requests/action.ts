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
    // Verify admin authentication
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
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
            handledByAdminId: user.id,
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
            message: `Your access request for ${accessRequest.brand.name} has been approved by admin.`,
            priority: 'HIGH',
            recipients: [accessRequest.userId],
            data: JSON.stringify({
              requestId: accessRequest.id,
              brandName: accessRequest.brand.name,
              approvedBy: user.name
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
            handledByAdminId: user.id,
            updatedAt: new Date(),
            message: `${accessRequest.message}\n\nREJECTED: ${reason}`
          }
        });

        // Create in-app notification for rejection
        await tx.notification.create({
          data: {
            type: 'ACCESS_REQUEST_REJECTED',
            title: 'Brand Access Request Rejected',
            message: `Your access request for ${accessRequest.brand.name} has been rejected by admin.`,
            priority: 'MEDIUM',
            recipients: [accessRequest.userId],
            data: JSON.stringify({
              requestId: accessRequest.id,
              brandName: accessRequest.brand.name,
              rejectedBy: user.name,
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
          id: `access_approved_${requestId}`,
          type: 'access_request_approved',
          title: '🎉 Brand Access Request Approved!',
          message: `Great news! Your access request for ${accessRequest.brand.name} has been approved by our admin team. You can now start collaborating with this brand and access their spare parts catalog.`,
          timestamp: new Date().toISOString(),
          priority: 'high',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=authorized-brands`,
          actionLabel: 'View Authorized Brands',
          data: {
            requestId: accessRequest.id,
            brandName: accessRequest.brand.name,
            approvedBy: user.name,
            roleType: accessRequest.roleType
          }
        };

        await emailService.sendNotification(
          accessRequest.user.email,
          approvalNotification,
          accessRequest.user.name
        );

        // Send notification to brand about new authorized partner
        const brandNotification: NotificationData = {
          id: `new_partner_${requestId}`,
          type: 'new_partner_authorized',
          title: `New ${accessRequest.roleType === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'} Authorized`,
          message: `${accessRequest.user.name} has been approved and added to your authorized network. They can now access your spare parts catalog and place orders.`,
          timestamp: new Date().toISOString(),
          priority: 'medium',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard/brand?tab=authorized-network`,
          actionLabel: 'View Network',
          data: {
            partnerName: accessRequest.user.name,
            partnerEmail: accessRequest.user.email,
            partnerRole: accessRequest.roleType,
            approvedBy: user.name
          }
        };

        await emailService.sendNotification(
          accessRequest.brand.email,
          brandNotification,
          accessRequest.brand.name
        );

      } else if (action === 'reject') {
        // Send rejection email to requester
        const rejectionNotification: NotificationData = {
          id: `access_rejected_${requestId}`,
          type: 'access_request_rejected',
          title: 'Brand Access Request Update',
          message: `We regret to inform you that your access request for ${accessRequest.brand.name} has been rejected. Reason: ${reason}. You can submit a new request with additional information if needed.`,
          timestamp: new Date().toISOString(),
          priority: 'medium',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=access-requests`,
          actionLabel: 'View Requests',
          data: {
            requestId: accessRequest.id,
            brandName: accessRequest.brand.name,
            rejectedBy: user.name,
            reason: reason,
            roleType: accessRequest.roleType
          }
        };

        await emailService.sendNotification(
          accessRequest.user.email,
          rejectionNotification,
          accessRequest.user.name
        );

        // Send notification to brand about rejection
        const brandRejectionNotification: NotificationData = {
          id: `request_rejected_brand_${requestId}`,
          type: 'access_request_rejected_brand',
          title: 'Access Request Rejected by Admin',
          message: `The access request from ${accessRequest.user.name} (${accessRequest.roleType}) has been rejected by admin. Reason: ${reason}`,
          timestamp: new Date().toISOString(),
          priority: 'low',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard/brand?tab=access-requests`,
          actionLabel: 'View Requests',
          data: {
            requesterName: accessRequest.user.name,
            requesterRole: accessRequest.roleType,
            rejectedBy: user.name,
            reason: reason
          }
        };

        await emailService.sendNotification(
          accessRequest.brand.email,
          brandRejectionNotification,
          accessRequest.brand.name
        );
      }

      console.log(`Access request ${action} notifications sent successfully`);
    } catch (emailError) {
      console.error(`Failed to send ${action} notification emails:`, emailError);
      // Don't fail the request if email fails
    }

    // Log the admin action
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: `ACCESS_REQUEST_${action.toUpperCase()}`,
          details: JSON.stringify({
            requestId: accessRequest.id,
            requesterName: accessRequest.user.name,
            requesterRole: accessRequest.roleType,
            brandName: accessRequest.brand.name,
            reason: action === 'reject' ? reason : null
          }),
          ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
    }

    return res.status(200).json({
      success: true,
      message: `Access request ${action}d successfully`,
      data: {
        requestId: accessRequest.id,
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        handledBy: user.name,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing access request:', error);
    return res.status(500).json({ 
      error: 'Failed to process access request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}