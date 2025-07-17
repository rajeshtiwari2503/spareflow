import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.query;

    if (requestId) {
      // Get specific request status
      const request = await prisma.brandAccessRequest.findUnique({
        where: { id: requestId as string },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
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
              name: true,
              role: true
            }
          }
        }
      });

      if (!request) {
        return res.status(404).json({ error: 'Access request not found' });
      }

      // Check if user has permission to view this request
      const canView = user.role === 'SUPER_ADMIN' || 
                     request.userId === user.id || 
                     request.brandId === user.id;

      if (!canView) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get status history (simulated - you might want to create a separate table for this)
      const statusHistory = await getStatusHistory(request);

      return res.status(200).json({
        success: true,
        request: {
          id: request.id,
          userId: request.userId,
          userName: request.user.name,
          userEmail: request.user.email,
          userRole: request.user.role,
          brandId: request.brandId,
          brandName: request.brand.name,
          brandEmail: request.brand.email,
          roleType: request.roleType,
          message: request.message,
          documentUrl: request.documentUrl,
          status: request.status,
          handledBy: request.handledByAdmin ? {
            id: request.handledByAdmin.id,
            name: request.handledByAdmin.name,
            role: request.handledByAdmin.role
          } : null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
          statusHistory,
          timeline: generateTimeline(request, statusHistory)
        }
      });

    } else {
      // Get user's request status summary
      let where: any = {};

      if (user.role === 'SERVICE_CENTER' || user.role === 'DISTRIBUTOR') {
        where.userId = user.id;
      } else if (user.role === 'BRAND') {
        where.brandId = user.id;
      } else if (user.role === 'SUPER_ADMIN') {
        // Admin can see all requests
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }

      const requests = await prisma.brandAccessRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
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
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const summary = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'PENDING').length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        rejected: requests.filter(r => r.status === 'REJECTED').length,
        recentRequests: requests.slice(0, 5).map(request => ({
          id: request.id,
          brandName: request.brand.name,
          userName: request.user.name,
          roleType: request.roleType,
          status: request.status,
          createdAt: request.createdAt.toISOString(),
          timeAgo: getTimeAgo(request.createdAt)
        }))
      };

      return res.status(200).json({
        success: true,
        summary,
        requests: requests.map(request => ({
          id: request.id,
          userId: request.userId,
          userName: request.user.name,
          userRole: request.user.role,
          brandId: request.brandId,
          brandName: request.brand.name,
          roleType: request.roleType,
          status: request.status,
          handledBy: request.handledByAdmin?.name || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
          timeAgo: getTimeAgo(request.createdAt),
          urgency: getUrgency(request.createdAt, request.status)
        }))
      });
    }

  } catch (error) {
    console.error('Error fetching access request status:', error);
    return res.status(500).json({
      error: 'Failed to fetch access request status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to get status history
async function getStatusHistory(request: any) {
  const history = [
    {
      status: 'PENDING',
      timestamp: request.createdAt.toISOString(),
      actor: request.user.name,
      actorRole: request.user.role,
      action: 'submitted',
      description: `Access request submitted to ${request.brand.name}`
    }
  ];

  if (request.status === 'APPROVED') {
    history.push({
      status: 'APPROVED',
      timestamp: request.updatedAt.toISOString(),
      actor: request.handledByAdmin?.name || 'System',
      actorRole: request.handledByAdmin?.role || 'SYSTEM',
      action: 'approved',
      description: `Access request approved by ${request.handledByAdmin?.name || 'admin'}`
    });
  } else if (request.status === 'REJECTED') {
    history.push({
      status: 'REJECTED',
      timestamp: request.updatedAt.toISOString(),
      actor: request.handledByAdmin?.name || 'System',
      actorRole: request.handledByAdmin?.role || 'SYSTEM',
      action: 'rejected',
      description: `Access request rejected by ${request.handledByAdmin?.name || 'admin'}`
    });
  }

  return history;
}

// Helper function to generate timeline
function generateTimeline(request: any, statusHistory: any[]) {
  const timeline = statusHistory.map((item, index) => ({
    ...item,
    isCompleted: true,
    isCurrent: false,
    step: index + 1
  }));

  // Mark current step
  if (request.status === 'PENDING') {
    timeline[timeline.length - 1].isCurrent = true;
  }

  // Add next steps for pending requests
  if (request.status === 'PENDING') {
    timeline.push({
      status: 'REVIEW',
      timestamp: null,
      actor: 'Brand/Admin',
      actorRole: 'BRAND',
      action: 'review',
      description: 'Awaiting review by brand or admin',
      isCompleted: false,
      isCurrent: true,
      step: timeline.length + 1
    });

    timeline.push({
      status: 'DECISION',
      timestamp: null,
      actor: 'Brand/Admin',
      actorRole: 'BRAND',
      action: 'decision',
      description: 'Final approval or rejection decision',
      isCompleted: false,
      isCurrent: false,
      step: timeline.length + 1
    });
  }

  return timeline;
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    const days = Math.floor(diffInDays);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Helper function to determine urgency
function getUrgency(createdAt: Date, status: string): 'low' | 'medium' | 'high' {
  if (status !== 'PENDING') return 'low';

  const now = new Date();
  const diffInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (diffInHours > 72) return 'high'; // More than 3 days
  if (diffInHours > 24) return 'medium'; // More than 1 day
  return 'low';
}