import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/dashboard/brand',
  '/dashboard/distributor', 
  '/dashboard/service-center',
  '/dashboard/customer',
  '/dashboard/super-admin',
  '/dashboard/index'
];

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/about',
  '/contact',
  '/careers',
  '/blog',
  '/privacy',
  '/terms',
  '/spare-parts',
  '/diy-search',
  '/features',
  '/pricing',
  '/help',
  '/notifications-demo',
  '/api-docs'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith('/api/')
  );
  
  // If it's a public route, allow access
  if (isPublicRoute && !isProtectedRoute) {
    return NextResponse.next();
  }
  
  // If it's a protected route, check authentication
  if (isProtectedRoute) {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      // No token found, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      // Verify the JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
      await jwtVerify(token, secret);
      
      // Token is valid, allow access
      return NextResponse.next();
    } catch (error) {
      // Token is invalid, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      
      // Clear the invalid token
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      return response;
    }
  }
  
  // For any other routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public|images).*)',
  ],
};