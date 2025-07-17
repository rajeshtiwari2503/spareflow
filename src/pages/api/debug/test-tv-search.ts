import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // First, let's check what parts exist in the database
      const allParts = await prisma.part.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          partNumber: true,
          category: true,
          subCategory: true,
          tags: true,
          isActive: true,
          brandId: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      // Check for TV Power Supply Board specifically
      const tvPowerSupplyParts = await prisma.part.findMany({
        where: {
          OR: [
            { name: { contains: 'TV Power Supply Board', mode: 'insensitive' } },
            { name: { contains: 'TV Power Supply', mode: 'insensitive' } },
            { name: { contains: 'Power Supply Board', mode: 'insensitive' } },
            { name: { contains: 'TV', mode: 'insensitive' } },
            { code: { contains: 'TV', mode: 'insensitive' } },
            { partNumber: { contains: 'TV', mode: 'insensitive' } }
          ]
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Check brand inventory for these parts
      const brandInventory = await prisma.brandInventory.findMany({
        where: {
          part: {
            OR: [
              { name: { contains: 'TV Power Supply Board', mode: 'insensitive' } },
              { name: { contains: 'TV Power Supply', mode: 'insensitive' } },
              { name: { contains: 'Power Supply Board', mode: 'insensitive' } },
              { name: { contains: 'TV', mode: 'insensitive' } },
              { code: { contains: 'TV', mode: 'insensitive' } }
            ]
          }
        },
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              partNumber: true,
              category: true,
              isActive: true
            }
          },
          brand: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Test the search functionality that ComprehensiveInventoryManager uses
      const searchTerm = 'TV Power Supply Board';
      const searchResults = await prisma.brandInventory.findMany({
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              partNumber: true,
              category: true,
              subCategory: true,
              price: true,
              weight: true,
              length: true,
              breadth: true,
              height: true,
              minStockLevel: true,
              maxStockLevel: true,
              reorderPoint: true,
              reorderQty: true,
              costPrice: true,
              sellingPrice: true,
              warranty: true,
              specifications: true,
              tags: true,
              status: true,
              featured: true,
              isActive: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });

      // Filter using the same logic as ComprehensiveInventoryManager
      const filteredResults = searchResults.filter(item => {
        const searchLower = searchTerm.toLowerCase().trim();
        return !searchLower || 
          item.part?.name?.toLowerCase().includes(searchLower) ||
          item.part?.code?.toLowerCase().includes(searchLower) ||
          item.part?.partNumber?.toLowerCase().includes(searchLower) ||
          item.part?.category?.toLowerCase().includes(searchLower) ||
          item.part?.subCategory?.toLowerCase().includes(searchLower) ||
          item.part?.tags?.toLowerCase().includes(searchLower);
      });

      // Get database statistics
      const stats = {
        totalParts: await prisma.part.count(),
        totalBrandInventory: await prisma.brandInventory.count(),
        activeParts: await prisma.part.count({ where: { isActive: true } }),
        partsWithStock: await prisma.brandInventory.count({ where: { onHandQuantity: { gt: 0 } } })
      };

      return res.status(200).json({
        success: true,
        searchTerm,
        data: {
          allParts,
          tvPowerSupplyParts,
          brandInventory,
          searchResults: filteredResults,
          stats,
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('TV search test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}