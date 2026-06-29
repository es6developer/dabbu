import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'analyst';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 100,
  admin: 80,
  support: 60,
  analyst: 40,
};

export function getAdminRole(): AdminRole | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem('admin_user');
    if (!raw) {
      return null;
    }
    return JSON.parse(raw).role || null;
  } catch {
    return null;
  }
}

export function hasRole(minimumRole: AdminRole): boolean {
  const role = getAdminRole();
  if (!role) {
    return false;
  }
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[minimumRole] || 0);
}
