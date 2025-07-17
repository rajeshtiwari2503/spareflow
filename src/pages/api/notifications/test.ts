import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/auth'
import notificationManager from '@/lib/notification-manager'
import emailService from '@/lib/email'
import { NotificationData } from '@/lib/websocket'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify authentication
    const decoded = verifyToken(req)
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = decoded.userId

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { type, priority = 'medium', forceEmail = false } = req.body

    // Validate input
    const validTypes = ['welcome', 'order', 'shipment', 'wallet', 'system', 'custom']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid notification type. Valid types: ' + validTypes.join(', ')
      })
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        error: 'Invalid priority. Valid priorities: ' + validPriorities.join(', ')
      })
    }

    // Check if email service is available
    const emailAvailable = emailService.isAvailable()
    if (!emailAvailable) {
      return res.status(503).json({
        error: 'Email service is not configured. Please set up email environment variables.',
        details: 'Required: EMAIL_HOST, EMAIL_USER, EMAIL_PASS'
      })
    }

    // Generate test notification based on type
    let notification: NotificationData
    let testData: any = {}

    switch (type) {
      case 'welcome':
        notification = {
          id: `test_welcome_${Date.now()}`,
          type: 'system',
          title: 'Welcome to SpareFlow! (Test)',
          message: 'This is a test welcome notification. Your account has been created successfully.',
          timestamp: new Date().toISOString(),
          priority: priority as any,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard`,
          actionLabel: 'Access Dashboard',
          data: {
            userRole: decoded.role,
            accountType: decoded.role,
            isTest: true
          }
        }
        break

      case 'order':
        testData = {
          id: `TEST_ORDER_${Date.now()}`,
          partName: 'Test Spare Part',
          quantity: 2,
          totalAmount: 1500,
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
        notification = {
          id: `test_order_${Date.now()}`,
          type: 'order',
          title: 'Order Confirmation (Test)',
          message: `Your test order #${testData.id} has been confirmed. This is a test notification.`,
          timestamp: new Date().toISOString(),
          priority: priority as any,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=orders`,
          actionLabel: 'View Orders',
          data: testData
        }
        break

      case 'shipment':
        testData = {
          id: `TEST_SHIPMENT_${Date.now()}`,
          status: 'IN_TRANSIT',
          numBoxes: 1,
          awbNumber: `TEST_AWB_${Date.now()}`
        }
        notification = {
          id: `test_shipment_${Date.now()}`,
          type: 'shipment',
          title: 'Shipment Update (Test)',
          message: `Test shipment #${testData.id} status has been updated to ${testData.status}. AWB: ${testData.awbNumber}`,
          timestamp: new Date().toISOString(),
          priority: priority as any,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=shipments`,
          actionLabel: 'Track Shipment',
          data: testData
        }
        break

      case 'wallet':
        testData = {
          id: `TEST_TXN_${Date.now()}`,
          type: 'CREDIT',
          amount: 1000,
          balanceAfter: 5000,
          reason: 'Test transaction'
        }
        notification = {
          id: `test_wallet_${Date.now()}`,
          type: 'wallet',
          title: 'Wallet Credited (Test)',
          message: `₹${testData.amount} has been credited to your wallet (test). Current balance: ₹${testData.balanceAfter}`,
          timestamp: new Date().toISOString(),
          priority: priority as any,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=wallet`,
          actionLabel: 'View Wallet',
          data: testData
        }
        break

      case 'system':
        notification = {
          id: `test_system_${Date.now()}`,
          type: 'system',
          title: 'System Notification (Test)',
          message: 'This is a test system notification. All systems are functioning normally.',
          timestamp: new Date().toISOString(),
          priority: priority as any,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard`,
          actionLabel: 'View Dashboard',
          data: {
            category: 'test',
            isTest: true
          }
        }
        break

      case 'custom':
        const { title, message, actionUrl, actionLabel, data } = req.body
        if (!title || !message) {
          return res.status(400).json({
            error: 'Custom notifications require title and message'
          })
        }
        notification = {
          id: `test_custom_${Date.now()}`,
          type: 'system',
          title: `${title} (Test)`,
          message: message,
          timestamp: new Date().toISOString(),
          priority: priority as any,
          actionUrl: actionUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard`,
          actionLabel: actionLabel || 'View Dashboard',
          data: { ...data, isTest: true }
        }
        break

      default:
        return res.status(400).json({ error: 'Invalid notification type' })
    }

    // Send test notification
    const result = await notificationManager.sendToUser(userId, notification, {
      forceEmail: forceEmail
    })

    return res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        priority: notification.priority
      },
      delivery: result,
      emailServiceStatus: {
        available: emailAvailable,
        configured: emailService.isAvailable()
      }
    })

  } catch (error) {
    console.error('Test notification API error:', error)
    return res.status(500).json({
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}