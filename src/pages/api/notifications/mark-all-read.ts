import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    role: string;
  };
}

// Middleware to verify JWT token
function verifyToken(req: AuthenticatedRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies.token;

    if (!token) {
      return reject(new Error('No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = decoded;
      resolve();
    } catch (error) {
      reject(new Error('Invalid token'));
    }
  });
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await verifyToken(req);
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;
    
    // Mark all unread notifications as read for this user
    const result = await prisma.notification.updateMany({
      where: {
        recipients: {
          has: userId
        },
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
    
    return res.status(200).json({
      success: true,
      message: `${result.count} notifications marked as read`,
      count: result.count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}