import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const partId = req.query.partId as string;

    if (!partId) {
      return res.status(400).json({ error: 'Part ID is required' });
    }

    if (req.method === 'GET') {
      const part = await prisma.part.findUnique({
        where: { id: partId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          brandInventory: {
            select: {
              onHandQuantity: true,
              availableQuantity: true,
              reservedQuantity: true,
              defectiveQuantity: true,
              quarantineQuantity: true,
              inTransitQuantity: true,
              lastUpdated: true
            }
          }
        }
      });

      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }

      // Check access permissions
      if (user.role === 'BRAND' && part.brandId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.status(200).json({
        success: true,
        data: part
      });
    }

    if (req.method === 'PUT') {
      if (user.role !== 'BRAND' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied. Brand role required.' });
      }

      // First, check if the part exists and user has permission
      const existingPart = await prisma.part.findUnique({
        where: { id: partId }
      });

      if (!existingPart) {
        return res.status(404).json({ error: 'Part not found' });
      }

      if (user.role === 'BRAND' && existingPart.brandId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const {
        code,
        name,
        partNumber,
        category,
        subCategory,
        price,
        costPrice,
        weight,
        length,
        breadth,
        height,
        minStockLevel,
        maxStockLevel,
        reorderPoint,
        reorderQty,
        warranty,
        specifications,
        tags,
        featured,
        isActive
      } = req.body;

      // Check if new code conflicts with existing parts (excluding current part)
      if (code && code !== existingPart.code) {
        const codeConflict = await prisma.part.findFirst({
          where: {
            brandId: existingPart.brandId,
            code: code,
            id: { not: partId }
          }
        });

        if (codeConflict) {
          return res.status(400).json({ 
            error: 'Part code already exists for this brand' 
          });
        }
      }

      const updatedPart = await prisma.part.update({
        where: { id: partId },
        data: {
          code: code || existingPart.code,
          name: name || existingPart.name,
          partNumber: partNumber !== undefined ? partNumber : existingPart.partNumber,
          category: category !== undefined ? category : existingPart.category,
          subCategory: subCategory !== undefined ? subCategory : existingPart.subCategory,
          price: price !== undefined ? parseFloat(price) : existingPart.price,
          costPrice: costPrice !== undefined ? (costPrice ? parseFloat(costPrice) : null) : existingPart.costPrice,
          weight: weight !== undefined ? (weight ? parseFloat(weight) : null) : existingPart.weight,
          length: length !== undefined ? (length ? parseFloat(length) : null) : existingPart.length,
          breadth: breadth !== undefined ? (breadth ? parseFloat(breadth) : null) : existingPart.breadth,
          height: height !== undefined ? (height ? parseFloat(height) : null) : existingPart.height,
          minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : existingPart.minStockLevel,
          maxStockLevel: maxStockLevel !== undefined ? (maxStockLevel ? parseInt(maxStockLevel) : null) : existingPart.maxStockLevel,
          reorderPoint: reorderPoint !== undefined ? (reorderPoint ? parseInt(reorderPoint) : null) : existingPart.reorderPoint,
          reorderQty: reorderQty !== undefined ? (reorderQty ? parseInt(reorderQty) : null) : existingPart.reorderQty,
          warranty: warranty !== undefined ? (warranty ? parseInt(warranty) : null) : existingPart.warranty,
          specifications: specifications !== undefined ? specifications : existingPart.specifications,
          tags: tags !== undefined ? tags : existingPart.tags,
          featured: featured !== undefined ? featured : existingPart.featured,
          isActive: isActive !== undefined ? isActive : existingPart.isActive,
          updatedAt: new Date()
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

      return res.status(200).json({
        success: true,
        data: updatedPart,
        message: 'Part updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'BRAND' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied. Brand role required.' });
      }

      // First, check if the part exists and user has permission
      const existingPart = await prisma.part.findUnique({
        where: { id: partId }
      });

      if (!existingPart) {
        return res.status(404).json({ error: 'Part not found' });
      }

      if (user.role === 'BRAND' && existingPart.brandId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if part is used in any shipments or inventory
      const inventoryCount = await prisma.brandInventory.count({
        where: { 
          partId: partId,
          onHandQuantity: { gt: 0 }
        }
      });

      if (inventoryCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete part with existing inventory. Please adjust stock to zero first.' 
        });
      }

      // Soft delete by setting isActive to false
      const deletedPart = await prisma.part.update({
        where: { id: partId },
        data: {
          isActive: false,
          status: 'INACTIVE',
          updatedAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        data: deletedPart,
        message: 'Part deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Part API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}