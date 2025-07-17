import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if any SUPER_ADMIN users exist
    const existingSuperAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (existingSuperAdmins.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'SUPER_ADMIN users already exist',
        existingSuperAdmins
      });
    }

    // Create a default SUPER_ADMIN user
    const hashedPassword = await hashPassword('admin123'); // Default password

    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@spareflow.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        phone: '+1234567890'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'SUPER_ADMIN user created successfully',
      user: superAdmin,
      credentials: {
        email: 'admin@spareflow.com',
        password: 'admin123'
      }
    });

  } catch (error) {
    console.error('Error creating SUPER_ADMIN:', error);
    return res.status(500).json({ 
      error: 'Failed to create SUPER_ADMIN user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}