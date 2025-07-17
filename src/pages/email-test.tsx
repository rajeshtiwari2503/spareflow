import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Send, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Bell,
  MessageSquare,
  Clock,
  Zap
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
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

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

interface TestResult {
  id: string
  type: string
  status: 'success' | 'error' | 'pending'
  message: string
  timestamp: string
  details?: any
}

export default function EmailTestPage() {
  const { user } = useAuth()
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  // Test forms state
  const [quickTestForm, setQuickTestForm] = useState({
    type: 'system',
    priority: 'medium',
    forceEmail: true
  })

  const [customTestForm, setCustomTestForm] = useState({
    recipient: '',
    title: 'Custom Test Email',
    message: 'This is a custom test email from SpareFlow email testing system.',
    priority: 'medium',
    actionUrl: '',
    actionLabel: 'View Dashboard'
  })

  const [bulkTestForm, setBulkTestForm] = useState({
    recipients: '',
    title: 'Bulk Test Notification',
    message: 'This is a bulk test notification sent to multiple recipients.',
    priority: 'medium'
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

  const addTestResult = (result: Omit<TestResult, 'id' | 'timestamp'>) => {
    const newResult: TestResult = {
      ...result,
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }
    setTestResults(prev => [newResult, ...prev.slice(0, 9)]) // Keep last 10 results
  }

  const sendQuickTest = async () => {
    setTesting(true)
    addTestResult({
      type: `Quick Test (${quickTestForm.type})`,
      status: 'pending',
      message: 'Sending quick test notification...'
    })

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quickTestForm)
      })

      if (response.ok) {
        const data = await response.json()
        addTestResult({
          type: `Quick Test (${quickTestForm.type})`,
          status: 'success',
          message: 'Test notification sent successfully',
          details: data
        })
        toast.success('Quick test sent successfully')
      } else {
        const error = await response.json()
        addTestResult({
          type: `Quick Test (${quickTestForm.type})`,
          status: 'error',
          message: error.error || 'Failed to send test',
          details: error
        })
        toast.error(error.error || 'Failed to send quick test')
      }
    } catch (error) {
      addTestResult({
        type: `Quick Test (${quickTestForm.type})`,
        status: 'error',
        message: 'Network error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      toast.error('Failed to send quick test')
    } finally {
      setTesting(false)
    }
  }

  const sendDebugTest = async () => {
    setTesting(true)
    addTestResult({
      type: 'Debug Test',
      status: 'pending',
      message: 'Running comprehensive email service debug...'
    })

    try {
      console.log('Starting debug test...')
      
      const response = await fetch('/api/debug/email-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          testEmail: user?.email // Explicitly pass the test email
        })
      })

      console.log('Debug test response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Debug test response data:', data)
        
        addTestResult({
          type: 'Debug Test',
          status: data.tests?.emailSend?.passed ? 'success' : 'error',
          message: data.message || 'Debug test completed',
          details: data
        })
        
        if (data.tests?.emailSend?.passed) {
          toast.success('Debug test completed successfully - Email service is working!')
        } else {
          toast.error(`Debug test failed: ${data.tests?.emailSend?.error || 'Unknown error'}`)
        }
      } else {
        let errorMessage = 'Debug test failed'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
          console.error('Debug test API error:', error)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        
        addTestResult({
          type: 'Debug Test',
          status: 'error',
          message: errorMessage,
          details: { status: response.status, statusText: response.statusText }
        })
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Debug test network error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error'
      
      addTestResult({
        type: 'Debug Test',
        status: 'error',
        message: `Network error: ${errorMessage}`,
        details: { error: errorMessage }
      })
      toast.error(`Network error: ${errorMessage}`)
    } finally {
      console.log('Debug test completed, resetting testing state')
      setTesting(false)
    }
  }

  const sendCustomTest = async () => {
    if (!customTestForm.recipient || !customTestForm.title || !customTestForm.message) {
      toast.error('Please fill in all required fields')
      return
    }

    setTesting(true)
    addTestResult({
      type: 'Custom Test',
      status: 'pending',
      message: `Sending custom test to ${customTestForm.recipient}...`
    })

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'custom',
          title: customTestForm.title,
          message: customTestForm.message,
          priority: customTestForm.priority,
          actionUrl: customTestForm.actionUrl,
          actionLabel: customTestForm.actionLabel,
          forceEmail: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        addTestResult({
          type: 'Custom Test',
          status: 'success',
          message: `Custom test sent successfully to ${customTestForm.recipient}`,
          details: data
        })
        toast.success('Custom test sent successfully')
      } else {
        const error = await response.json()
        addTestResult({
          type: 'Custom Test',
          status: 'error',
          message: error.error || 'Failed to send custom test',
          details: error
        })
        toast.error(error.error || 'Failed to send custom test')
      }
    } catch (error) {
      addTestResult({
        type: 'Custom Test',
        status: 'error',
        message: 'Network error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      toast.error('Failed to send custom test')
    } finally {
      setTesting(false)
    }
  }

  const runAllTests = async () => {
    const testTypes = ['welcome', 'order', 'shipment', 'wallet', 'system']
    const priorities = ['low', 'medium', 'high', 'urgent']
    
    setTesting(true)
    addTestResult({
      type: 'Comprehensive Test Suite',
      status: 'pending',
      message: 'Running comprehensive email test suite...'
    })

    let successCount = 0
    let errorCount = 0

    for (const type of testTypes) {
      for (const priority of priorities) {
        try {
          const response = await fetch('/api/notifications/test', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type,
              priority,
              forceEmail: true
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }

          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          errorCount++
        }
      }
    }

    addTestResult({
      type: 'Comprehensive Test Suite',
      status: successCount > errorCount ? 'success' : 'error',
      message: `Completed: ${successCount} successful, ${errorCount} failed`,
      details: { successCount, errorCount, totalTests: testTypes.length * priorities.length }
    })

    if (successCount > errorCount) {
      toast.success(`Test suite completed: ${successCount}/${successCount + errorCount} successful`)
    } else {
      toast.error(`Test suite completed with errors: ${errorCount}/${successCount + errorCount} failed`)
    }

    setTesting(false)
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

  const getResultIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading email testing interface...
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <TestTube className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Email System Testing</h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive testing interface for SpareFlow's email notification system. 
              Test individual notifications, bulk sending, and system configuration.
            </p>
          </motion.div>

          {/* Email Status Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <CardTitle>Email Service Status</CardTitle>
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
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {emailStatus && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(emailStatus.connectionStatus)}
                        <div>
                          <Label className="text-base font-medium">Connection</Label>
                          <p className={`text-sm ${getStatusColor(emailStatus.connectionStatus)}`}>
                            {emailStatus.connectionStatus.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <div>
                          <Label className="text-base font-medium">Configuration</Label>
                          <p className="text-sm">
                            {emailStatus.configured ? 'Fully Configured' : 'Missing Config'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={emailStatus.configured ? 'default' : 'destructive'}>
                        {emailStatus.configured ? 'Ready' : 'Not Ready'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-green-600" />
                        <div>
                          <Label className="text-base font-medium">Test Status</Label>
                          <p className="text-sm">
                            {testing ? 'Testing in Progress' : 'Ready to Test'}
                          </p>
                        </div>
                      </div>
                      {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </div>
                )}

                {emailStatus?.connectionError && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Connection Error:</strong> {emailStatus.connectionError}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Testing Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Testing Controls */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      Email Testing Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="quick" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="quick">Quick Test</TabsTrigger>
                        <TabsTrigger value="custom">Custom Test</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Test</TabsTrigger>
                        <TabsTrigger value="suite">Test Suite</TabsTrigger>
                      </TabsList>

                      <TabsContent value="quick" className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-3">Quick Notification Test</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Send a pre-configured test notification to yourself
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Notification Type</Label>
                              <Select
                                value={quickTestForm.type}
                                onValueChange={(value) => setQuickTestForm({ ...quickTestForm, type: value })}
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
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Priority</Label>
                              <Select
                                value={quickTestForm.priority}
                                onValueChange={(value) => setQuickTestForm({ ...quickTestForm, priority: value })}
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

                          <div className="space-y-2 mt-4">
                            <Button
                              onClick={sendQuickTest}
                              disabled={testing || !emailStatus?.configured}
                              className="w-full"
                            >
                              {testing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Send Quick Test
                            </Button>
                            
                            <Button
                              onClick={sendDebugTest}
                              disabled={testing}
                              variant="outline"
                              className="w-full"
                            >
                              {testing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <TestTube className="h-4 w-4 mr-2" />
                              )}
                              Debug Email Service
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="custom" className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-3">Custom Email Test</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Send a custom notification with your own content
                          </p>
                          
                          <div className="space-y-4">
                            <div>
                              <Label>Recipient Email</Label>
                              <Input
                                type="email"
                                placeholder="test@example.com"
                                value={customTestForm.recipient}
                                onChange={(e) => setCustomTestForm({ ...customTestForm, recipient: e.target.value })}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Title</Label>
                                <Input
                                  placeholder="Email subject"
                                  value={customTestForm.title}
                                  onChange={(e) => setCustomTestForm({ ...customTestForm, title: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Priority</Label>
                                <Select
                                  value={customTestForm.priority}
                                  onValueChange={(value) => setCustomTestForm({ ...customTestForm, priority: value })}
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
                              <Label>Message</Label>
                              <Textarea
                                placeholder="Email content"
                                value={customTestForm.message}
                                onChange={(e) => setCustomTestForm({ ...customTestForm, message: e.target.value })}
                                rows={3}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Action URL (optional)</Label>
                                <Input
                                  placeholder="/dashboard"
                                  value={customTestForm.actionUrl}
                                  onChange={(e) => setCustomTestForm({ ...customTestForm, actionUrl: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Action Label (optional)</Label>
                                <Input
                                  placeholder="View Details"
                                  value={customTestForm.actionLabel}
                                  onChange={(e) => setCustomTestForm({ ...customTestForm, actionLabel: e.target.value })}
                                />
                              </div>
                            </div>

                            <Button
                              onClick={sendCustomTest}
                              disabled={testing || !emailStatus?.configured}
                              className="w-full"
                            >
                              {testing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Send Custom Test
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="bulk" className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-3">Bulk Email Test</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Send test emails to multiple recipients (coming soon)
                          </p>
                          
                          <Alert>
                            <MessageSquare className="h-4 w-4" />
                            <AlertDescription>
                              Bulk email testing feature is under development. Use individual tests for now.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </TabsContent>

                      <TabsContent value="suite" className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-3">Comprehensive Test Suite</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Run all notification types with all priority levels (20 total tests)
                          </p>
                          
                          <Alert className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              This will send 20 test emails to your account. Use sparingly to avoid spam.
                            </AlertDescription>
                          </Alert>

                          <Button
                            onClick={runAllTests}
                            disabled={testing || !emailStatus?.configured}
                            className="w-full"
                            variant="outline"
                          >
                            {testing ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Zap className="h-4 w-4 mr-2" />
                            )}
                            Run Complete Test Suite
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Test Results */}
              <div>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Test Results
                      </CardTitle>
                      {testResults.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTestResults([])}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Clear Results
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testResults.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No tests run yet</p>
                          <p className="text-sm">Start testing to see results here</p>
                        </div>
                      ) : (
                        testResults.map((result) => (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 p-3 border rounded-lg"
                          >
                            {getResultIcon(result.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{result.type}</p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(result.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {result.message}
                              </p>
                              {result.details && (
                                <details className="mt-2">
                                  <summary className="text-xs cursor-pointer text-blue-600">
                                    View Details
                                  </summary>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                    {JSON.stringify(result.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>

          {/* User Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    Testing as: <strong>{user?.name}</strong> ({user?.email}) - Role: <strong>{user?.role}</strong>
                  </div>
                  <div>
                    All test emails will be sent to your registered email address
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  )
}