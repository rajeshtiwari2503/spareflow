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

    if (req.method === 'POST') {
      const { type, userIds, data } = req.body

      if (!type || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ error: 'Invalid bulk operation data' })
      }

      let updateData: any = {}
      let results: any = {}

      switch (type) {
        case 'UPDATE_STATUS':
          if (!data.status) {
            return res.status(400).json({ error: 'Status is required' })
          }
          
          updateData = { 
            updatedAt: new Date()
          }
          
          if (data.status === 'INACTIVE') {
            // For inactive status, we'll prefix the name with [DEACTIVATED]
            const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, name: true }
            })
            
            for (const user of users) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  name: user.name.includes('[DEACTIVATED]') ? user.name : `[DEACTIVATED] ${user.name}`,
                  updatedAt: new Date()
                }
              })
            }
          } else if (data.status === 'ACTIVE') {
            // For active status, remove [DEACTIVATED] prefix
            const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, name: true }
            })
            
            for (const user of users) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  name: user.name.replace('[DEACTIVATED] ', ''),
                  updatedAt: new Date()
                }
              })
            }
          }
          
          results = { updated: userIds.length }
          break

        case 'UPDATE_ROLE':
          if (!data.role) {
            return res.status(400).json({ error: 'Role is required' })
          }
          
          await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { 
              role: data.role,
              updatedAt: new Date()
            }
          })
          
          results = { updated: userIds.length }
          break

        case 'DELETE':
          await prisma.user.deleteMany({
            where: { id: { in: userIds } }
          })
          
          results = { deleted: userIds.length }
          break

        default:
          return res.status(400).json({ error: 'Invalid operation type' })
      }

      // Log the bulk operation
      await prisma.activityLog.createMany({
        data: userIds.map(userId => ({
          userId: decoded.userId,
          action: `BULK_${type}`,
          details: JSON.stringify({ targetUserId: userId, data }),
          createdAt: new Date()
        }))
      })

      return res.status(200).json({ 
        success: true, 
        results,
        message: `Bulk operation ${type} completed successfully`
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Bulk users API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}