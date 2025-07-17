// Unified API Client for consistent API calls across all dashboards
export interface StandardAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
}

export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = 'APIError';
  }
}

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
    
    // Try multiple sources in order of preference
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
        // Handle different error types
        if (response.status === 401) {
          // Trigger logout for unauthorized requests
          this.handleUnauthorized();
        }
        
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
        }
        
        throw new APIError(response.status, response.statusText, errorMessage);
      }
      
      const data = await response.json();
      return this.formatResponse(data);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Handle network errors
      throw new APIError(0, 'Network Error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<StandardAPIResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params).toString()}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<StandardAPIResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload method
  async upload<T>(endpoint: string, formData: FormData): Promise<StandardAPIResponse<T>> {
    const token = this.getAuthToken();
    
    const config: RequestInit = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        throw new APIError(response.status, response.statusText);
      }
      
      const data = await response.json();
      return this.formatResponse(data);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(0, 'Upload Error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private formatResponse<T>(data: any): StandardAPIResponse<T> {
    // Handle different response formats
    if (data && typeof data === 'object') {
      // If response already has our standard format
      if ('success' in data && 'timestamp' in data) {
        return {
          ...data,
          requestId: data.requestId || this.generateRequestId(),
        };
      }
      
      // If response has success field but not our format
      if ('success' in data) {
        return {
          success: data.success,
          data: data.data || data,
          message: data.message,
          error: data.error,
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        };
      }
    }
    
    // Default format for any other response
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    };
  }

  private handleUnauthorized(): void {
    // Clear tokens
    if (typeof window !== 'undefined') {
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      // Redirect to login
      window.location.href = '/auth/login?reason=session_expired';
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Retry mechanism for failed requests
  async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<StandardAPIResponse<T>> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication errors
        if (error instanceof APIError && error.status === 401) {
          throw error;
        }
        
        // Don't retry on client errors (4xx except 401)
        if (error instanceof APIError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError!;
  }
}

// Export singleton instance
export const apiClient = UnifiedAPIClient.getInstance();

// Export convenience function for backward compatibility
export const makeAuthenticatedRequest = (endpoint: string, options?: RequestInit) => {
  return apiClient.request(endpoint, options);
};