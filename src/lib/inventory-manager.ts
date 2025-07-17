// Unified Inventory Manager for global inventory state management
import { apiClient } from './unified-api-client';
import { realTimeManager } from './real-time-manager';

export interface InventoryLocation {
  id: string;
  type: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER';
  name: string;
  quantity: number;
  reserved: number;
  available: number;
  lastUpdated: string;
}

export interface GlobalInventoryView {
  partId: string;
  partCode: string;
  partName: string;
  totalStock: number;
  totalAvailable: number;
  totalReserved: number;
  brandStock: InventoryLocation[];
  distributorStock: InventoryLocation[];
  serviceCenterStock: InventoryLocation[];
  inTransitStock: number;
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  estimatedDelivery: string;
  lastUpdated: string;
}

export interface InventoryUpdate {
  partId: string;
  locationId: string;
  locationType: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER';
  oldQuantity: number;
  newQuantity: number;
  reason: string;
  timestamp: string;
}

export class InventoryManager {
  private static instance: InventoryManager;
  private cache: Map<string, GlobalInventoryView> = new Map();
  private subscribers: Set<Function> = new Set();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): InventoryManager {
    if (!InventoryManager.instance) {
      InventoryManager.instance = new InventoryManager();
    }
    return InventoryManager.instance;
  }

  constructor() {
    // Subscribe to real-time inventory updates
    realTimeManager.subscribe('INVENTORY_UPDATED', this.handleRealTimeUpdate.bind(this));
    realTimeManager.subscribe('INVENTORY_RESERVED', this.handleRealTimeUpdate.bind(this));
    realTimeManager.subscribe('INVENTORY_RELEASED', this.handleRealTimeUpdate.bind(this));
  }

  async getGlobalInventory(partId: string): Promise<GlobalInventoryView> {
    // Check cache first
    const cached = this.cache.get(partId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Fetch from API
    try {
      const response = await apiClient.get<GlobalInventoryView>(`/api/inventory/global/${partId}`);
      
      if (response.success && response.data) {
        this.cache.set(partId, response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Error fetching global inventory:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        return cached;
      }
      
      throw error;
    }
  }

  async updateInventory(
    partId: string,
    locationId: string,
    locationType: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
    newQuantity: number,
    reason: string = 'Manual update'
  ): Promise<void> {
    try {
      const response = await apiClient.put<InventoryUpdate>(`/api/inventory/${partId}`, {
        locationId,
        locationType,
        quantity: newQuantity,
        reason
      });

      if (response.success) {
        // Update local cache
        await this.invalidateCache(partId);
        
        // Notify subscribers
        this.notifySubscribers({
          type: 'INVENTORY_UPDATED',
          partId,
          locationId,
          locationType,
          newQuantity,
          reason,
          timestamp: new Date().toISOString()
        });

        // Broadcast to other clients
        realTimeManager.broadcast('INVENTORY_UPDATED', {
          partId,
          locationId,
          locationType,
          newQuantity,
          reason
        });
      } else {
        throw new Error(response.error || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  async reserveInventory(
    partId: string,
    locationId: string,
    locationType: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
    quantity: number,
    orderId: string
  ): Promise<void> {
    try {
      const response = await apiClient.post<any>(`/api/inventory/${partId}/reserve`, {
        locationId,
        locationType,
        quantity,
        orderId
      });

      if (response.success) {
        await this.invalidateCache(partId);
        
        this.notifySubscribers({
          type: 'INVENTORY_RESERVED',
          partId,
          locationId,
          locationType,
          quantity,
          orderId,
          timestamp: new Date().toISOString()
        });

        realTimeManager.broadcast('INVENTORY_RESERVED', {
          partId,
          locationId,
          locationType,
          quantity,
          orderId
        });
      } else {
        throw new Error(response.error || 'Failed to reserve inventory');
      }
    } catch (error) {
      console.error('Error reserving inventory:', error);
      throw error;
    }
  }

  async releaseInventory(
    partId: string,
    locationId: string,
    locationType: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
    quantity: number,
    orderId: string
  ): Promise<void> {
    try {
      const response = await apiClient.post<any>(`/api/inventory/${partId}/release`, {
        locationId,
        locationType,
        quantity,
        orderId
      });

      if (response.success) {
        await this.invalidateCache(partId);
        
        this.notifySubscribers({
          type: 'INVENTORY_RELEASED',
          partId,
          locationId,
          locationType,
          quantity,
          orderId,
          timestamp: new Date().toISOString()
        });

        realTimeManager.broadcast('INVENTORY_RELEASED', {
          partId,
          locationId,
          locationType,
          quantity,
          orderId
        });
      } else {
        throw new Error(response.error || 'Failed to release inventory');
      }
    } catch (error) {
      console.error('Error releasing inventory:', error);
      throw error;
    }
  }

  async getInventoryByLocation(
    locationType: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
    locationId: string
  ): Promise<InventoryLocation[]> {
    try {
      const response = await apiClient.get<InventoryLocation[]>(
        `/api/inventory/location/${locationType}/${locationId}`
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch location inventory');
      }
    } catch (error) {
      console.error('Error fetching location inventory:', error);
      throw error;
    }
  }

  async getLowStockAlerts(
    locationType?: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
    locationId?: string
  ): Promise<any[]> {
    try {
      const params: any = {};
      if (locationType) params.locationType = locationType;
      if (locationId) params.locationId = locationId;

      const response = await apiClient.get<any[]>('/api/inventory/low-stock-alerts', params);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch low stock alerts');
      }
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
      throw error;
    }
  }

  subscribe(callback: Function): void {
    this.subscribers.add(callback);
  }

  unsubscribe(callback: Function): void {
    this.subscribers.delete(callback);
  }

  private async invalidateCache(partId: string): Promise<void> {
    this.cache.delete(partId);
    
    // Refresh cache with new data
    try {
      await this.getGlobalInventory(partId);
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  }

  private isCacheValid(inventory: GlobalInventoryView): boolean {
    const lastUpdated = new Date(inventory.lastUpdated).getTime();
    return Date.now() - lastUpdated < this.cacheTimeout;
  }

  private notifySubscribers(update: any): void {
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error notifying inventory subscriber:', error);
      }
    });
  }

  private handleRealTimeUpdate(payload: any): void {
    const { partId } = payload;
    
    // Invalidate cache for updated part
    if (partId) {
      this.invalidateCache(partId);
    }
    
    // Notify local subscribers
    this.notifySubscribers(payload);
  }

  // Utility methods
  calculateTotalStock(inventory: GlobalInventoryView): number {
    return inventory.brandStock.reduce((total, loc) => total + loc.quantity, 0) +
           inventory.distributorStock.reduce((total, loc) => total + loc.quantity, 0) +
           inventory.serviceCenterStock.reduce((total, loc) => total + loc.quantity, 0);
  }

  calculateAvailableStock(inventory: GlobalInventoryView): number {
    return inventory.brandStock.reduce((total, loc) => total + loc.available, 0) +
           inventory.distributorStock.reduce((total, loc) => total + loc.available, 0) +
           inventory.serviceCenterStock.reduce((total, loc) => total + loc.available, 0);
  }

  determineAvailability(totalAvailable: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
    if (totalAvailable === 0) return 'OUT_OF_STOCK';
    if (totalAvailable <= 5) return 'LOW_STOCK';
    return 'IN_STOCK';
  }
}

// React hooks for using inventory manager
import { useEffect, useState } from 'react';

export function useGlobalInventory(partId: string) {
  const [inventory, setInventory] = useState<GlobalInventoryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const inventoryManager = InventoryManager.getInstance();
    
    const loadInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await inventoryManager.getGlobalInventory(partId);
        setInventory(data);
      } catch (err) {
        console.error('Error loading inventory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
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
  
  return { inventory, loading, error };
}

export function useLocationInventory(
  locationType: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
  locationId: string
) {
  const [inventory, setInventory] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const inventoryManager = InventoryManager.getInstance();
    
    const loadInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await inventoryManager.getInventoryByLocation(locationType, locationId);
        setInventory(data);
      } catch (err) {
        console.error('Error loading location inventory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    
    const handleInventoryUpdate = (update: any) => {
      if (update.locationType === locationType && update.locationId === locationId) {
        loadInventory(); // Refresh data
      }
    };
    
    inventoryManager.subscribe(handleInventoryUpdate);
    loadInventory();
    
    return () => {
      inventoryManager.unsubscribe(handleInventoryUpdate);
    };
  }, [locationType, locationId]);
  
  return { inventory, loading, error };
}

export function useLowStockAlerts(
  locationType?: 'BRAND' | 'DISTRIBUTOR' | 'SERVICE_CENTER',
  locationId?: string
) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const inventoryManager = InventoryManager.getInstance();
    
    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await inventoryManager.getLowStockAlerts(locationType, locationId);
        setAlerts(data);
      } catch (err) {
        console.error('Error loading low stock alerts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };
    
    const handleInventoryUpdate = (update: any) => {
      // Refresh alerts when inventory changes
      loadAlerts();
    };
    
    inventoryManager.subscribe(handleInventoryUpdate);
    loadAlerts();
    
    return () => {
      inventoryManager.unsubscribe(handleInventoryUpdate);
    };
  }, [locationType, locationId]);
  
  return { alerts, loading, error };
}

// Export singleton instance
export const inventoryManager = InventoryManager.getInstance();