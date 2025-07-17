import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get token from request
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && req.cookies.token) {
      token = req.cookies.token;
    }

    console.log('Auth test - Token present:', !!token);
    console.log('Auth test - Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
    console.log('Auth test - Cookies:', req.cookies.token ? 'Token cookie present' : 'No token cookie');

    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided',
        debug: {
          hasAuthHeader: !!req.headers.authorization,
          hasCookieToken: !!req.cookies.token,
          cookies: Object.keys(req.cookies)
        }
      });
    }

    // Verify token
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        debug: {
          tokenLength: token.length,
          tokenStart: token.substring(0, 10) + '...'
        }
      });
    }

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // Get all SUPER_ADMIN users for debugging
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      dbUser,
      debug: {
        tokenValid: true,
        userExists: !!dbUser,
        isSuperAdmin: user.role === 'SUPER_ADMIN',
        superAdminCount: superAdmins.length,
        superAdmins: superAdmins
      }
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return res.status(500).json({ 
      error: 'Authentication test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}