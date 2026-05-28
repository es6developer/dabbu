'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, CreditCard, TrendingUp,
  TrendingDown, Settings, Flag, LifeBuoy,
  Send, LogOut, ChevronLeft, BarChart3, Package,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Users', href: '/users', icon: <Users size={18} /> },
  { label: 'Subscriptions', href: '/subscriptions', icon: <CreditCard size={18} /> },
  { label: 'Plans', href: '/plans', icon: <Package size={18} /> },
  { label: 'Revenue', href: '/revenue', icon: <BarChart3 size={18} /> },
  { label: 'Churn', href: '/churn', icon: <TrendingDown size={18} /> },
  { label: 'Feature Flags', href: '/feature-flags', icon: <Flag size={18} /> },
  { label: 'Notifications', href: '/notifications', icon: <Send size={18} /> },
  { label: 'Support', href: '/support', icon: <LifeBuoy size={18} /> },
  { label: 'Logs', href: '/logs', icon: <BarChart3 size={18} /> },
  { label: 'Settings', href: '/settings', icon: <Settings size={18} /> },
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
        'flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-muted">
        <div className="w-8 h-8 rounded-lg bg-dabbu-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">D</span>
        </div>
        {!collapsed && <span className="font-semibold text-lg">Dabbu Admin</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-white font-medium'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted',
              )}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-dabbu-500/20 text-dabbu-400 text-xs font-medium">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-sidebar-muted">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted transition-colors"
        >
          <ChevronLeft size={18} className={cn('transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors mt-1">
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
