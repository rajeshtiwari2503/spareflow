import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const boxParts = await prisma.boxPart.findMany({
        include: {
          box: {
            include: {
              shipment: true,
            },
          },
          part: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      res.status(200).json(boxParts)
    } catch (error) {
      console.error('Error fetching box parts:', error)
      res.status(500).json({ error: 'Failed to fetch box parts' })
    }
  } else if (req.method === 'POST') {
    try {
      const { boxId, partId, quantity } = req.body
      
      if (!boxId || !partId || !quantity) {
        return res.status(400).json({ error: 'boxId, partId, and quantity are required' })
      }
      
      const boxPart = await prisma.boxPart.create({
        data: {
          boxId,
          partId,
          quantity: parseInt(quantity),
        },
        include: {
          box: {
            include: {
              shipment: true,
            },
          },
          part: true,
        },
      })
      
      res.status(201).json(boxPart)
    } catch (error) {
      console.error('Error creating box part:', error)
      res.status(500).json({ error: 'Failed to create box part' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, quantity } = req.body
      
      if (!id) {
        return res.status(400).json({ error: 'Box part ID is required' })
      }
      
      const boxPart = await prisma.boxPart.update({
        where: { id },
        data: {
          quantity: quantity ? parseInt(quantity) : undefined,
        },
        include: {
          box: {
            include: {
              shipment: true,
            },
          },
          part: true,
        },
      })
      
      res.status(200).json(boxPart)
    } catch (error) {
      console.error('Error updating box part:', error)
      res.status(500).json({ error: 'Failed to update box part' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.body
      
      if (!id) {
        return res.status(400).json({ error: 'Box part ID is required' })
      }
      
      await prisma.boxPart.delete({
        where: { id },
      })
      
      res.status(200).json({ message: 'Box part deleted successfully' })
    } catch (error) {
      console.error('Error deleting box part:', error)
      res.status(500).json({ error: 'Failed to delete box part' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}