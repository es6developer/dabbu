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
