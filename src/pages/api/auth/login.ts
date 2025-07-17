import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Login attempt - Request body keys:', Object.keys(req.body));
    const { email, password, rememberMe, userAgent, timezone } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Login validation failed - Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      console.log('Login failed - User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', user.email, 'Role:', user.role);

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      console.log('Login failed - Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Password verified for:', email);

    // Generate token
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = generateToken(authUser);

    // Get user preferences
    const preferencesRecord = await prisma.systemSettings.findUnique({
      where: { key: `user_preferences_${user.id}` }
    });

    const defaultPreferences = {
      theme: 'system',
      language: 'en',
      timezone: timezone || 'UTC',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      dashboard: {
        defaultView: 'overview',
        itemsPerPage: 10,
      },
    };

    const preferences = preferencesRecord 
      ? JSON.parse(preferencesRecord.value)
      : defaultPreferences;

    // Get role-based permissions
    const permissions = getRolePermissions(user.role);

    // Create session info
    const session = {
      id: `session_${user.id}_${Date.now()}`,
      loginTime: new Date(),
      lastActivity: new Date(),
      userAgent: userAgent || req.headers['user-agent'],
    };

    // Calculate session expiry based on remember me
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + (rememberMe ? 30 : 7));

    // Update user's last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    res.status(200).json({
      success: true,
      token,
      user: authUser,
      preferences,
      permissions,
      session,
      sessionExpiry: sessionExpiry.toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true,
      profileComplete: !!(user.name && user.email),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    SUPER_ADMIN: [
      'user.manage',
      'system.config',
      'audit.view',
      'part.approve',
      'wallet.manage',
      'courier.manage',
      'margin.view',
      'all.access'
    ],
    BRAND: [
      'shipment.create',
      'shipment.view',
      'part.create',
      'part.manage',
      'wallet.view',
      'reverse.approve',
      'forecast.view'
    ],
    DISTRIBUTOR: [
      'purchase_order.view',
      'purchase_order.fulfill',
      'inventory.manage'
    ],
    SERVICE_CENTER: [
      'shipment.receive',
      'reverse.create',
      'part.view',
      'diy.access'
    ],
    CUSTOMER: [
      'order.create',
      'order.view',
      'part.search',
      'diy.access',
      'tracking.view'
    ]
  };

  return rolePermissions[role] || [];
}