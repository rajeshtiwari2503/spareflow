import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify brand authentication
    const user = await verifyToken(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Brand access required' });
    }

    const { status, roleType, page = '1', limit = '10' } = req.query;

    // Build where clause for filtering
    const where: any = {
      brandId: user.id // Only show requests for this brand
    };

    if (status && status !== 'all') {
      where.status = status as string;
    }

    if (roleType && roleType !== 'all') {
      where.roleType = roleType as string;
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await prisma.brandAccessRequest.count({ where });

    // Fetch access requests with related data
    const requests = await prisma.brandAccessRequest.findMany({
      where,
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
        handledByAdmin: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Pending first
        { createdAt: 'desc' } // Most recent first
      ],
      skip,
      take: limitNum
    });

    const formattedRequests = requests.map(request => ({
      id: request.id,
      userId: request.userId,
      userName: request.user.name,
      userEmail: request.user.email,
      userPhone: request.user.phone,
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
      // Calculate time since request
      timeAgo: getTimeAgo(request.createdAt),
      // Determine urgency based on time
      urgency: getUrgency(request.createdAt, request.status)
    }));

    // Calculate statistics
    const stats = {
      total: totalCount,
      pending: await prisma.brandAccessRequest.count({
        where: { ...where, status: 'PENDING' }
      }),
      approved: await prisma.brandAccessRequest.count({
        where: { ...where, status: 'APPROVED' }
      }),
      rejected: await prisma.brandAccessRequest.count({
        where: { ...where, status: 'REJECTED' }
      })
    };

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching brand access requests:', error);
    return res.status(500).json({
      error: 'Failed to fetch access requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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