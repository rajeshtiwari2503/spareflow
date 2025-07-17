import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (req.method === 'GET') {
      // Mock courier logs data since we don't have a courier logs table
      const mockCourierLogs = [
        {
          id: '1',
          awbNumber: 'DTDC123456789',
          service: 'DTDC Express',
          status: 'DELIVERED',
          cost: 150,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          awbNumber: 'DTDC987654321',
          service: 'DTDC Standard',
          status: 'IN_TRANSIT',
          cost: 120,
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          awbNumber: 'DTDC456789123',
          service: 'DTDC Express',
          status: 'PICKED_UP',
          cost: 180,
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          updatedAt: new Date().toISOString(),
        },
        {
          id: '4',
          awbNumber: 'DTDC789123456',
          service: 'DTDC Standard',
          status: 'DELIVERED',
          cost: 95,
          createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          updatedAt: new Date().toISOString(),
        },
        {
          id: '5',
          awbNumber: 'DTDC321654987',
          service: 'DTDC Express',
          status: 'FAILED',
          cost: 200,
          createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
          updatedAt: new Date().toISOString(),
        }
      ]

      res.status(200).json({ logs: mockCourierLogs })
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error fetching courier logs:', error)
    res.status(500).json({ error: 'Failed to fetch courier logs' })
  }
}