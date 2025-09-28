'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAuth();
      setHasCheckedAuth(true);
    };
    
    if (!hasCheckedAuth) {
      initializeAuth();
    }
  }, [checkAuth, hasCheckedAuth]);

  useEffect(() => {
    if (hasCheckedAuth && !isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        // Only redirect if we're not already on the login page
        if (pathname !== '/auth/login') {
          router.push('/auth/login');
        }
      } else if (isAuthenticated && isPublicRoute) {
        // Only redirect if we're on a public route and authenticated
        if (pathname !== '/dashboard') {
          router.push('/dashboard');
        }
      }
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router, pathname, hasCheckedAuth]);

  // Show loading spinner while checking authentication
  if (isLoading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
