import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  Check,
  X,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Trash2,
  MarkAsUnread,
  Filter,
  Search,
  Send,
  Plus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Zap,
  Target,
  Users,
  Package,
  Truck,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Archive,
  Star,
  Calendar
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'shipment' | 'inventory' | 'payment' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  archived: boolean;
  starred: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    shipmentId?: string;
    partId?: string;
    orderId?: string;
    amount?: number;
  };
}

interface NotificationPreferences {
  email: {
    enabled: boolean;
    shipments: boolean;
    inventory: boolean;
    payments: boolean;
    system: boolean;
    marketing: boolean;
  };
  push: {
    enabled: boolean;
    shipments: boolean;
    inventory: boolean;
    payments: boolean;
    system: boolean;
  };
  sms: {
    enabled: boolean;
    urgent: boolean;
    shipments: boolean;
    payments: boolean;
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
}

interface EnhancedBrandNotificationSystemProps {
  brandId: string;
  onNavigate?: (tab: string) => void;
}

const EnhancedBrandNotificationSystem: React.FC<EnhancedBrandNotificationSystemProps> = ({
  brandId,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('notifications');
  const { toast } = useToast();

  // WebSocket connection for real-time notifications
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
    setupWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [brandId]);

  const setupWebSocket = () => {
    try {
      const websocket = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/api/socket`);
      
      websocket.onopen = () => {
        console.log('WebSocket connected for notifications');
        websocket.send(JSON.stringify({ 
          type: 'subscribe', 
          channel: `brand-${brandId}` 
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            handleNewNotification(data.notification);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
      };

      setWs(websocket);
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Show toast for high priority notifications
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default'
      });
    }

    // Play sound if enabled
    if (preferences?.inApp.sound) {
      playNotificationSound();
    }

    // Show desktop notification if enabled and permission granted
    if (preferences?.inApp.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?brandId=${brandId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`/api/notifications/preferences?brandId=${brandId}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      } else {
        // Set default preferences
        setPreferences({
          email: {
            enabled: true,
            shipments: true,
            inventory: true,
            payments: true,
            system: true,
            marketing: false
          },
          push: {
            enabled: true,
            shipments: true,
            inventory: true,
            payments: true,
            system: false
          },
          sms: {
            enabled: false,
            urgent: true,
            shipments: false,
            payments: true
          },
          inApp: {
            enabled: true,
            sound: true,
            desktop: true
          }
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      const response = await fetch(`/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, preferences: newPreferences })
      });

      if (response.ok) {
        setPreferences(newPreferences);
        toast({
          title: "Preferences Updated",
          description: "Your notification preferences have been saved"
        });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive"
      });
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, read: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAsUnread = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/mark-unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, read: false } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking as unread:', error);
    }
  };

  const archiveNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, archived: true } : n
          )
        );
        setSelectedNotifications([]);
        toast({
          title: "Notifications Archived",
          description: `${notificationIds.length} notification(s) archived`
        });
      }
    } catch (error) {
      console.error('Error archiving notifications:', error);
    }
  };

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(n => !notificationIds.includes(n.id))
        );
        setSelectedNotifications([]);
        toast({
          title: "Notifications Deleted",
          description: `${notificationIds.length} notification(s) deleted`
        });
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const toggleStar = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;

      const response = await fetch(`/api/notifications/${notificationId}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !notification.starred })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, starred: !n.starred } : n
          )
        );
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive desktop notifications"
        });
      }
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'starred' && !notification.starred) return false;
    if (filter === 'archived' && !notification.archived) return false;
    if (filter !== 'all' && filter !== 'unread' && filter !== 'starred' && filter !== 'archived' && notification.type !== filter) return false;
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shipment': return <Truck className="w-4 h-4" />;
      case 'inventory': return <Package className="w-4 h-4" />;
      case 'payment': return <DollarSign className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 border-red-200 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h2>
          <p className="text-gray-600">Manage your notifications and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchNotifications} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={requestNotificationPermission} variant="outline" size="sm">
            <BellRing className="w-4 h-4 mr-2" />
            Enable Desktop
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="starred">Starred</SelectItem>
                  <SelectItem value="shipment">Shipments</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            {selectedNotifications.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedNotifications.length} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsRead(selectedNotifications)}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Mark Read
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => archiveNotifications(selectedNotifications)}
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteNotifications(selectedNotifications)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-600">
                    {filter === 'all' ? 'You have no notifications' : `No ${filter} notifications found`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md ${
                    !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                  } ${selectedNotifications.includes(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotifications(prev => [...prev, notification.id]);
                          } else {
                            setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                          }
                        }}
                        className="mt-1"
                      />
                      
                      <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {notification.type}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${
                                notification.priority === 'urgent' ? 'border-red-300 text-red-700' :
                                notification.priority === 'high' ? 'border-orange-300 text-orange-700' :
                                notification.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                'border-gray-300 text-gray-700'
                              }`}>
                                {notification.priority}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleStar(notification.id)}
                            >
                              <Star className={`w-4 h-4 ${notification.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => notification.read ? markAsUnread([notification.id]) : markAsRead([notification.id])}
                            >
                              {notification.read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            
                            {notification.actionUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (notification.actionUrl?.startsWith('/')) {
                                    onNavigate?.(notification.actionUrl.split('/')[1]);
                                  } else {
                                    window.open(notification.actionUrl, '_blank');
                                  }
                                  markAsRead([notification.id]);
                                }}
                              >
                                {notification.actionLabel || 'View'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {preferences && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>Configure email notification settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                    <Switch
                      id="email-enabled"
                      checked={preferences.email.enabled}
                      onCheckedChange={(checked) => 
                        updatePreferences({
                          ...preferences,
                          email: { ...preferences.email, enabled: checked }
                        })
                      }
                    />
                  </div>
                  
                  {preferences.email.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-shipments">Shipment Updates</Label>
                        <Switch
                          id="email-shipments"
                          checked={preferences.email.shipments}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              email: { ...preferences.email, shipments: checked }
                            })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-inventory">Inventory Alerts</Label>
                        <Switch
                          id="email-inventory"
                          checked={preferences.email.inventory}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              email: { ...preferences.email, inventory: checked }
                            })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-payments">Payment Notifications</Label>
                        <Switch
                          id="email-payments"
                          checked={preferences.email.payments}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              email: { ...preferences.email, payments: checked }
                            })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-system">System Updates</Label>
                        <Switch
                          id="email-system"
                          checked={preferences.email.system}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              email: { ...preferences.email, system: checked }
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Push Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>Configure push notification settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                    <Switch
                      id="push-enabled"
                      checked={preferences.push.enabled}
                      onCheckedChange={(checked) => 
                        updatePreferences({
                          ...preferences,
                          push: { ...preferences.push, enabled: checked }
                        })
                      }
                    />
                  </div>
                  
                  {preferences.push.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-shipments">Shipment Updates</Label>
                        <Switch
                          id="push-shipments"
                          checked={preferences.push.shipments}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              push: { ...preferences.push, shipments: checked }
                            })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-inventory">Inventory Alerts</Label>
                        <Switch
                          id="push-inventory"
                          checked={preferences.push.inventory}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              push: { ...preferences.push, inventory: checked }
                            })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-payments">Payment Notifications</Label>
                        <Switch
                          id="push-payments"
                          checked={preferences.push.payments}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              push: { ...preferences.push, payments: checked }
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* In-App Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    In-App Notifications
                  </CardTitle>
                  <CardDescription>Configure in-app notification behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inapp-sound">Notification Sound</Label>
                    <Switch
                      id="inapp-sound"
                      checked={preferences.inApp.sound}
                      onCheckedChange={(checked) => 
                        updatePreferences({
                          ...preferences,
                          inApp: { ...preferences.inApp, sound: checked }
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inapp-desktop">Desktop Notifications</Label>
                    <Switch
                      id="inapp-desktop"
                      checked={preferences.inApp.desktop}
                      onCheckedChange={(checked) => 
                        updatePreferences({
                          ...preferences,
                          inApp: { ...preferences.inApp, desktop: checked }
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* SMS Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    SMS Notifications
                  </CardTitle>
                  <CardDescription>Configure SMS notification settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                    <Switch
                      id="sms-enabled"
                      checked={preferences.sms.enabled}
                      onCheckedChange={(checked) => 
                        updatePreferences({
                          ...preferences,
                          sms: { ...preferences.sms, enabled: checked }
                        })
                      }
                    />
                  </div>
                  
                  {preferences.sms.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-urgent">Urgent Notifications Only</Label>
                        <Switch
                          id="sms-urgent"
                          checked={preferences.sms.urgent}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              sms: { ...preferences.sms, urgent: checked }
                            })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-payments">Payment Notifications</Label>
                        <Switch
                          id="sms-payments"
                          checked={preferences.sms.payments}
                          onCheckedChange={(checked) => 
                            updatePreferences({
                              ...preferences,
                              sms: { ...preferences.sms, payments: checked }
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>Customize notification templates for your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Template Management</h3>
                <p className="text-gray-600 mb-4">
                  Customize notification templates for different events and recipients
                </p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedBrandNotificationSystem;