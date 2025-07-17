import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      // Get the first brand user to add the test part to
      const brandUser = await prisma.user.findFirst({
        where: { role: 'BRAND' }
      });

      if (!brandUser) {
        return res.status(404).json({ error: 'No brand user found' });
      }

      // Create TV Power Supply Board test parts with simple approach
      const testParts = [
        {
          code: 'TV-PSB-001',
          name: 'TV Power Supply Board',
          partNumber: 'PSB-TV-2024-001',
          category: 'Electronics',
          subCategory: 'Power Supply',
          price: 2500.00,
          costPrice: 2000.00,
          weight: 0.5,
          length: 15.0,
          breadth: 10.0,
          height: 3.0,
          minStockLevel: 5,
          maxStockLevel: 50,
          reorderPoint: 10,
          reorderQty: 20,
          warranty: 12,
          specifications: 'Universal TV Power Supply Board compatible with multiple TV models',
          tags: 'TV, power supply, electronics, board, repair',
          featured: true,
          isActive: true,
          status: 'ACTIVE',
          brandId: brandUser.id
        },
        {
          code: 'TV-PSB-002',
          name: 'TV Power Supply Board LED',
          partNumber: 'PSB-LED-2024-002',
          category: 'Electronics',
          subCategory: 'Power Supply',
          price: 3000.00,
          costPrice: 2400.00,
          weight: 0.6,
          length: 16.0,
          breadth: 11.0,
          height: 3.5,
          minStockLevel: 3,
          maxStockLevel: 30,
          reorderPoint: 8,
          reorderQty: 15,
          warranty: 18,
          specifications: 'LED TV Power Supply Board with enhanced efficiency',
          tags: 'LED TV, power supply, electronics, board, repair, LED',
          featured: false,
          isActive: true,
          status: 'ACTIVE',
          brandId: brandUser.id
        }
      ];

      const results = [];
      
      for (const partData of testParts) {
        try {
          // Delete existing part if it exists
          await prisma.part.deleteMany({
            where: {
              code: partData.code,
              brandId: partData.brandId
            }
          });

          // Create new part
          const newPart = await prisma.part.create({
            data: partData
          });

          // Create brand inventory record
          await prisma.brandInventory.create({
            data: {
              brandId: partData.brandId,
              partId: newPart.id,
              onHandQuantity: 2,
              availableQuantity: 2,
              reservedQuantity: 0,
              lastUpdated: new Date()
            }
          });

          results.push({
            success: true,
            part: newPart,
            inventory: { onHandQuantity: 2, availableQuantity: 2 }
          });

        } catch (error) {
          results.push({
            success: false,
            code: partData.code,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Verify the parts were created and can be searched
      const verificationSearch = await prisma.brandInventory.findMany({
        where: {
          brandId: brandUser.id,
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
              isActive: true,
              tags: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'TV Power Supply Board test parts created successfully',
        data: {
          results,
          verificationSearch,
          brandUsed: {
            id: brandUser.id,
            name: brandUser.name,
            email: brandUser.email
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('TV Power Supply Board simple creation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}