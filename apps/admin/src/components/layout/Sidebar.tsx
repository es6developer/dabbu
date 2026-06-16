'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingDown,
  Settings,
  Flag,
  LifeBuoy,
  Bell,
  LogOut,
  ChevronLeft,
  BarChart3,
  Package,
  Shield,
  Home,
  FileText,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Users', href: '/users', icon: <Users size={20} /> },
  { label: 'Families', href: '/families', icon: <Home size={20} /> },
  { label: 'Subscriptions', href: '/subscriptions', icon: <CreditCard size={20} /> },
  { label: 'Plans', href: '/plans', icon: <Package size={20} /> },
  { label: 'Revenue', href: '/revenue', icon: <BarChart3 size={20} /> },
  { label: 'Churn', href: '/churn', icon: <TrendingDown size={20} /> },
  { label: 'Feature Flags', href: '/feature-flags', icon: <Flag size={20} /> },
  { label: 'Notifications', href: '/notifications', icon: <Bell size={20} /> },
  { label: 'Support', href: '/support', icon: <LifeBuoy size={20} /> },
  { label: 'Admins', href: '/admins', icon: <Shield size={20} /> },
  { label: 'Logs', href: '/logs', icon: <FileText size={20} /> },
  { label: 'Settings', href: '/settings', icon: <Settings size={20} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);

  function handleSignOut() {
    localStorage.removeItem('admin_token');
    router.push('/login');
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 z-40 transition-all duration-500',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      <div className="flex flex-col h-full glass m-3 rounded-3xl border-white/[0.06]">
        <div className={cn('flex items-center h-16 px-4', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-base">D</span>
          </div>
          {!collapsed && <span className="font-display text-lg font-bold tracking-tight text-white">Dabbu</span>}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-2xl text-sm transition-all duration-200',
                  collapsed ? 'justify-center px-0 py-3 mx-1' : 'gap-3 px-4 py-2.5 mx-1',
                  isActive
                    ? 'bg-white/[0.1] text-white font-medium border border-white/[0.06]'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                )}
              >
                {item.icon}
                {!collapsed && <span className="flex-1">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 space-y-0.5 border-t border-white/[0.06]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex items-center rounded-2xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200',
              collapsed ? 'justify-center py-3 mx-1' : 'gap-3 px-4 py-2.5 mx-1',
            )}
          >
            <ChevronLeft
              size={18}
              className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleSignOut}
            className={cn(
              'flex items-center rounded-2xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200',
              collapsed ? 'justify-center py-3 mx-1' : 'gap-3 px-4 py-2.5 mx-1',
            )}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
