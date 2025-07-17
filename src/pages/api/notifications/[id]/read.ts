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

    const { id } = req.query;
    const userId = req.user.id;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        recipients: {
          has: userId
        }
      }
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date()
      }
    });
    
    return res.status(200).json({
      success: true,
      data: updatedNotification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}