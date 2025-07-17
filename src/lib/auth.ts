import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthToken {
  user: AuthUser;
  iat: number;
  exp: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { user },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token (string version)
export function verifyTokenString(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Handle both old and new token formats
    if (decoded.user) {
      return decoded as AuthToken;
    } else if (decoded.userId) {
      // Convert old format to new format
      return {
        user: {
          id: decoded.userId,
          email: decoded.email || '',
          name: decoded.name || '',
          role: decoded.role || 'CUSTOMER'
        },
        iat: decoded.iat,
        exp: decoded.exp
      } as AuthToken;
    }
    
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Get user from token
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const decoded = verifyTokenString(token);
  if (!decoded) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching user from token:', error);
    return null;
  }
}

// Enhanced verifyToken function for API requests
export async function verifyToken(req: NextApiRequest): Promise<AuthUser | null> {
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return null;
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    let userId: string;
    
    // Handle both token formats
    if (decoded.user?.id) {
      userId = decoded.user.id;
    } else if (decoded.userId) {
      userId = decoded.userId;
    } else {
      return null;
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Middleware to protect API routes
export function withAuth(handler: (req: NextApiRequest, res: NextApiResponse, user: AuthUser) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Try to get token from Authorization header first, then from cookies
      let token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token && req.cookies.token) {
        token = req.cookies.token;
      }
      
      console.log('Auth middleware - Token present:', !!token);
      console.log('Auth middleware - Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
      console.log('Auth middleware - Cookies:', req.cookies.token ? 'Token cookie present' : 'No token cookie');
      
      if (!token) {
        console.log('Auth middleware - No token provided');
        return res.status(401).json({ error: 'No token provided' });
      }

      const user = await getUserFromToken(token);
      
      if (!user) {
        console.log('Auth middleware - Invalid token');
        return res.status(401).json({ error: 'Invalid token' });
      }

      console.log('Auth middleware - User authenticated:', user.email, user.role);
      return handler(req, res, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

// Middleware to protect API routes with role check
export function withAuthAndRole(roles: UserRole[], handler: (req: NextApiRequest, res: NextApiResponse, user: AuthUser) => Promise<void>) {
  return withAuth(async (req: NextApiRequest, res: NextApiResponse, user: AuthUser) => {
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    return handler(req, res, user);
  });
}

// Get user from request (for pages)
export async function getUserFromRequest(req: NextApiRequest): Promise<AuthUser | null> {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies.token;
  
  if (!token) return null;
  
  return getUserFromToken(token);
}

// Verify auth for API routes with proper result format
export async function verifyAuth(req: NextApiRequest): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const user = await verifyToken(req);
    if (user) {
      return { success: true, user };
    } else {
      return { success: false, error: 'Authentication failed' };
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    return { success: false, error: 'Authentication error' };
  }
}