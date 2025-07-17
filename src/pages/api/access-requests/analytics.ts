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

    // Only allow SUPER_ADMIN and BRAND roles to access analytics
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Only admins and brands can view analytics.' });
    }

    const { period = '30', brandId } = req.query;

    // Calculate date range
    const days = parseInt(period as string);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause based on user role
    let where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (user.role === 'BRAND') {
      where.brandId = user.id;
    } else if (brandId && user.role === 'SUPER_ADMIN') {
      where.brandId = brandId as string;
    }

    // Get all requests in the period
    const requests = await prisma.brandAccessRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true
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

    // Calculate basic statistics
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;

    const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;
    const rejectionRate = totalRequests > 0 ? (rejectedRequests / totalRequests) * 100 : 0;

    // Calculate average response time for processed requests
    const processedRequests = requests.filter(r => r.status !== 'PENDING');
    const avgResponseTime = processedRequests.length > 0 
      ? processedRequests.reduce((sum, req) => {
          const responseTime = new Date(req.updatedAt).getTime() - new Date(req.createdAt).getTime();
          return sum + responseTime;
        }, 0) / processedRequests.length
      : 0;

    const avgResponseHours = Math.round(avgResponseTime / (1000 * 60 * 60));

    // Group by role type
    const roleTypeStats = {
      SERVICE_CENTER: {
        total: requests.filter(r => r.roleType === 'SERVICE_CENTER').length,
        pending: requests.filter(r => r.roleType === 'SERVICE_CENTER' && r.status === 'PENDING').length,
        approved: requests.filter(r => r.roleType === 'SERVICE_CENTER' && r.status === 'APPROVED').length,
        rejected: requests.filter(r => r.roleType === 'SERVICE_CENTER' && r.status === 'REJECTED').length
      },
      DISTRIBUTOR: {
        total: requests.filter(r => r.roleType === 'DISTRIBUTOR').length,
        pending: requests.filter(r => r.roleType === 'DISTRIBUTOR' && r.status === 'PENDING').length,
        approved: requests.filter(r => r.roleType === 'DISTRIBUTOR' && r.status === 'APPROVED').length,
        rejected: requests.filter(r => r.roleType === 'DISTRIBUTOR' && r.status === 'REJECTED').length
      }
    };

    // Daily breakdown for the period
    const dailyStats = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayRequests = requests.filter(r => {
        const createdAt = new Date(r.createdAt);
        return createdAt >= dayStart && createdAt <= dayEnd;
      });

      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        total: dayRequests.length,
        pending: dayRequests.filter(r => r.status === 'PENDING').length,
        approved: dayRequests.filter(r => r.status === 'APPROVED').length,
        rejected: dayRequests.filter(r => r.status === 'REJECTED').length,
        serviceCenters: dayRequests.filter(r => r.roleType === 'SERVICE_CENTER').length,
        distributors: dayRequests.filter(r => r.roleType === 'DISTRIBUTOR').length
      });
    }

    // Top brands (for admin view)
    let topBrands = [];
    if (user.role === 'SUPER_ADMIN') {
      const brandStats = await prisma.brandAccessRequest.groupBy({
        by: ['brandId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      const brandIds = brandStats.map(stat => stat.brandId);
      const brands = await prisma.user.findMany({
        where: {
          id: { in: brandIds },
          role: 'BRAND'
        },
        select: {
          id: true,
          name: true
        }
      });

      topBrands = brandStats.map(stat => {
        const brand = brands.find(b => b.id === stat.brandId);
        return {
          brandId: stat.brandId,
          brandName: brand?.name || 'Unknown Brand',
          requestCount: stat._count.id
        };
      });
    }

    // Recent activity
    const recentActivity = requests.slice(0, 10).map(request => ({
      id: request.id,
      userName: request.user.name,
      userRole: request.user.role,
      brandName: request.brand.name,
      roleType: request.roleType,
      status: request.status,
      handledBy: request.handledByAdmin?.name || null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      timeAgo: getTimeAgo(request.createdAt)
    }));

    // Pending requests requiring attention
    const urgentRequests = requests
      .filter(r => r.status === 'PENDING')
      .map(request => ({
        id: request.id,
        userName: request.user.name,
        userRole: request.user.role,
        brandName: request.brand.name,
        roleType: request.roleType,
        createdAt: request.createdAt.toISOString(),
        timeAgo: getTimeAgo(request.createdAt),
        urgency: getUrgency(request.createdAt, request.status),
        daysPending: Math.floor((new Date().getTime() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      analytics: {
        period: days,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          approvalRate: Math.round(approvalRate * 100) / 100,
          rejectionRate: Math.round(rejectionRate * 100) / 100,
          avgResponseHours
        },
        roleTypeStats,
        dailyStats,
        topBrands,
        recentActivity,
        urgentRequests
      }
    });

  } catch (error) {
    console.error('Error fetching access request analytics:', error);
    return res.status(500).json({
      error: 'Failed to fetch analytics',
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