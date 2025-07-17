import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Send, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface EmailStatus {
  configured: boolean
  connectionStatus: string
  connectionError?: string
  environmentVariables: {
    EMAIL_HOST: boolean
    EMAIL_PORT: boolean
    EMAIL_USER: boolean
    EMAIL_PASS: boolean
    EMAIL_FROM: boolean
    EMAIL_SECURE: string
  }
  missingConfiguration: string[]
  recommendations: any
}

interface AdminEmailManagerProps {
  className?: string
}

export function AdminEmailManager({ className }: AdminEmailManagerProps) {
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  // Test email form state
  const [testForm, setTestForm] = useState({
    type: 'system',
    priority: 'medium',
    recipient: '',
    customTitle: '',
    customMessage: '',
    forceEmail: true
  })

  // Bulk notification form state
  const [bulkForm, setBulkForm] = useState({
    targetRole: '',
    title: '',
    message: '',
    priority: 'medium',
    actionUrl: '',
    actionLabel: ''
  })

  useEffect(() => {
    loadEmailStatus()
  }, [])

  const loadEmailStatus = async () => {
    try {
      const response = await fetch('/api/notifications/email-status')
      if (response.ok) {
        const data = await response.json()
        setEmailStatus(data.emailService)
      } else {
        toast.error('Failed to load email status')
      }
    } catch (error) {
      console.error('Failed to load email status:', error)
      toast.error('Failed to load email status')
    } finally {
      setLoading(false)
    }
  }

  const refreshEmailStatus = async () => {
    setRefreshing(true)
    await loadEmailStatus()
    setRefreshing(false)
    toast.success('Email status refreshed')
  }

  const sendTestEmail = async () => {
    if (!testForm.recipient) {
      toast.error('Please enter a recipient email')
      return
    }

    setTesting(true)
    try {
      const payload: any = {
        type: testForm.type,
        priority: testForm.priority,
        forceEmail: testForm.forceEmail
      }

      if (testForm.type === 'custom') {
        payload.title = testForm.customTitle
        payload.message = testForm.customMessage
      }

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Test email sent successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Failed to send test email:', error)
      toast.error('Failed to send test email')
    } finally {
      setTesting(false)
    }
  }

  const sendBulkNotification = async () => {
    if (!bulkForm.title || !bulkForm.message) {
      toast.error('Please fill in title and message')
      return
    }

    setTesting(true)
    try {
      // This would need a new API endpoint for bulk notifications
      toast.info('Bulk notification feature coming soon')
    } catch (error) {
      console.error('Failed to send bulk notification:', error)
      toast.error('Failed to send bulk notification')
    } finally {
      setTesting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'not_configured': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
      case 'not_configured': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading email configuration...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Notification Manager</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshEmailStatus}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Status
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="test">Test Email</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Notifications</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Email Service Status</h3>
              
              {emailStatus && (
                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(emailStatus.connectionStatus)}
                      <div>
                        <Label className="text-base font-medium">Connection Status</Label>
                        <p className={`text-sm ${getStatusColor(emailStatus.connectionStatus)}`}>
                          {emailStatus.connectionStatus.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={emailStatus.configured ? 'default' : 'destructive'}
                    >
                      {emailStatus.configured ? 'Configured' : 'Not Configured'}
                    </Badge>
                  </div>

                  {/* Connection Error */}
                  {emailStatus.connectionError && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Connection Error:</strong> {emailStatus.connectionError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Environment Variables Status */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Environment Variables</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(emailStatus.environmentVariables).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm font-mono">{key}</span>
                          {typeof value === 'boolean' ? (
                            value ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing Configuration */}
                  {emailStatus.missingConfiguration.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Missing Configuration:</strong> {emailStatus.missingConfiguration.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Send Test Email</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test-recipient">Recipient Email</Label>
                    <Input
                      id="test-recipient"
                      type="email"
                      placeholder="test@example.com"
                      value={testForm.recipient}
                      onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-type">Notification Type</Label>
                    <Select
                      value={testForm.type}
                      onValueChange={(value) => setTestForm({ ...testForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="order">Order</SelectItem>
                        <SelectItem value="shipment">Shipment</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="test-priority">Priority</Label>
                  <Select
                    value={testForm.priority}
                    onValueChange={(value) => setTestForm({ ...testForm, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {testForm.type === 'custom' && (
                  <>
                    <div>
                      <Label htmlFor="custom-title">Custom Title</Label>
                      <Input
                        id="custom-title"
                        placeholder="Enter notification title"
                        value={testForm.customTitle}
                        onChange={(e) => setTestForm({ ...testForm, customTitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom-message">Custom Message</Label>
                      <Textarea
                        id="custom-message"
                        placeholder="Enter notification message"
                        value={testForm.customMessage}
                        onChange={(e) => setTestForm({ ...testForm, customMessage: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={testForm.forceEmail}
                    onCheckedChange={(checked) => setTestForm({ ...testForm, forceEmail: checked })}
                  />
                  <Label>Force email delivery (ignore user preferences)</Label>
                </div>

                <Button
                  onClick={sendTestEmail}
                  disabled={testing || !emailStatus?.configured}
                  className="w-full"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Test Email
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Bulk Notifications</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Send notifications to multiple users based on their role
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-role">Target Role</Label>
                  <Select
                    value={bulkForm.targetRole}
                    onValueChange={(value) => setBulkForm({ ...bulkForm, targetRole: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="brand">Brands</SelectItem>
                      <SelectItem value="distributor">Distributors</SelectItem>
                      <SelectItem value="service_center">Service Centers</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-title">Title</Label>
                    <Input
                      id="bulk-title"
                      placeholder="Notification title"
                      value={bulkForm.title}
                      onChange={(e) => setBulkForm({ ...bulkForm, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-priority">Priority</Label>
                    <Select
                      value={bulkForm.priority}
                      onValueChange={(value) => setBulkForm({ ...bulkForm, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bulk-message">Message</Label>
                  <Textarea
                    id="bulk-message"
                    placeholder="Notification message"
                    value={bulkForm.message}
                    onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-action-url">Action URL (optional)</Label>
                    <Input
                      id="bulk-action-url"
                      placeholder="/dashboard"
                      value={bulkForm.actionUrl}
                      onChange={(e) => setBulkForm({ ...bulkForm, actionUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-action-label">Action Label (optional)</Label>
                    <Input
                      id="bulk-action-label"
                      placeholder="View Details"
                      value={bulkForm.actionLabel}
                      onChange={(e) => setBulkForm({ ...bulkForm, actionLabel: e.target.value })}
                    />
                  </div>
                </div>

                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    This will send notifications to all users in the selected role. Use with caution.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={sendBulkNotification}
                  disabled={testing || !emailStatus?.configured}
                  className="w-full"
                  variant="outline"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Send Bulk Notification (Coming Soon)
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Email Configuration Guide</h3>
              
              {emailStatus?.recommendations && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Required Environment Variables</h4>
                    <div className="space-y-2">
                      {emailStatus.recommendations.required.map((req: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <code className="bg-muted px-2 py-1 rounded">{req}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Optional Environment Variables</h4>
                    <div className="space-y-2">
                      {emailStatus.recommendations.optional.map((opt: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <code className="bg-muted px-2 py-1 rounded">{opt}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Configuration Examples</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? (
                          <EyeOff className="h-4 w-4 mr-2" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        {showPasswords ? 'Hide' : 'Show'} Passwords
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {Object.entries(emailStatus.recommendations.examples).map(([provider, config]: [string, any]) => (
                        <div key={provider} className="border rounded-lg p-4">
                          <h5 className="font-medium mb-2 capitalize">{provider}</h5>
                          <div className="space-y-2">
                            {Object.entries(config).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex items-center gap-2 text-sm font-mono">
                                <span className="text-muted-foreground">{key}=</span>
                                <span className="bg-muted px-2 py-1 rounded">
                                  {key.includes('PASS') && !showPasswords ? '••••••••' : value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}