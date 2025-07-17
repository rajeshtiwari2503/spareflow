import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/auth'
import notificationManager, { NotificationPreferences } from '@/lib/notification-manager'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify authentication
    const decoded = verifyToken(req)
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = decoded.userId

    switch (req.method) {
      case 'GET':
        // Get user notification preferences
        try {
          const preferences = await notificationManager.getUserPreferences(userId)
          return res.status(200).json({
            success: true,
            preferences
          })
        } catch (error) {
          console.error('Failed to get notification preferences:', error)
          return res.status(500).json({
            error: 'Failed to get notification preferences'
          })
        }

      case 'PUT':
        // Update user notification preferences
        try {
          const { preferences } = req.body

          if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({
              error: 'Invalid preferences data'
            })
          }

          // Validate preferences structure
          const validatedPreferences: Partial<NotificationPreferences> = {}

          if (typeof preferences.emailEnabled === 'boolean') {
            validatedPreferences.emailEnabled = preferences.emailEnabled
          }

          if (typeof preferences.pushEnabled === 'boolean') {
            validatedPreferences.pushEnabled = preferences.pushEnabled
          }

          if (typeof preferences.smsEnabled === 'boolean') {
            validatedPreferences.smsEnabled = preferences.smsEnabled
          }

          if (Array.isArray(preferences.priorities)) {
            const validPriorities = ['low', 'medium', 'high', 'urgent']
            validatedPreferences.priorities = preferences.priorities.filter(
              (p: string) => validPriorities.includes(p)
            )
          }

          if (Array.isArray(preferences.types)) {
            const validTypes = ['shipment', 'tracking', 'order', 'reverse_request', 'purchase_order', 'wallet', 'system']
            validatedPreferences.types = preferences.types.filter(
              (t: string) => validTypes.includes(t)
            )
          }

          if (preferences.quietHours && typeof preferences.quietHours === 'object') {
            const { start, end, timezone } = preferences.quietHours
            if (typeof start === 'string' && typeof end === 'string' && typeof timezone === 'string') {
              // Validate time format (HH:MM)
              const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
              if (timeRegex.test(start) && timeRegex.test(end)) {
                validatedPreferences.quietHours = { start, end, timezone }
              }
            }
          }

          const success = await notificationManager.updateUserPreferences(userId, validatedPreferences)

          if (success) {
            const updatedPreferences = await notificationManager.getUserPreferences(userId)
            return res.status(200).json({
              success: true,
              message: 'Notification preferences updated successfully',
              preferences: updatedPreferences
            })
          } else {
            return res.status(500).json({
              error: 'Failed to update notification preferences'
            })
          }
        } catch (error) {
          console.error('Failed to update notification preferences:', error)
          return res.status(500).json({
            error: 'Failed to update notification preferences'
          })
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Notification preferences API error:', error)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}