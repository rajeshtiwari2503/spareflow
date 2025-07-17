# Critical Fixes Implementation Plan
## SpareFlow System Perfection Roadmap

---

## 🚨 Priority 1: Authentication Standardization

### **Current Problem:**
Each dashboard uses different authentication patterns, causing inconsistent user experience and potential security issues.

### **Solution: Unified Authentication System**

#### **Step 1: Create Unified Auth Hook**
```typescript
// src/hooks/useUnifiedAuth.tsx
import { createContext, useContext, useEffect, useState } from 'react';

interface UnifiedAuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  loading: boolean;
  authStatus: AuthStatus;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const UnifiedAuthContext = createContext<UnifiedAuthState | null>(null);

export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth must be used within UnifiedAuthProvider');
  }
  return context;
}

export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<UnifiedAuthState>({
    user: null,
    isAuthenticated: false,
    isAuthorized: false,
    loading: true,
    authStatus: null,
    login: async () => {},
    logout: async () => {},
    refreshAuth: async () => {}
  });

  // Unified authentication logic here
  return (
    <UnifiedAuthContext.Provider value={authState}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}
```

#### **Step 2: Standardize All Dashboards**
Replace existing auth patterns in all dashboard files:

```typescript
// Apply to all dashboard files
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

export default function Dashboard() {
  const { user, isAuthenticated, isAuthorized, loading, logout } = useUnifiedAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <LoginRedirect />;
  if (!isAuthorized) return <UnauthorizedAccess />;
  
  // Dashboard content
}
```

---

## 🚨 Priority 2: Unified API Client

### **Current Problem:**
Different dashboards use different methods to make API calls, leading to inconsistent error handling and token management.

### **Solution: Centralized API Client**

```typescript
// src/lib/unified-api-client.ts
export class UnifiedAPIClient {
  private static instance: UnifiedAPIClient;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  static getInstance(): UnifiedAPIClient {
    if (!UnifiedAPIClient.instance) {
      UnifiedAPIClient.instance = new UnifiedAPIClient();
    }
    return UnifiedAPIClient.instance;
  }

  private getAuthToken(): string | null {
    // Unified token extraction logic
    if (typeof window === 'undefined') return null;
    
    // Try multiple sources
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    
    const localStorageToken = localStorage.getItem('token');
    const sessionStorageToken = sessionStorage.getItem('token');
    
    return cookieToken || localStorageToken || sessionStorageToken;
  }

  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<StandardAPIResponse<T>> {
    const token = this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        throw new APIError(response.status, response.statusText);
      }
      
      const data = await response.json();
      return this.formatResponse(data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Convenience methods
  async get<T>(endpoint: string): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private formatResponse<T>(data: any): StandardAPIResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    };
  }

  private handleError(error: any): APIError {
    if (error instanceof APIError) {
      return error;
    }
    
    return new APIError(500, 'Internal Server Error', error.message);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const apiClient = UnifiedAPIClient.getInstance();
```

---

## 🚨 Priority 3: Real-Time Data Synchronization

### **Current Problem:**
Dashboards don't update in real-time when data changes in other parts of the system.

### **Solution: WebSocket-Based Real-Time Updates**

```typescript
// src/lib/real-time-manager.ts
export class RealTimeManager {
  private static instance: RealTimeManager;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  static getInstance(): RealTimeManager {
    if (!RealTimeManager.instance) {
      RealTimeManager.instance = new RealTimeManager();
    }
    return RealTimeManager.instance;
  }

  connect(userId: string, userRole: string): void {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?userId=${userId}&role=${userRole}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(userId, userRole);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  subscribe(eventType: string, callback: Function): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  unsubscribe(eventType: string, callback: Function): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private handleMessage(data: any): void {
    const { type, payload } = data;
    const callbacks = this.listeners.get(type);
    
    if (callbacks) {
      callbacks.forEach(callback => callback(payload));
    }
  }

  private attemptReconnect(userId: string, userRole: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(userId, userRole);
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Hook for using real-time updates
export function useRealTimeUpdates(eventTypes: string[]) {
  const [updates, setUpdates] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const rtm = RealTimeManager.getInstance();
    
    const handleUpdate = (eventType: string) => (payload: any) => {
      setUpdates(prev => ({
        ...prev,
        [eventType]: payload
      }));
    };
    
    eventTypes.forEach(eventType => {
      rtm.subscribe(eventType, handleUpdate(eventType));
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        rtm.unsubscribe(eventType, handleUpdate(eventType));
      });
    };
  }, [eventTypes]);
  
  return updates;
}
```

---

## 🚨 Priority 4: Unified Inventory Management

### **Current Problem:**
Each role has its own inventory view without real-time synchronization across the system.

### **Solution: Global Inventory State Management**

```typescript
// src/lib/inventory-manager.ts
export class InventoryManager {
  private static instance: InventoryManager;
  private cache: Map<string, InventoryItem> = new Map();
  private subscribers: Set<Function> = new Set();

  static getInstance(): InventoryManager {
    if (!InventoryManager.instance) {
      InventoryManager.instance = new InventoryManager();
    }
    return InventoryManager.instance;
  }

  async getGlobalInventory(partId: string): Promise<GlobalInventoryView> {
    const cached = this.cache.get(partId);
    
    if (cached && this.isCacheValid(cached)) {
      return this.buildGlobalView(cached);
    }

    const inventory = await this.fetchGlobalInventory(partId);
    this.cache.set(partId, inventory);
    
    return this.buildGlobalView(inventory);
  }

  async updateInventory(
    partId: string, 
    locationId: string, 
    locationType: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
    newQuantity: number
  ): Promise<void> {
    // Update local cache
    const current = this.cache.get(partId);
    if (current) {
      current.locations[`${locationType}_${locationId}`] = newQuantity;
      current.lastUpdated = new Date();
    }

    // Update database
    await apiClient.put(`/api/inventory/${partId}`, {
      locationId,
      locationType,
      quantity: newQuantity
    });

    // Notify all subscribers
    this.notifySubscribers(partId, newQuantity, locationType, locationId);
  }

  subscribe(callback: Function): void {
    this.subscribers.add(callback);
  }

  unsubscribe(callback: Function): void {
    this.subscribers.delete(callback);
  }

  private async fetchGlobalInventory(partId: string): Promise<InventoryItem> {
    const response = await apiClient.get(`/api/inventory/global/${partId}`);
    return response.data;
  }

  private buildGlobalView(inventory: InventoryItem): GlobalInventoryView {
    return {
      partId: inventory.partId,
      totalStock: this.calculateTotalStock(inventory),
      brandStock: this.getBrandStock(inventory),
      distributorStock: this.getDistributorStock(inventory),
      serviceCenterStock: this.getServiceCenterStock(inventory),
      inTransitStock: this.getInTransitStock(inventory),
      availability: this.determineAvailability(inventory),
      estimatedDelivery: this.calculateEstimatedDelivery(inventory)
    };
  }

  private notifySubscribers(
    partId: string, 
    newQuantity: number, 
    locationType: string, 
    locationId: string
  ): void {
    const update = {
      partId,
      newQuantity,
      locationType,
      locationId,
      timestamp: new Date()
    };

    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error notifying inventory subscriber:', error);
      }
    });
  }

  private isCacheValid(item: InventoryItem): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - item.lastUpdated.getTime() < maxAge;
  }
}

// Hook for using global inventory
export function useGlobalInventory(partId: string) {
  const [inventory, setInventory] = useState<GlobalInventoryView | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const inventoryManager = InventoryManager.getInstance();
    
    const loadInventory = async () => {
      try {
        const data = await inventoryManager.getGlobalInventory(partId);
        setInventory(data);
      } catch (error) {
        console.error('Error loading inventory:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const handleInventoryUpdate = (update: any) => {
      if (update.partId === partId) {
        loadInventory(); // Refresh data
      }
    };
    
    inventoryManager.subscribe(handleInventoryUpdate);
    loadInventory();
    
    return () => {
      inventoryManager.unsubscribe(handleInventoryUpdate);
    };
  }, [partId]);
  
  return { inventory, loading };
}
```

---

## 🚨 Priority 5: Cross-Dashboard Notifications

### **Current Problem:**
Actions in one dashboard don't notify relevant users in other dashboards.

### **Solution: Unified Notification System**

```typescript
// src/lib/notification-hub.ts
export class NotificationHub {
  private static instance: NotificationHub;
  private rtm: RealTimeManager;

  constructor() {
    this.rtm = RealTimeManager.getInstance();
  }

  static getInstance(): NotificationHub {
    if (!NotificationHub.instance) {
      NotificationHub.instance = new NotificationHub();
    }
    return NotificationHub.instance;
  }

  async notifyShipmentCreated(shipment: Shipment): Promise<void> {
    const notifications = [
      {
        type: 'SHIPMENT_CREATED',
        recipients: [shipment.brandId],
        title: 'Shipment Created',
        message: `Shipment ${shipment.awbNumber} has been created and is ready for dispatch.`,
        data: { shipmentId: shipment.id, awbNumber: shipment.awbNumber }
      },
      {
        type: 'SHIPMENT_INCOMING',
        recipients: [shipment.serviceCenterId],
        title: 'Incoming Shipment',
        message: `You have an incoming shipment ${shipment.awbNumber}. Expected delivery: ${shipment.estimatedDelivery}`,
        data: { shipmentId: shipment.id, awbNumber: shipment.awbNumber }
      }
    ];

    await this.sendNotifications(notifications);
  }

  async notifyInventoryLow(partId: string, currentStock: number, minLevel: number): Promise<void> {
    const part = await this.getPartDetails(partId);
    const relevantUsers = await this.getRelevantUsers('INVENTORY_LOW', partId);

    const notification = {
      type: 'INVENTORY_LOW',
      recipients: relevantUsers,
      title: 'Low Stock Alert',
      message: `${part.name} is running low. Current stock: ${currentStock}, Minimum level: ${minLevel}`,
      priority: 'HIGH',
      data: { partId, currentStock, minLevel }
    };

    await this.sendNotifications([notification]);
  }

  async notifyOrderStatusChange(orderId: string, newStatus: string): Promise<void> {
    const order = await this.getOrderDetails(orderId);
    const customer = await this.getCustomerDetails(order.customerId);

    const notification = {
      type: 'ORDER_STATUS_CHANGE',
      recipients: [order.customerId],
      title: 'Order Status Update',
      message: `Your order ${order.orderNumber} status has been updated to: ${newStatus}`,
      data: { orderId, newStatus, orderNumber: order.orderNumber }
    };

    await this.sendNotifications([notification]);
  }

  private async sendNotifications(notifications: NotificationRequest[]): Promise<void> {
    await Promise.all(notifications.map(async (notification) => {
      // Send real-time notification
      this.rtm.broadcast('NOTIFICATION', notification);
      
      // Store in database for persistence
      await this.storeNotification(notification);
      
      // Send email if high priority
      if (notification.priority === 'HIGH' || notification.priority === 'CRITICAL') {
        await this.sendEmailNotification(notification);
      }
      
      // Send WhatsApp for critical notifications
      if (notification.priority === 'CRITICAL') {
        await this.sendWhatsAppNotification(notification);
      }
    }));
  }

  private async getRelevantUsers(notificationType: string, contextId: string): Promise<string[]> {
    // Logic to determine which users should receive specific notifications
    switch (notificationType) {
      case 'INVENTORY_LOW':
        return this.getInventoryStakeholders(contextId);
      case 'SHIPMENT_CREATED':
        return this.getShipmentStakeholders(contextId);
      default:
        return [];
    }
  }
}

// Hook for using notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const rtm = RealTimeManager.getInstance();
    
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    
    rtm.subscribe('NOTIFICATION', handleNotification);
    
    // Load existing notifications
    loadNotifications();
    
    return () => {
      rtm.unsubscribe('NOTIFICATION', handleNotification);
    };
  }, []);
  
  const markAsRead = async (notificationId: string) => {
    await apiClient.put(`/api/notifications/${notificationId}/read`);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  const markAllAsRead = async () => {
    await apiClient.put('/api/notifications/mark-all-read');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}
```

---

## 📋 Implementation Checklist

### **Week 1: Foundation**
- [ ] Implement UnifiedAuthProvider
- [ ] Create UnifiedAPIClient
- [ ] Update all dashboard files to use unified auth
- [ ] Test authentication flow across all roles

### **Week 2: Real-Time Infrastructure**
- [ ] Set up WebSocket server
- [ ] Implement RealTimeManager
- [ ] Add real-time hooks to all dashboards
- [ ] Test real-time updates

### **Week 3: Inventory Synchronization**
- [ ] Implement InventoryManager
- [ ] Create global inventory views
- [ ] Update all inventory-related components
- [ ] Test cross-dashboard inventory updates

### **Week 4: Notification System**
- [ ] Implement NotificationHub
- [ ] Add notification components to all dashboards
- [ ] Set up email and WhatsApp integrations
- [ ] Test notification delivery

### **Week 5: Testing & Optimization**
- [ ] Comprehensive testing across all user roles
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates

---

## 🎯 Success Criteria

1. **Authentication:** All dashboards use identical auth patterns
2. **API Calls:** All API requests go through unified client
3. **Real-Time Updates:** Changes in one dashboard immediately reflect in others
4. **Inventory:** Global inventory view available to all relevant roles
5. **Notifications:** Cross-dashboard notifications work seamlessly
6. **Performance:** No degradation in dashboard load times
7. **Error Handling:** Consistent error messages and recovery across all dashboards

This implementation plan will transform SpareFlow into a truly integrated, systematically perfect platform where all components work in harmony.