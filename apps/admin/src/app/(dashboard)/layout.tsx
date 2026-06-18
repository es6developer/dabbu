'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  support: 60,
  analyst: 40,
};

const routeMinRole: Record<string, string> = {
  '/admins': 'super_admin',
  '/settings': 'admin',
  '/feature-flags': 'admin',
  '/coupons': 'admin',
  '/notifications': 'admin',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify');
        if (!res.ok) throw new Error('Not authenticated');
        const json = await res.json();
        if (!json.authenticated) throw new Error('Not authenticated');
      } catch {
        const userRaw = localStorage.getItem('admin_user');
        if (!userRaw) {
          router.replace('/login');
          return;
        }
      }

      try {
        const userRaw = localStorage.getItem('admin_user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          const userLevel = ROLE_HIERARCHY[user.role] || 0;

          for (const [route, minRole] of Object.entries(routeMinRole)) {
            if (pathname.startsWith(route)) {
              const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
              if (userLevel < requiredLevel) {
                router.replace('/dashboard');
                return;
              }
            }
          }
        }
      } catch { /* ignore */ }

      setAuthorized(true);
    };

    checkAuth();
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden pt-0 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
