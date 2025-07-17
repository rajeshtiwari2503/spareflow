import Cookies from 'js-cookie';

export function getAuthToken(): string | null {
  try {
    // First try to get from cookies
    let token = Cookies.get('token');
    
    // If not in cookies, try localStorage as fallback (for client-side only)
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('authToken');
      if (token) {
        // If found in localStorage, also set in cookies for consistency
        Cookies.set('token', token, { expires: 7 });
      }
    }
    
    if (!token) {
      console.warn('No authentication token found in cookies or localStorage');
      return null;
    }
    
    // Basic validation - JWT tokens should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format - JWT should have 3 parts');
      Cookies.remove('token'); // Remove invalid token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
}

export function clearAuthToken(): void {
  try {
    Cookies.remove('token');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    console.log('Authentication token cleared from cookies and localStorage');
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
}

export function setAuthToken(token: string, expires?: number): void {
  try {
    // Validate token format before storing
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }
    
    const options: any = {};
    if (expires) {
      options.expires = expires;
    }
    
    // Store in both cookies and localStorage for redundancy
    Cookies.set('token', token, options);
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
    console.log('Authentication token stored successfully in cookies and localStorage');
  } catch (error) {
    console.error('Error storing auth token:', error);
    throw error;
  }
}

export function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}