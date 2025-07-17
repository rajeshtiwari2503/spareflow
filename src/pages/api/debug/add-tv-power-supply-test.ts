import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(401).json({ error: 'Unauthorized - Super Admin access required' });
    }

    if (req.method === 'POST') {
      // Get the first brand user to add the test part to
      const brandUser = await prisma.user.findFirst({
        where: { role: 'BRAND' }
      });

      if (!brandUser) {
        return res.status(404).json({ error: 'No brand user found' });
      }

      // Create TV Power Supply Board test parts
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
          name: 'TV Power Supply Board - LED',
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

      const createdParts = [];
      
      for (const partData of testParts) {
        // Check if part already exists
        const existingPart = await prisma.part.findFirst({
          where: {
            code: partData.code,
            brandId: partData.brandId
          }
        });

        if (!existingPart) {
          const newPart = await prisma.part.create({
            data: partData,
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

          // Create initial inventory record
          try {
            await prisma.brandInventory.create({
              data: {
                brandId: partData.brandId,
                partId: newPart.id,
                onHandQuantity: 2, // Set to 2 as mentioned by user
                availableQuantity: 2,
                reservedQuantity: 0,
                lastUpdated: new Date()
              }
            });
          } catch (inventoryError) {
            console.warn('Failed to create initial inventory record:', inventoryError);
          }

          createdParts.push(newPart);
        } else {
          // Update existing part's stock to 2
          await prisma.brandInventory.upsert({
            where: {
              brandId_partId: {
                brandId: partData.brandId,
                partId: existingPart.id
              }
            },
            update: {
              onHandQuantity: 2,
              availableQuantity: 2,
              lastUpdated: new Date()
            },
            create: {
              brandId: partData.brandId,
              partId: existingPart.id,
              onHandQuantity: 2,
              availableQuantity: 2,
              reservedQuantity: 0,
              lastUpdated: new Date()
            }
          });
          
          createdParts.push(existingPart);
        }
      }

      // Verify the parts were created and can be searched
      const searchResults = await prisma.part.findMany({
        where: {
          OR: [
            { name: { contains: 'TV Power Supply Board', mode: 'insensitive' } },
            { name: { contains: 'TV Power Supply', mode: 'insensitive' } },
            { name: { contains: 'Power Supply Board', mode: 'insensitive' } }
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

      // Get inventory for these parts
      const inventoryResults = await prisma.brandInventory.findMany({
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

      return res.status(200).json({
        success: true,
        message: 'TV Power Supply Board test parts created/updated successfully',
        data: {
          createdParts,
          searchResults,
          inventoryResults,
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
    console.error('TV Power Supply Board test creation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}