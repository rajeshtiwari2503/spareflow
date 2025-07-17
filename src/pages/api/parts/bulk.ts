import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { partIds, operation, brandId } = req.body

      if (!partIds || !Array.isArray(partIds) || partIds.length === 0) {
        return res.status(400).json({
          error: 'Invalid part IDs',
          details: 'Part IDs must be a non-empty array'
        })
      }

      if (!operation || !brandId) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'Operation and brandId are required'
        })
      }

      // Verify all parts belong to the brand
      const parts = await prisma.part.findMany({
        where: {
          id: { in: partIds },
          brandId
        }
      })

      if (parts.length !== partIds.length) {
        return res.status(403).json({
          error: 'Unauthorized',
          details: 'Some parts do not belong to this brand'
        })
      }

      let result
      const timestamp = new Date()

      switch (operation) {
        case 'publish':
          result = await prisma.part.updateMany({
            where: {
              id: { in: partIds },
              brandId
            },
            data: {
              status: 'published',
              publishedAt: timestamp,
              updatedAt: timestamp
            }
          })
          break

        case 'archive':
          result = await prisma.part.updateMany({
            where: {
              id: { in: partIds },
              brandId
            },
            data: {
              status: 'archived',
              isActive: false,
              updatedAt: timestamp
            }
          })
          break

        case 'activate':
          result = await prisma.part.updateMany({
            where: {
              id: { in: partIds },
              brandId
            },
            data: {
              isActive: true,
              updatedAt: timestamp
            }
          })
          break

        case 'deactivate':
          result = await prisma.part.updateMany({
            where: {
              id: { in: partIds },
              brandId
            },
            data: {
              isActive: false,
              updatedAt: timestamp
            }
          })
          break

        case 'delete':
          // Soft delete by archiving
          result = await prisma.part.updateMany({
            where: {
              id: { in: partIds },
              brandId
            },
            data: {
              status: 'archived',
              isActive: false,
              updatedAt: timestamp
            }
          })
          break

        case 'export':
          // Return the parts data for export
          const exportParts = await prisma.part.findMany({
            where: {
              id: { in: partIds },
              brandId
            },
            select: {
              code: true,
              name: true,
              description: true,
              partNumber: true,
              brandModel: true,
              category: true,
              subCategory: true,
              material: true,
              compatibility: true,
              length: true,
              breadth: true,
              height: true,
              weight: true,
              costPrice: true,
              price: true,
              sellingPrice: true,
              stockQuantity: true,
              minStockLevel: true,
              maxStockLevel: true,
              reorderPoint: true,
              reorderQty: true,
              warranty: true,
              status: true,
              featured: true,
              createdAt: true,
              updatedAt: true
            }
          })

          return res.status(200).json({
            success: true,
            operation: 'export',
            data: exportParts,
            count: exportParts.length,
            message: `Successfully exported ${exportParts.length} parts`
          })

        default:
          return res.status(400).json({
            error: 'Invalid operation',
            details: `Operation '${operation}' is not supported`
          })
      }

      res.status(200).json({
        success: true,
        operation,
        affected: result.count,
        message: `Successfully ${operation}ed ${result.count} parts`
      })

    } catch (error) {
      console.error('Error in bulk operation:', error)
      res.status(500).json({
        error: 'Bulk operation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({
      error: 'Method not allowed',
      details: `Method ${req.method} is not allowed for this endpoint`
    })
  }
}