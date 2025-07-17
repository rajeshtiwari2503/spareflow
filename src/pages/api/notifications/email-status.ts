import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/auth'
import emailService from '@/lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify authentication
    const decoded = verifyToken(req)
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Allow all authenticated users to check email status for testing
    // Admin users get full details, others get basic status
    const isAdmin = decoded.role === 'admin'

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Check email service configuration
    const isConfigured = emailService.isAvailable()
    
    // Check environment variables
    const envVars = {
      EMAIL_HOST: !!process.env.EMAIL_HOST || !!process.env.SMTP_HOST,
      EMAIL_PORT: !!process.env.EMAIL_PORT || !!process.env.SMTP_PORT,
      EMAIL_USER: !!process.env.EMAIL_USER || !!process.env.SMTP_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS || !!process.env.SMTP_PASS,
      EMAIL_FROM: !!process.env.EMAIL_FROM,
      EMAIL_SECURE: process.env.EMAIL_SECURE || process.env.SMTP_SECURE || 'false'
    }

    let connectionStatus = 'unknown'
    let connectionError = null

    // Test connection if configured
    if (isConfigured) {
      try {
        const connected = await emailService.verifyConnection()
        connectionStatus = connected ? 'connected' : 'failed'
      } catch (error) {
        connectionStatus = 'failed'
        connectionError = error instanceof Error ? error.message : 'Unknown connection error'
      }
    } else {
      connectionStatus = 'not_configured'
    }

    // Get missing configuration
    const missingConfig = Object.entries(envVars)
      .filter(([key, value]) => !value && key !== 'EMAIL_FROM')
      .map(([key]) => key)

    // Prepare response based on user role
    const emailServiceData: any = {
      configured: isConfigured,
      connectionStatus,
      connectionError: isAdmin ? connectionError : (connectionError ? 'Connection failed' : null)
    }

    // Add detailed information for admin users
    if (isAdmin) {
      emailServiceData.environmentVariables = envVars
      emailServiceData.missingConfiguration = missingConfig
      emailServiceData.recommendations = {
        required: [
          'EMAIL_HOST or SMTP_HOST',
          'EMAIL_USER or SMTP_USER', 
          'EMAIL_PASS or SMTP_PASS'
        ],
        optional: [
          'EMAIL_PORT or SMTP_PORT (default: 587)',
          'EMAIL_SECURE or SMTP_SECURE (default: false)',
          'EMAIL_FROM (default: uses EMAIL_USER)'
        ],
        examples: {
          gmail: {
            EMAIL_HOST: 'smtp.gmail.com',
            EMAIL_PORT: '587',
            EMAIL_SECURE: 'false',
            EMAIL_USER: 'your-email@gmail.com',
            EMAIL_PASS: 'your-app-password'
          },
          outlook: {
            EMAIL_HOST: 'smtp-mail.outlook.com',
            EMAIL_PORT: '587',
            EMAIL_SECURE: 'false',
            EMAIL_USER: 'your-email@outlook.com',
            EMAIL_PASS: 'your-password'
          },
          custom: {
            EMAIL_HOST: 'your-smtp-server.com',
            EMAIL_PORT: '587',
            EMAIL_SECURE: 'false',
            EMAIL_USER: 'your-email@domain.com',
            EMAIL_PASS: 'your-password'
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      emailService: emailServiceData,
      userRole: decoded.role
    })

  } catch (error) {
    console.error('Email status API error:', error)
    return res.status(500).json({
      error: 'Failed to check email service status',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}