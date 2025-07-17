import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      // Step 1: Get or create a brand user
      let brandUser = await prisma.user.findFirst({
        where: { role: 'BRAND' }
      });

      if (!brandUser) {
        // Create a test brand user if none exists
        brandUser = await prisma.user.create({
          data: {
            name: 'Test Brand',
            email: 'testbrand@example.com',
            password: 'hashedpassword',
            role: 'BRAND',
            isActive: true,
            emailVerified: true
          }
        });
      }

      // Step 2: Clean up any existing TV Power Supply Board parts
      const existingParts = await prisma.part.findMany({
        where: {
          brandId: brandUser.id,
          OR: [
            { name: { contains: 'TV Power Supply Board', mode: 'insensitive' } },
            { code: { contains: 'TV-PSB', mode: 'insensitive' } }
          ]
        }
      });

      // Delete existing inventory and parts
      for (const part of existingParts) {
        await prisma.brandInventory.deleteMany({
          where: { partId: part.id }
        });
        await prisma.part.delete({
          where: { id: part.id }
        });
      }

      // Step 3: Create TV Power Supply Board test parts
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

      const createdParts = [];
      
      for (const partData of testParts) {
        // Create the part
        const newPart = await prisma.part.create({
          data: partData
        });

        // Create brand inventory record with 2 pieces as requested
        await prisma.brandInventory.create({
          data: {
            brandId: brandUser.id,
            partId: newPart.id,
            onHandQuantity: 2,
            availableQuantity: 2,
            reservedQuantity: 0,
            lastUpdated: new Date()
          }
        });

        createdParts.push(newPart);
      }

      // Step 4: Test search functionality exactly as ComprehensiveInventoryManager does
      const searchTerms = ['TV Power Supply Board', 'TV Power Supply', 'Power Supply Board', 'TV', 'PSB'];
      const searchResults = {};

      for (const searchTerm of searchTerms) {
        // Get all brand inventory for this brand
        const allInventory = await prisma.brandInventory.findMany({
          where: { brandId: brandUser.id },
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

        // Apply the same filtering logic as ComprehensiveInventoryManager
        const filteredResults = allInventory.filter(item => {
          const searchLower = searchTerm.toLowerCase().trim();
          return !searchLower || 
            item.part?.name?.toLowerCase().includes(searchLower) ||
            item.part?.code?.toLowerCase().includes(searchLower) ||
            item.part?.partNumber?.toLowerCase().includes(searchLower) ||
            item.part?.category?.toLowerCase().includes(searchLower) ||
            item.part?.subCategory?.toLowerCase().includes(searchLower) ||
            item.part?.tags?.toLowerCase().includes(searchLower);
        });

        searchResults[searchTerm] = {
          totalInventoryItems: allInventory.length,
          matchingItems: filteredResults.length,
          matches: filteredResults.map(item => ({
            partCode: item.part.code,
            partName: item.part.name,
            partNumber: item.part.partNumber,
            category: item.part.category,
            subCategory: item.part.subCategory,
            tags: item.part.tags,
            onHandQuantity: item.onHandQuantity,
            availableQuantity: item.availableQuantity
          }))
        };
      }

      // Step 5: Verify the unified system API works
      const unifiedSystemResponse = await fetch(`${req.headers.origin}/api/brand/inventory/unified-system?brandId=${brandUser.id}`, {
        method: 'GET',
        headers: {
          'Authorization': req.headers.authorization || '',
          'Content-Type': 'application/json'
        }
      }).catch(() => null);

      let unifiedSystemData = null;
      if (unifiedSystemResponse && unifiedSystemResponse.ok) {
        unifiedSystemData = await unifiedSystemResponse.json();
      }

      // Step 6: Get final verification
      const finalVerification = await prisma.brandInventory.findMany({
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
          part: true
        }
      });

      return res.status(200).json({
        success: true,
        message: 'TV Power Supply Board comprehensive test completed',
        data: {
          brandUser: {
            id: brandUser.id,
            name: brandUser.name,
            email: brandUser.email
          },
          createdParts: createdParts.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            partNumber: p.partNumber,
            category: p.category,
            tags: p.tags
          })),
          searchResults,
          unifiedSystemWorking: !!unifiedSystemData,
          unifiedSystemSummary: unifiedSystemData?.data?.summary || null,
          finalVerification: finalVerification.map(item => ({
            partId: item.partId,
            partCode: item.part.code,
            partName: item.part.name,
            onHandQuantity: item.onHandQuantity,
            availableQuantity: item.availableQuantity
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.method === 'GET') {
      // Just check current state
      const brandUser = await prisma.user.findFirst({
        where: { role: 'BRAND' }
      });

      if (!brandUser) {
        return res.status(404).json({ error: 'No brand user found' });
      }

      const currentTVParts = await prisma.brandInventory.findMany({
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
          part: true
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Current TV Power Supply Board status',
        data: {
          brandUser: {
            id: brandUser.id,
            name: brandUser.name,
            email: brandUser.email
          },
          currentTVParts: currentTVParts.map(item => ({
            partId: item.partId,
            partCode: item.part.code,
            partName: item.part.name,
            onHandQuantity: item.onHandQuantity,
            availableQuantity: item.availableQuantity
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Comprehensive TV test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}