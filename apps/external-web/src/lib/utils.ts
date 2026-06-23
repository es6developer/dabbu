import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = '₹'): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currency}${formatted}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRandomColor(name: string): string {
  const colors = [
    '#f7892c',
    '#22c55e',
    '#3b82f6',
    '#a855f7',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#eab308',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const CATEGORIES = [
  { value: 'food', label: 'Food & Drinks', icon: 'utensils-crossed' },
  { value: 'transport', label: 'Transport', icon: 'car' },
  { value: 'accommodation', label: 'Accommodation', icon: 'building' },
  { value: 'shopping', label: 'Shopping', icon: 'shopping-bag' },
  { value: 'entertainment', label: 'Entertainment', icon: 'gamepad-2' },
  { value: 'utilities', label: 'Utilities', icon: 'zap' },
  { value: 'health', label: 'Health', icon: 'heart' },
  { value: 'travel', label: 'Travel', icon: 'plane' },
  { value: 'other', label: 'Other', icon: 'more-horizontal' },
] as const;

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? 'Other';
}

export const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'exact', label: 'Exact Amount' },
] as const;
