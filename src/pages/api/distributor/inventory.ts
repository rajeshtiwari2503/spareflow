import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Mock inventory data for distributor
      const mockInventory = [
        {
          id: 'inv-001',
          partId: 'part-001',
          partNumber: 'TC-001',
          partName: 'Circuit Board',
          brandName: 'TechCorp',
          category: 'Electronics',
          currentStock: 25,
          minStockLevel: 10,
          maxStockLevel: 100,
          reorderPoint: 15,
          unitCost: 4500,
          sellingPrice: 5000,
          profitMargin: 11.1,
          lastRestocked: '2024-01-10T00:00:00Z',
          lastSold: '2024-01-15T00:00:00Z',
          turnoverRate: 2.5,
          location: 'A-1-001',
          supplier: 'TechCorp Direct',
          leadTime: 7,
          status: 'ACTIVE',
          images: [],
          specifications: {},
          demandForecast: 30,
          seasonalTrend: 'STABLE'
        },
        {
          id: 'inv-002',
          partId: 'part-002',
          partNumber: 'TC-002',
          partName: 'Power Supply',
          brandName: 'TechCorp',
          category: 'Power',
          currentStock: 8,
          minStockLevel: 10,
          maxStockLevel: 50,
          reorderPoint: 12,
          unitCost: 13500,
          sellingPrice: 15000,
          profitMargin: 11.1,
          lastRestocked: '2024-01-08T00:00:00Z',
          lastSold: '2024-01-16T00:00:00Z',
          turnoverRate: 1.8,
          location: 'B-2-003',
          supplier: 'TechCorp Direct',
          leadTime: 10,
          status: 'ACTIVE',
          images: [],
          specifications: {},
          demandForecast: 15,
          seasonalTrend: 'INCREASING'
        },
        {
          id: 'inv-003',
          partId: 'part-003',
          partNumber: 'EM-001',
          partName: 'Motor Assembly',
          brandName: 'ElectroMax',
          category: 'Motors',
          currentStock: 0,
          minStockLevel: 5,
          maxStockLevel: 25,
          reorderPoint: 8,
          unitCost: 16200,
          sellingPrice: 18000,
          profitMargin: 11.1,
          lastRestocked: '2024-01-05T00:00:00Z',
          lastSold: '2024-01-16T00:00:00Z',
          turnoverRate: 3.2,
          location: 'C-1-005',
          supplier: 'ElectroMax India',
          leadTime: 14,
          status: 'ACTIVE',
          images: [],
          specifications: {},
          demandForecast: 12,
          seasonalTrend: 'STABLE'
        },
        {
          id: 'inv-004',
          partId: 'part-004',
          partNumber: 'GEN-001',
          partName: 'Control Panel',
          brandName: 'GenericTech',
          category: 'Controls',
          currentStock: 45,
          minStockLevel: 20,
          maxStockLevel: 80,
          reorderPoint: 25,
          unitCost: 2700,
          sellingPrice: 3000,
          profitMargin: 11.1,
          lastRestocked: '2024-01-12T00:00:00Z',
          lastSold: '2024-01-14T00:00:00Z',
          turnoverRate: 4.1,
          location: 'A-3-010',
          supplier: 'Generic Suppliers',
          leadTime: 5,
          status: 'ACTIVE',
          images: [],
          specifications: {},
          demandForecast: 50,
          seasonalTrend: 'DECREASING'
        }
      ];

      return res.status(200).json({
        success: true,
        inventory: mockInventory
      });

    } catch (error) {
      console.error('Error fetching distributor inventory:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } else if (req.method === 'PUT') {
    try {
      const { itemId, newStock } = req.body;

      if (!itemId || newStock === undefined) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'itemId and newStock are required'
        });
      }

      // In a real system, you would update the inventory in the database
      // For now, we'll just return a success response
      
      return res.status(200).json({
        success: true,
        message: 'Inventory updated successfully',
        itemId: itemId,
        newStock: newStock
      });

    } catch (error) {
      console.error('Error updating distributor inventory:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}