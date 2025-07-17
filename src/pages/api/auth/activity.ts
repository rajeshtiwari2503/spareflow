import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.method === 'GET') {
      const { limit = '20', page = '1', action } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = parseInt(page as string) || 1;
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = { userId: user.id };
      if (action && typeof action === 'string') {
        where.action = { contains: action, mode: 'insensitive' };
      }

      // Fetch activity logs for the authenticated user
      const [activities, totalCount] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          select: {
            id: true,
            action: true,
            details: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true
          }
        }),
        prisma.activityLog.count({ where })
      ]);

      // Parse details JSON for better frontend consumption
      const formattedActivities = activities.map(activity => ({
        ...activity,
        details: activity.details ? (() => {
          try {
            return JSON.parse(activity.details);
          } catch {
            return activity.details;
          }
        })() : null
      }));

      res.status(200).json({
        success: true,
        data: {
          activities: formattedActivities,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalCount / limitNum),
            totalCount,
            hasNext: pageNum * limitNum < totalCount,
            hasPrev: pageNum > 1
          }
        }
      });

    } else if (req.method === 'POST') {
      // Log new activity
      const { action, details, ipAddress, userAgent } = req.body;

      if (!action || typeof action !== 'string') {
        return res.status(400).json({ 
          error: 'Action is required and must be a string' 
        });
      }

      // Get IP address from request if not provided
      const clientIp = ipAddress || 
        req.headers['x-forwarded-for'] || 
        req.headers['x-real-ip'] || 
        req.connection.remoteAddress || 
        'unknown';

      // Get user agent from request if not provided
      const clientUserAgent = userAgent || req.headers['user-agent'] || 'unknown';

      const activity = await prisma.activityLog.create({
        data: {
          userId: user.id,
          action,
          details: details ? JSON.stringify(details) : null,
          ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
          userAgent: clientUserAgent
        },
        select: {
          id: true,
          action: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true
        }
      });

      res.status(201).json({
        success: true,
        data: {
          ...activity,
          details: activity.details ? (() => {
            try {
              return JSON.parse(activity.details);
            } catch {
              return activity.details;
            }
          })() : null
        },
        message: 'Activity logged successfully'
      });

    } else if (req.method === 'DELETE') {
      // Clear user's activity history (optional feature)
      const { olderThan } = req.query;

      const where: any = { userId: user.id };
      
      if (olderThan) {
        const date = new Date(olderThan as string);
        if (!isNaN(date.getTime())) {
          where.createdAt = { lt: date };
        }
      }

      const deletedCount = await prisma.activityLog.deleteMany({ where });

      res.status(200).json({
        success: true,
        data: { deletedCount: deletedCount.count },
        message: `Deleted ${deletedCount.count} activity records`
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    console.error('Error in activity API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}