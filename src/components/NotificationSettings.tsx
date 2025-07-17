import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Clock, 
  Settings, 
  Check, 
  X, 
  AlertTriangle,
  Send,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { NotificationPreferences } from '@/lib/notification-manager'

interface NotificationSettingsProps {
  className?: string
}

const priorityOptions = [
  { value: 'low', label: 'Low Priority', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-blue-500' },
  { value: 'high', label: 'High Priority', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent Priority', color: 'bg-red-500' }
]

const notificationTypes = [
  { value: 'shipment', label: 'Shipments', icon: '📦', description: 'Shipment creation and status updates' },
  { value: 'tracking', label: 'Tracking', icon: '🚚', description: 'Package tracking updates' },
  { value: 'order', label: 'Orders', icon: '🛒', description: 'Order confirmations and updates' },
  { value: 'reverse_request', label: 'Returns', icon: '↩️', description: 'Return request notifications' },
  { value: 'purchase_order', label: 'Purchase Orders', icon: '📋', description: 'Purchase order updates' },
  { value: 'wallet', label: 'Wallet', icon: '💰', description: 'Wallet transactions and balance updates' },
  { value: 'system', label: 'System', icon: '⚙️', description: 'System announcements and alerts' }
]

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [emailStatus, setEmailStatus] = useState<any>(null)

  // Load preferences on component mount
  useEffect(() => {
    loadPreferences()
    checkEmailStatus()
  }, [])

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      } else {
        toast.error('Failed to load notification preferences')
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast.error('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const checkEmailStatus = async () => {
    try {
      const response = await fetch('/api/notifications/email-status')
      if (response.ok) {
        const data = await response.json()
        setEmailStatus(data.emailService)
      }
    } catch (error) {
      console.error('Failed to check email status:', error)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    setSaving(true)
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences })
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
        toast.success('Notification preferences saved successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const sendTestNotification = async (type: string, priority: string = 'medium') => {
    setTesting(true)
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
        const data = await response.json()
        toast.success(`Test ${type} notification sent successfully`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send test notification')
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
      toast.error('Failed to send test notification')
    } finally {
      setTesting(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  const updateQuietHours = (field: string, value: string) => {
    if (!preferences) return
    const quietHours = preferences.quietHours || { start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' }
    setPreferences({
      ...preferences,
      quietHours: { ...quietHours, [field]: value }
    })
  }

  const togglePriority = (priority: string) => {
    if (!preferences) return
    const priorities = preferences.priorities.includes(priority as any)
      ? preferences.priorities.filter(p => p !== priority)
      : [...preferences.priorities, priority as any]
    updatePreference('priorities', priorities)
  }

  const toggleNotificationType = (type: string) => {
    if (!preferences) return
    const types = preferences.types.includes(type)
      ? preferences.types.filter(t => t !== type)
      : [...preferences.types, type]
    updatePreference('types', types)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading notification settings...
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load notification preferences. Please refresh the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendTestNotification('system')}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Test Notification
            </Button>
            <Button
              onClick={savePreferences}
              disabled={saving}
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="types">Types</TabsTrigger>
            <TabsTrigger value="priorities">Priorities</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
              
              {/* Email Status Alert */}
              {emailStatus && !emailStatus.configured && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Email notifications are not configured. Contact your administrator to set up email service.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <Label className="text-base font-medium">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                      {emailStatus && (
                        <Badge 
                          variant={emailStatus.configured ? 'default' : 'destructive'}
                          className="mt-1"
                        >
                          {emailStatus.configured ? 'Configured' : 'Not Configured'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={preferences.emailEnabled}
                    onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
                    disabled={emailStatus && !emailStatus.configured}
                  />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-green-500" />
                    <div>
                      <Label className="text-base font-medium">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive real-time notifications in your browser
                      </p>
                      <Badge variant="default" className="mt-1">
                        Always Available
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.pushEnabled}
                    onCheckedChange={(checked) => updatePreference('pushEnabled', checked)}
                  />
                </div>

                {/* SMS Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <div>
                      <Label className="text-base font-medium">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via SMS (coming soon)
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        Coming Soon
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.smsEnabled}
                    onCheckedChange={(checked) => updatePreference('smsEnabled', checked)}
                    disabled={true}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="types" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Notification Types</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose which types of notifications you want to receive
              </p>

              <div className="grid gap-4">
                {notificationTypes.map((type) => (
                  <div key={type.value} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{type.icon}</span>
                      <div>
                        <Label className="text-base font-medium">{type.label}</Label>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendTestNotification(type.value)}
                        disabled={testing}
                      >
                        Test
                      </Button>
                      <Checkbox
                        checked={preferences.types.includes(type.value)}
                        onCheckedChange={() => toggleNotificationType(type.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="priorities" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Priority Levels</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Select which priority levels you want to receive notifications for
              </p>

              <div className="grid gap-4">
                {priorityOptions.map((priority) => (
                  <div key={priority.value} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${priority.color}`} />
                      <div>
                        <Label className="text-base font-medium">{priority.label}</Label>
                        <p className="text-sm text-muted-foreground">
                          {priority.value === 'urgent' && 'Critical notifications that require immediate attention'}
                          {priority.value === 'high' && 'Important notifications that should be addressed soon'}
                          {priority.value === 'medium' && 'Standard notifications for regular updates'}
                          {priority.value === 'low' && 'Informational notifications and minor updates'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendTestNotification('system', priority.value)}
                        disabled={testing}
                      >
                        Test
                      </Button>
                      <Checkbox
                        checked={preferences.priorities.includes(priority.value as any)}
                        onCheckedChange={() => togglePriority(priority.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Quiet Hours</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Set quiet hours to avoid non-urgent notifications during specific times
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-medium">Enable Quiet Hours</Label>
                  <Switch
                    checked={!!preferences.quietHours}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updatePreference('quietHours', {
                          start: '22:00',
                          end: '08:00',
                          timezone: 'Asia/Kolkata'
                        })
                      } else {
                        updatePreference('quietHours', undefined)
                      }
                    }}
                  />
                </div>

                {preferences.quietHours && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid gap-4 p-4 border rounded-lg"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quiet-start">Start Time</Label>
                        <Input
                          id="quiet-start"
                          type="time"
                          value={preferences.quietHours.start}
                          onChange={(e) => updateQuietHours('start', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quiet-end">End Time</Label>
                        <Input
                          id="quiet-end"
                          type="time"
                          value={preferences.quietHours.end}
                          onChange={(e) => updateQuietHours('end', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={preferences.quietHours.timezone}
                        onValueChange={(value) => updateQuietHours('timezone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                          <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Urgent notifications will still be delivered during quiet hours.
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}