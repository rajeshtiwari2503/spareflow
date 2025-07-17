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
      const { userIds, subject, message, type } = req.body

      if (!userIds || !Array.isArray(userIds) || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Create notifications for all target users
      const notifications = userIds.map(userId => ({
        userId,
        title: subject,
        message,
        type: type || 'ANNOUNCEMENT',
        createdAt: new Date()
      }))

      await prisma.notification.createMany({
        data: notifications
      })

      // Log the message sending activity
      await prisma.activityLog.create({
        data: {
          userId: decoded.userId,
          action: 'BULK_MESSAGE_SENT',
          details: JSON.stringify({
            recipientCount: userIds.length,
            subject,
            type
          }),
          createdAt: new Date()
        }
      })

      return res.status(200).json({ 
        success: true,
        message: `Message sent to ${userIds.length} users successfully`
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Message users API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}