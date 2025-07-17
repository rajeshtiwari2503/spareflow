import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { brand, category, search, status, limit = 50, offset = 0 } = req.query

      let whereClause: any = {}

      // Apply brand filter
      if (brand && brand !== 'ALL') {
        whereClause.brandId = brand as string
      }

      // Apply category filter
      if (category && category !== 'ALL') {
        whereClause.category = category as string
      }

      // Apply status filter
      if (status && status !== 'ALL') {
        whereClause.isActive = status === 'ACTIVE'
      }

      // Apply search filter
      if (search) {
        whereClause.OR = [
          { code: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ]
      }

      const [parts, totalCount] = await Promise.all([
        prisma.part.findMany({
          where: whereClause,
          include: {
            brand: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string)
        }),
        prisma.part.count({ where: whereClause })
      ])

      // Get summary statistics
      const [totalParts, activeParts, lowStockParts, outOfStockParts] = await Promise.all([
        prisma.part.count(),
        prisma.part.count({ where: { isActive: true } }),
        prisma.part.count({ where: { msl: { lte: 10 }, isActive: true } }),
        prisma.part.count({ where: { msl: { lte: 0 }, isActive: true } })
      ])

      res.status(200).json({
        parts,
        total: totalCount,
        hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string),
        summary: {
          totalParts,
          activeParts,
          lowStockParts,
          outOfStockParts
        }
      })
    } catch (error) {
      console.error('Error fetching product catalog:', error)
      res.status(500).json({ error: 'Failed to fetch product catalog' })
    }
  } else if (req.method === 'POST') {
    try {
      const { action, partData, partId } = req.body

      if (action === 'create') {
        const newPart = await prisma.part.create({
          data: {
            ...partData,
            createdAt: new Date(),
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
        })

        res.status(201).json({ success: true, part: newPart })
      } else if (action === 'update' && partId) {
        const updatedPart = await prisma.part.update({
          where: { id: partId },
          data: {
            ...partData,
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
        })

        res.status(200).json({ success: true, part: updatedPart })
      } else if (action === 'delete' && partId) {
        await prisma.part.delete({
          where: { id: partId }
        })

        res.status(200).json({ success: true, message: 'Part deleted successfully' })
      } else if (action === 'bulkUpload') {
        // Handle bulk upload functionality
        // This would process a CSV/Excel file with part data
        res.status(200).json({ 
          success: true, 
          message: 'Bulk upload functionality not implemented yet' 
        })
      } else {
        res.status(400).json({ error: 'Invalid action or missing parameters' })
      }
    } catch (error) {
      console.error('Error processing product catalog action:', error)
      res.status(500).json({ error: 'Failed to process action' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}