import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/auth'
import emailService from '@/lib/email'
import { NotificationData } from '@/lib/websocket'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set a timeout for the entire request
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.error('Debug email test timed out after 30 seconds')
      res.status(408).json({
        error: 'Request timeout',
        details: 'Debug test took too long to complete',
        timestamp: new Date().toISOString()
      })
    }
  }, 30000) // 30 second timeout

  try {
    console.log('Debug email test started')
    
    // Verify authentication
    const user = await verifyToken(req)
    if (!user) {
      clearTimeout(timeoutId)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method !== 'POST') {
      clearTimeout(timeoutId)
      res.setHeader('Allow', ['POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { testEmail } = req.body

    // Use the authenticated user's email if no test email provided
    const recipientEmail = testEmail || user.email

    if (!recipientEmail) {
      clearTimeout(timeoutId)
      return res.status(400).json({ error: 'No recipient email available' })
    }

    // Debug information
    const debugInfo = {
      emailServiceAvailable: emailService.isAvailable(),
      environmentVariables: {
        EMAIL_HOST: !!process.env.EMAIL_HOST,
        EMAIL_PORT: !!process.env.EMAIL_PORT,
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        EMAIL_SECURE: process.env.EMAIL_SECURE,
        EMAIL_FROM: !!process.env.EMAIL_FROM,
        NODE_ENV: process.env.NODE_ENV
      },
      recipientEmail,
      userInfo: {
        userId: user.id,
        email: user.email,
        role: user.role
      }
    }

    console.log('Email debug info:', debugInfo)

    // Test connection first with timeout
    let connectionTest = false
    let connectionError = null
    
    try {
      console.log('Testing email connection...')
      const connectionPromise = emailService.verifyConnection()
      const connectionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout')), 10000)
      )
      
      connectionTest = await Promise.race([connectionPromise, connectionTimeout]) as boolean
      console.log('Connection test result:', connectionTest)
    } catch (error) {
      connectionError = error instanceof Error ? error.message : 'Unknown connection error'
      console.error('Connection test failed:', error)
    }

    // Create a simple test notification
    const testNotification: NotificationData = {
      id: `debug_test_${Date.now()}`,
      type: 'system',
      title: 'Email Debug Test',
      message: `This is a debug test email sent at ${new Date().toLocaleString()}. If you receive this, the email service is working correctly.`,
      timestamp: new Date().toISOString(),
      priority: 'medium',
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard`,
      actionLabel: 'View Dashboard',
      data: {
        debugTest: true,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    }

    // Try to send the email with timeout
    let emailSent = false
    let emailError = null

    try {
      console.log('Attempting to send debug email to:', recipientEmail)
      const emailPromise = emailService.sendNotification(
        recipientEmail,
        testNotification,
        user.name || 'Test User'
      )
      const emailTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout')), 15000)
      )
      
      emailSent = await Promise.race([emailPromise, emailTimeout]) as boolean
      console.log('Email send result:', emailSent)
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Unknown email error'
      console.error('Email send failed:', error)
    }

    clearTimeout(timeoutId)

    const response = {
      success: true,
      debug: debugInfo,
      tests: {
        connectionTest: {
          passed: connectionTest,
          error: connectionError
        },
        emailSend: {
          passed: emailSent,
          error: emailError
        }
      },
      message: emailSent 
        ? `Debug email sent successfully to ${recipientEmail}` 
        : `Failed to send debug email to ${recipientEmail}`,
      timestamp: new Date().toISOString()
    }

    console.log('Debug test completed successfully:', response)
    return res.status(200).json(response)

  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Debug email test API error:', error)
    
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Debug test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  }
}