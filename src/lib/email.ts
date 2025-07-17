import nodemailer from 'nodemailer'
import { NotificationData } from '@/lib/websocket'

// Email configuration interface
interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

// Email template data interface
interface EmailTemplateData {
  recipientName?: string
  recipientEmail: string
  subject: string
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  type: string
  data?: any
  companyName?: string
  supportEmail?: string
  unsubscribeUrl?: string
}

// Email service class
class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private config: EmailConfig | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      // Check for email configuration in environment variables
      const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST
      const emailPort = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587')
      const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER
      const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS
      const emailSecure = process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true'

      if (!emailHost || !emailUser || !emailPass) {
        console.warn('Email configuration not found. Email notifications will be disabled.')
        return
      }

      this.config = {
        host: emailHost,
        port: emailPort,
        secure: emailSecure,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      }

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        // Add connection timeout settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,   // 30 seconds
        socketTimeout: 60000,     // 60 seconds
        // Enable debug logging in development
        debug: process.env.NODE_ENV !== 'production',
        logger: process.env.NODE_ENV !== 'production'
      })

      console.log('Email service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize email service:', error)
    }
  }

  // Check if email service is available
  public isAvailable(): boolean {
    return this.transporter !== null && this.config !== null
  }

  // Verify email configuration
  public async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false
    }

    try {
      await this.transporter.verify()
      console.log('Email service connection verified')
      return true
    } catch (error) {
      console.error('Email service verification failed:', error)
      return false
    }
  }

  // Generate HTML email template
  private generateEmailTemplate(data: EmailTemplateData): string {
    const priorityColors = {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#2563eb',
      low: '#6b7280'
    }

    const priorityColor = priorityColors[data.priority] || priorityColors.medium

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .email-header .company-name {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 5px;
        }
        .email-body {
            padding: 30px 20px;
        }
        .priority-badge {
            display: inline-block;
            background-color: ${priorityColor};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 20px;
        }
        .notification-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        .notification-message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 25px;
            line-height: 1.7;
        }
        .action-button {
            display: inline-block;
            background-color: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-bottom: 25px;
            transition: background-color 0.3s ease;
        }
        .action-button:hover {
            background-color: #5a67d8;
        }
        .notification-details {
            background-color: #f8fafc;
            border-left: 4px solid ${priorityColor};
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
        }
        .detail-value {
            color: #6b7280;
        }
        .email-footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 10px;
        }
        .footer-links {
            font-size: 12px;
        }
        .footer-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        .footer-links a:hover {
            text-decoration: underline;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .email-header, .email-body, .email-footer {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>SpareFlow</h1>
            <div class="company-name">AI Spare Logistics Platform</div>
        </div>
        
        <div class="email-body">
            <div class="priority-badge">${data.priority} Priority</div>
            
            <h2 class="notification-title">${data.title}</h2>
            
            <p class="notification-message">${data.message}</p>
            
            ${data.actionUrl ? `
                <a href="${data.actionUrl}" class="action-button">
                    ${data.actionLabel || 'View Details'}
                </a>
            ` : ''}
            
            ${data.data ? `
                <div class="notification-details">
                    <div class="detail-row">
                        <span class="detail-label">Notification Type:</span>
                        <span class="detail-value">${data.type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Timestamp:</span>
                        <span class="detail-value">${new Date().toLocaleString()}</span>
                    </div>
                    ${Object.entries(data.data).map(([key, value]) => `
                        <div class="detail-row">
                            <span class="detail-label">${key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                            <span class="detail-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                This is an automated notification from SpareFlow. Please do not reply to this email.
            </p>
        </div>
        
        <div class="email-footer">
            <p class="footer-text">
                © ${new Date().getFullYear()} SpareFlow. All rights reserved.
            </p>
            <div class="footer-links">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard">Dashboard</a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/help">Help Center</a>
                ${data.unsubscribeUrl ? `<a href="${data.unsubscribeUrl}">Unsubscribe</a>` : ''}
            </div>
        </div>
    </div>
</body>
</html>
    `
  }

  // Generate plain text email
  private generatePlainTextEmail(data: EmailTemplateData): string {
    let text = `SpareFlow - ${data.title}\n\n`
    text += `Priority: ${data.priority.toUpperCase()}\n\n`
    text += `${data.message}\n\n`
    
    if (data.actionUrl) {
      text += `${data.actionLabel || 'View Details'}: ${data.actionUrl}\n\n`
    }
    
    if (data.data) {
      text += `Details:\n`
      text += `- Type: ${data.type}\n`
      text += `- Timestamp: ${new Date().toLocaleString()}\n`
      Object.entries(data.data).forEach(([key, value]) => {
        text += `- ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}\n`
      })
      text += '\n'
    }
    
    text += `This is an automated notification from SpareFlow.\n`
    text += `© ${new Date().getFullYear()} SpareFlow. All rights reserved.\n`
    
    return text
  }

  // Send email notification
  public async sendNotification(
    recipientEmail: string,
    notification: NotificationData,
    recipientName?: string,
    additionalData?: any
  ): Promise<boolean> {
    if (!this.transporter || !this.isAvailable()) {
      console.warn('Email service not available, skipping email notification')
      return false
    }

    try {
      const emailData: EmailTemplateData = {
        recipientName,
        recipientEmail,
        subject: `SpareFlow: ${notification.title}`,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        priority: notification.priority,
        type: notification.type,
        data: { ...notification.data, ...additionalData },
        companyName: 'SpareFlow',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@spareflow.com'
      }

      const mailOptions = {
        from: {
          name: 'SpareFlow',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@spareflow.com'
        },
        to: recipientEmail,
        subject: emailData.subject,
        html: this.generateEmailTemplate(emailData),
        text: this.generatePlainTextEmail(emailData),
        headers: {
          'X-Priority': notification.priority === 'urgent' ? '1' : 
                       notification.priority === 'high' ? '2' : '3',
          'X-SpareFlow-Type': notification.type,
          'X-SpareFlow-ID': notification.id
        }
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log(`Email sent successfully to ${recipientEmail}:`, result.messageId)
      return true
    } catch (error) {
      console.error(`Failed to send email to ${recipientEmail}:`, error)
      return false
    }
  }

  // Send bulk email notifications
  public async sendBulkNotifications(
    recipients: Array<{ email: string; name?: string; data?: any }>,
    notification: NotificationData
  ): Promise<{ success: number; failed: number; results: Array<{ email: string; success: boolean; error?: string }> }> {
    const results = []
    let success = 0
    let failed = 0

    for (const recipient of recipients) {
      try {
        const sent = await this.sendNotification(
          recipient.email,
          notification,
          recipient.name,
          recipient.data
        )
        
        if (sent) {
          success++
          results.push({ email: recipient.email, success: true })
        } else {
          failed++
          results.push({ email: recipient.email, success: false, error: 'Email service unavailable' })
        }
      } catch (error) {
        failed++
        results.push({ 
          email: recipient.email, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    console.log(`Bulk email results: ${success} sent, ${failed} failed`)
    return { success, failed, results }
  }

  // Send welcome email
  public async sendWelcomeEmail(
    recipientEmail: string,
    recipientName: string,
    userRole: string,
    loginUrl?: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      id: `welcome_${Date.now()}`,
      type: 'system',
      title: `Welcome to SpareFlow!`,
      message: `Hello ${recipientName}, welcome to SpareFlow! Your ${userRole} account has been created successfully. You can now access your dashboard and start managing your spare parts logistics.`,
      timestamp: new Date().toISOString(),
      priority: 'medium',
      actionUrl: loginUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/auth/login`,
      actionLabel: 'Access Dashboard',
      data: {
        userRole,
        accountType: userRole
      }
    }

    return this.sendNotification(recipientEmail, notification, recipientName)
  }

  // Send password reset email
  public async sendPasswordResetEmail(
    recipientEmail: string,
    recipientName: string,
    resetToken: string,
    resetUrl?: string
  ): Promise<boolean> {
    const finalResetUrl = resetUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/auth/reset-password?token=${resetToken}`
    
    const notification: NotificationData = {
      id: `password_reset_${Date.now()}`,
      type: 'system',
      title: 'Password Reset Request',
      message: `Hello ${recipientName}, you have requested to reset your password. Click the button below to reset your password. This link will expire in 1 hour for security reasons.`,
      timestamp: new Date().toISOString(),
      priority: 'high',
      actionUrl: finalResetUrl,
      actionLabel: 'Reset Password',
      data: {
        resetToken,
        expiresIn: '1 hour'
      }
    }

    return this.sendNotification(recipientEmail, notification, recipientName)
  }

  // Send order confirmation email
  public async sendOrderConfirmationEmail(
    recipientEmail: string,
    recipientName: string,
    orderData: any
  ): Promise<boolean> {
    const notification: NotificationData = {
      id: `order_confirmation_${orderData.id}_${Date.now()}`,
      type: 'order',
      title: 'Order Confirmation',
      message: `Hello ${recipientName}, your order #${orderData.id} has been confirmed. We'll notify you once your order is shipped.`,
      timestamp: new Date().toISOString(),
      priority: 'medium',
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=orders&order=${orderData.id}`,
      actionLabel: 'Track Order',
      data: {
        orderId: orderData.id,
        partName: orderData.partName,
        quantity: orderData.quantity,
        totalAmount: orderData.totalAmount,
        estimatedDelivery: orderData.estimatedDelivery
      }
    }

    return this.sendNotification(recipientEmail, notification, recipientName)
  }

  // Send shipment notification email
  public async sendShipmentNotificationEmail(
    recipientEmail: string,
    recipientName: string,
    shipmentData: any
  ): Promise<boolean> {
    const notification: NotificationData = {
      id: `shipment_notification_${shipmentData.id}_${Date.now()}`,
      type: 'shipment',
      title: 'Shipment Update',
      message: `Hello ${recipientName}, your shipment #${shipmentData.id} status has been updated to ${shipmentData.status}. ${shipmentData.awbNumber ? `Tracking number: ${shipmentData.awbNumber}` : ''}`,
      timestamp: new Date().toISOString(),
      priority: shipmentData.status === 'DELIVERED' ? 'high' : 'medium',
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=shipments&shipment=${shipmentData.id}`,
      actionLabel: 'Track Shipment',
      data: {
        shipmentId: shipmentData.id,
        status: shipmentData.status,
        awbNumber: shipmentData.awbNumber,
        numBoxes: shipmentData.numBoxes,
        estimatedDelivery: shipmentData.estimatedDelivery
      }
    }

    return this.sendNotification(recipientEmail, notification, recipientName)
  }

  // Send wallet transaction email
  public async sendWalletTransactionEmail(
    recipientEmail: string,
    recipientName: string,
    transactionData: any
  ): Promise<boolean> {
    const notification: NotificationData = {
      id: `wallet_transaction_${transactionData.id}_${Date.now()}`,
      type: 'wallet',
      title: `Wallet ${transactionData.type === 'DEBIT' ? 'Debited' : 'Credited'}`,
      message: `Hello ${recipientName}, ₹${transactionData.amount} has been ${transactionData.type === 'DEBIT' ? 'debited from' : 'credited to'} your wallet. Your current balance is ₹${transactionData.balanceAfter}.`,
      timestamp: new Date().toISOString(),
      priority: transactionData.type === 'DEBIT' ? 'medium' : 'low',
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spareflow.com'}/dashboard?tab=wallet`,
      actionLabel: 'View Wallet',
      data: {
        transactionId: transactionData.id,
        type: transactionData.type,
        amount: transactionData.amount,
        balanceAfter: transactionData.balanceAfter,
        reference: transactionData.reference,
        reason: transactionData.reason
      }
    }

    return this.sendNotification(recipientEmail, notification, recipientName)
  }
}

// Create singleton instance
const emailService = new EmailService()

export default emailService
export { EmailService, type EmailTemplateData }