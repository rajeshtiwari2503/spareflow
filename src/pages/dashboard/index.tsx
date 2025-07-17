import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardRouter() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Redirect to login with return URL
        router.push('/auth/login?redirect=/dashboard');
        return;
      }

      if (user) {
        // Redirect to role-specific dashboard
        switch (user.role) {
          case 'SUPER_ADMIN':
            router.push('/dashboard/super-admin');
            break;
          case 'BRAND':
            router.push('/dashboard/brand');
            break;
          case 'DISTRIBUTOR':
            router.push('/dashboard/distributor');
            break;
          case 'SERVICE_CENTER':
            router.push('/dashboard/service-center');
            break;
          case 'CUSTOMER':
            router.push('/dashboard/customer');
            break;
          default:
            // Fallback to login if role is not recognized
            router.push('/auth/login');
        }
      }
    }
  }, [user, loading, isAuthenticated, router]);

  // Show loading spinner while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}