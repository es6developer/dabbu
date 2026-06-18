import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) { return `${(num / 1000000).toFixed(1)}M`; }
  if (num >= 1000) { return `${(num / 1000).toFixed(1)}K`; }
  return num.toString();
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', ...options,
  });
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
    [3600, 'hour'], [60, 'minute'], [1, 'second'],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) { return `${count} ${label}${count !== 1 ? 's' : ''} ago`; }
  }
  return 'just now';
}

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'analyst';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 100,
  admin: 80,
  support: 60,
  analyst: 40,
};

export function getAdminRole(): AdminRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('admin_user');
    if (!raw) return null;
    return JSON.parse(raw).role || null;
  } catch { return null; }
}

export function hasRole(minimumRole: AdminRole): boolean {
  const role = getAdminRole();
  if (!role) return false;
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[minimumRole] || 0);
}

export function canManageAdmins(): boolean {
  return hasRole('super_admin');
}

export function canManageSettings(): boolean {
  return hasRole('admin');
}

export function canViewAnalytics(): boolean {
  return hasRole('analyst');
}
