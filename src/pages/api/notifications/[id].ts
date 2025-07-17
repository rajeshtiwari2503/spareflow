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
  try {
    await verifyToken(req);
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    switch (req.method) {
      case 'GET':
        return await getNotification(req, res, id);
      case 'PUT':
        return await updateNotification(req, res, id);
      case 'DELETE':
        return await deleteNotification(req, res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getNotification(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const userId = req.user!.id;
    
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
    
    return res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return res.status(500).json({ error: 'Failed to fetch notification' });
  }
}

async function updateNotification(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const userId = req.user!.id;
    const { read } = req.body;
    
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
    
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        read: read !== undefined ? read : true,
        readAt: read !== false ? new Date() : null
      }
    });
    
    return res.status(200).json({
      success: true,
      data: updatedNotification
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
}

async function deleteNotification(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const userId = req.user!.id;
    
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
    
    await prisma.notification.delete({
      where: { id }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
}