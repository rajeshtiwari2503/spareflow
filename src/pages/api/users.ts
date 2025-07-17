import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        include: {
          parts: true,
          brandShipments: true,
          serviceCenterShipments: true,
          reverseRequests: true,
          distributorOrders: true,
          brandOrders: true,
          serviceCenterOrders: true,
          customerOrders: true,
        },
      })
      
      res.status(200).json(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      res.status(500).json({ error: 'Failed to fetch users' })
    }
  } else if (req.method === 'POST') {
    try {
      const { email, name, password, role } = req.body
      
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password, // In production, this should be hashed
          role,
        },
      })
      
      res.status(201).json(user)
    } catch (error) {
      console.error('Error creating user:', error)
      res.status(500).json({ error: 'Failed to create user' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'User ID is required' })
      }
      
      await prisma.user.delete({
        where: { id },
      })
      
      res.status(200).json({ message: 'User deleted successfully' })
    } catch (error) {
      console.error('Error deleting user:', error)
      res.status(500).json({ error: 'Failed to delete user' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}