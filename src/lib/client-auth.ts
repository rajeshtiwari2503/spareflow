// Client-side authentication utilities

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get token from cookies
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') {
      return value;
    }
  }
  
  // Try to get token from localStorage as fallback
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  // Set in cookies (primary method)
  document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`;
  
  // Set in localStorage as backup
  try {
    localStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error setting localStorage:', error);
  }
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  
  // Remove from cookies with all possible attributes to ensure complete removal
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; secure; samesite=strict;';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  
  // Remove from localStorage
  try {
    localStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

export async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export async function checkAuthStatus(): Promise<{ isAuthenticated: boolean; user?: any }> {
  try {
    const response = await makeAuthenticatedRequest('/api/auth/me');
    
    if (response.ok) {
      const data = await response.json();
      return { isAuthenticated: true, user: data.user };
    } else {
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { isAuthenticated: false };
  }
}