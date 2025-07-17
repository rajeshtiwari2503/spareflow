import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        include: {
          distributor: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      res.status(200).json(purchaseOrders)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      res.status(500).json({ error: 'Failed to fetch purchase orders' })
    }
  } else if (req.method === 'POST') {
    try {
      const { distributorId, partId, quantity, status } = req.body
      
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          distributorId,
          partId,
          quantity: parseInt(quantity),
          status: status || 'DRAFT',
        },
        include: {
          distributor: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
      })
      
      res.status(201).json(purchaseOrder)
    } catch (error) {
      console.error('Error creating purchase order:', error)
      res.status(500).json({ error: 'Failed to create purchase order' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, ...updateData } = req.body
      
      if (!id) {
        return res.status(400).json({ error: 'Purchase order ID is required' })
      }
      
      const purchaseOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status,
          ...updateData,
        },
        include: {
          distributor: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
      })
      
      res.status(200).json(purchaseOrder)
    } catch (error) {
      console.error('Error updating purchase order:', error)
      res.status(500).json({ error: 'Failed to update purchase order' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}