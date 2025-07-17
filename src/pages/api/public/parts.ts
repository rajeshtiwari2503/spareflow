import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { 
        search, 
        brand, 
        appliance, 
        partType, 
        minPrice, 
        maxPrice, 
        page = '1', 
        limit = '12' 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause for filtering
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { code: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (brand) {
        where.brand = {
          name: { contains: brand as string, mode: 'insensitive' }
        };
      }

      if (appliance) {
        where.description = { contains: appliance as string, mode: 'insensitive' };
      }

      if (partType) {
        where.name = { contains: partType as string, mode: 'insensitive' };
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice as string);
        if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
      }

      const [parts, totalCount] = await Promise.all([
        prisma.part.findMany({
          where,
          include: {
            brand: {
              select: { id: true, name: true }
            }
          },
          skip,
          take: limitNum,
          orderBy: { name: 'asc' }
        }),
        prisma.part.count({ where })
      ]);

      // Add mock inventory and compatibility data
      const enrichedParts = parts.map(part => ({
        ...part,
        partNumber: part.code,
        model: 'Universal',
        category: part.category || 'General',
        stock: Math.floor(Math.random() * 100) + 10,
        images: part.imageUrls ? JSON.parse(part.imageUrls) : [`https://images.unsplash.com/400x300/?${part.name.replace(/\s+/g, '+')}+spare+part`],
        specifications: part.specifications ? JSON.parse(part.specifications) : {},
        dimensions: {
          length: part.length || 10,
          breadth: part.breadth || 5,
          height: part.height || 3
        },
        estimatedDelivery: '2-3 business days',
        availability: part.isActive ? 
          (Math.random() > 0.8 ? 'LOW_STOCK' : 'IN_STOCK') : 
          'OUT_OF_STOCK'
      }));

      res.status(200).json({
        success: true,
        parts: enrichedParts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      console.error('Error fetching public parts:', error);
      res.status(500).json({ error: 'Failed to fetch parts' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}