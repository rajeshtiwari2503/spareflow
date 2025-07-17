import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const boxes = await prisma.box.findMany({
        include: {
          shipment: true,
          boxParts: {
            include: {
              part: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      res.status(200).json(boxes)
    } catch (error) {
      console.error('Error fetching boxes:', error)
      res.status(500).json({ error: 'Failed to fetch boxes' })
    }
  } else if (req.method === 'POST') {
    try {
      const { shipmentId, boxNumber, weight, awbNumber, status } = req.body
      
      const box = await prisma.box.create({
        data: {
          shipmentId,
          boxNumber: boxNumber.toString(),
          weight: weight ? parseFloat(weight) : null,
          awbNumber,
          status: status || 'PENDING',
        },
        include: {
          shipment: true,
          boxParts: {
            include: {
              part: true,
            },
          },
        },
      })
      
      res.status(201).json(box)
    } catch (error) {
      console.error('Error creating box:', error)
      res.status(500).json({ error: 'Failed to create box' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}