// Real-Time Manager for WebSocket connections and live updates
export interface RealTimeUpdate {
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
  userRole?: string;
}

export class RealTimeManager {
  private static instance: RealTimeManager;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private userId: string | null = null;
  private userRole: string | null = null;

  static getInstance(): RealTimeManager {
    if (!RealTimeManager.instance) {
      RealTimeManager.instance = new RealTimeManager();
    }
    return RealTimeManager.instance;
  }

  connect(userId: string, userRole: string): void {
    this.userId = userId;
    this.userRole = userRole;
    
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    
    // Use secure WebSocket in production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/socket?userId=${userId}&role=${userRole}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        
        // Notify listeners about connection
        this.notifyListeners('CONNECTION_ESTABLISHED', { userId, userRole });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.connectionState = 'disconnected';
        
        // Notify listeners about disconnection
        this.notifyListeners('CONNECTION_LOST', { code: event.code, reason: event.reason });
        
        // Attempt reconnection if not intentional
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionState = 'error';
        
        // Notify listeners about error
        this.notifyListeners('CONNECTION_ERROR', { error });
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.connectionState = 'error';
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
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

  // Send message to server
  send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: RealTimeUpdate = {
        type,
        payload,
        timestamp: new Date().toISOString(),
        userId: this.userId || undefined,
        userRole: this.userRole || undefined
      };
      
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', type, payload);
    }
  }

  // Broadcast to all connected clients (server-side functionality)
  broadcast(type: string, payload: any): void {
    this.send('BROADCAST', { type, payload });
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  private handleMessage(data: RealTimeUpdate): void {
    const { type, payload } = data;
    
    // Handle system messages
    if (type === 'PING') {
      this.send('PONG', {});
      return;
    }
    
    // Notify all listeners for this event type
    this.notifyListeners(type, payload);
    
    // Also notify global listeners
    this.notifyListeners('*', data);
  }

  private notifyListeners(eventType: string, payload: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${eventType}:`, error);
        }
      });
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionState = 'error';
      this.notifyListeners('MAX_RECONNECT_ATTEMPTS_REACHED', {});
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      if (this.userId && this.userRole) {
        this.connect(this.userId, this.userRole);
      }
    }, delay);
  }
}

// React hook for using real-time updates
import { useEffect, useState } from 'react';

export function useRealTimeUpdates(eventTypes: string[]) {
  const [updates, setUpdates] = useState<Record<string, any>>({});
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  
  useEffect(() => {
    const rtm = RealTimeManager.getInstance();
    
    // Update connection state
    setConnectionState(rtm.getConnectionState());
    
    const handleUpdate = (eventType: string) => (payload: any) => {
      setUpdates(prev => ({
        ...prev,
        [eventType]: {
          data: payload,
          timestamp: new Date().toISOString()
        }
      }));
    };
    
    const handleConnectionChange = (state: string) => {
      setConnectionState(state);
    };
    
    // Subscribe to specified event types
    eventTypes.forEach(eventType => {
      rtm.subscribe(eventType, handleUpdate(eventType));
    });
    
    // Subscribe to connection events
    rtm.subscribe('CONNECTION_ESTABLISHED', () => handleConnectionChange('connected'));
    rtm.subscribe('CONNECTION_LOST', () => handleConnectionChange('disconnected'));
    rtm.subscribe('CONNECTION_ERROR', () => handleConnectionChange('error'));
    
    return () => {
      // Cleanup subscriptions
      eventTypes.forEach(eventType => {
        rtm.unsubscribe(eventType, handleUpdate(eventType));
      });
      
      rtm.unsubscribe('CONNECTION_ESTABLISHED', () => handleConnectionChange('connected'));
      rtm.unsubscribe('CONNECTION_LOST', () => handleConnectionChange('disconnected'));
      rtm.unsubscribe('CONNECTION_ERROR', () => handleConnectionChange('error'));
    };
  }, [eventTypes]);
  
  return { updates, connectionState };
}

// Hook for connection status
export function useConnectionStatus() {
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  
  useEffect(() => {
    const rtm = RealTimeManager.getInstance();
    setConnectionState(rtm.getConnectionState());
    
    const handleConnectionChange = (state: string) => {
      setConnectionState(state);
    };
    
    rtm.subscribe('CONNECTION_ESTABLISHED', () => handleConnectionChange('connected'));
    rtm.subscribe('CONNECTION_LOST', () => handleConnectionChange('disconnected'));
    rtm.subscribe('CONNECTION_ERROR', () => handleConnectionChange('error'));
    
    return () => {
      rtm.unsubscribe('CONNECTION_ESTABLISHED', () => handleConnectionChange('connected'));
      rtm.unsubscribe('CONNECTION_LOST', () => handleConnectionChange('disconnected'));
      rtm.unsubscribe('CONNECTION_ERROR', () => handleConnectionChange('error'));
    };
  }, []);
  
  return connectionState;
}

// Export singleton instance
export const realTimeManager = RealTimeManager.getInstance();