import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(401).json({ error: 'Unauthorized - Super Admin access required' });
    }

    if (req.method === 'GET') {
      // Search for TV Power Supply Board specifically
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

      // Get all parts to see what's in the database
      const allParts = await prisma.part.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          partNumber: true,
          category: true,
          subCategory: true,
          brandId: true,
          isActive: true,
          brand: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Check brand inventory for TV Power Supply Board
      const brandInventory = await prisma.brandInventory.findMany({
        where: {
          part: {
            OR: [
              { name: { contains: 'TV Power Supply Board', mode: 'insensitive' } },
              { name: { contains: 'TV Power Supply', mode: 'insensitive' } },
              { name: { contains: 'Power Supply Board', mode: 'insensitive' } }
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

      // Search in inventory ledger for any TV Power Supply Board transactions
      const inventoryLedger = await prisma.inventoryLedger.findMany({
        where: {
          part: {
            OR: [
              { name: { contains: 'TV Power Supply Board', mode: 'insensitive' } },
              { name: { contains: 'TV Power Supply', mode: 'insensitive' } },
              { name: { contains: 'Power Supply Board', mode: 'insensitive' } }
            ]
          }
        },
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              partNumber: true
            }
          },
          brand: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get database statistics
      const stats = {
        totalParts: await prisma.part.count(),
        totalBrandInventory: await prisma.brandInventory.count(),
        totalInventoryLedger: await prisma.inventoryLedger.count(),
        activeParts: await prisma.part.count({ where: { isActive: true } }),
        partsWithStock: await prisma.brandInventory.count({ where: { onHandQuantity: { gt: 0 } } })
      };

      return res.status(200).json({
        success: true,
        data: {
          tvPowerSupplyParts,
          brandInventoryMatches: brandInventory,
          inventoryLedgerMatches: inventoryLedger,
          allParts: allParts.slice(0, 20), // First 20 parts for reference
          stats,
          searchQuery: 'TV Power Supply Board',
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('TV Power Supply Board check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}