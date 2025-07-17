import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all brands (users with BRAND role)
    const brands = await prisma.user.findMany({
      where: {
        role: 'BRAND'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        brandProfile: {
          select: {
            companyName: true,
            website: true,
            description: true,
            isVerified: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data to match the expected format
    const transformedBrands = brands.map(brand => ({
      id: brand.id,
      name: brand.brandProfile?.companyName || brand.name,
      description: brand.brandProfile?.description || '',
      status: 'ACTIVE' as const,
      contactEmail: brand.email,
      website: brand.brandProfile?.website,
      categories: ['Auto Parts'], // Default category
      isVerified: brand.brandProfile?.isVerified || false
    }));

    return res.status(200).json({
      brands: transformedBrands,
      total: transformedBrands.length
    });

  } catch (error) {
    console.error('Error fetching brands:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}