import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { partId } = req.query

  if (typeof partId !== 'string') {
    return res.status(400).json({
      error: 'Invalid part ID',
      details: 'Part ID must be a string'
    })
  }

  if (req.method === 'GET') {
    try {
      // Verify part exists
      const part = await prisma.part.findUnique({
        where: { id: partId },
        select: { id: true, brandId: true, name: true, code: true }
      })

      if (!part) {
        return res.status(404).json({
          error: 'Part not found',
          details: `No part found with ID: ${partId}`
        })
      }

      // Fetch stock movements
      const movements = await prisma.stockMovement.findMany({
        where: { partId },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to last 50 movements
      })

      res.status(200).json({
        success: true,
        part: {
          id: part.id,
          name: part.name,
          code: part.code
        },
        movements,
        count: movements.length,
        message: `Successfully retrieved ${movements.length} stock movements`
      })

    } catch (error) {
      console.error('Error fetching stock movements:', error)
      res.status(500).json({
        error: 'Failed to fetch stock movements',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({
      error: 'Method not allowed',
      details: `Method ${req.method} is not allowed for this endpoint`
    })
  }
}