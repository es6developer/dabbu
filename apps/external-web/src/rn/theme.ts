import { StyleSheet } from 'react-native';

export const darkPalette = {
  brand: '#8B5CF6',
  brandHover: '#7C3AED',
  brandMuted: '#C4B5FD',
  brandLight: 'rgba(139, 92, 246, 0.12)',
  brandLine: 'rgba(139, 92, 246, 0.22)',

  bg: '#000000',
  surface: '#121214',
  surface2: '#1A1A1E',
  card: '#121214',
  elevated: '#1A1A1E',

  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  border: '#2A2A2E',
  borderSubtle: '#1E1E22',

  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.12)',

  navBg: 'rgba(18, 18, 20, 0.8)',
  navBorder: '#2A2A2E',

  chat: {
    expense: '#8B5CF6',
    settlement: '#10B981',
    system: '#64748B',
  },
} as const;

export const lightPalette = {
  brand: '#8B5CF6',
  brandHover: '#7C3AED',
  brandMuted: '#C4B5FD',
  brandLight: 'rgba(139, 92, 246, 0.10)',
  brandLine: 'rgba(139, 92, 246, 0.20)',

  bg: '#F3F4F6',
  surface: '#FFFFFF',
  surface2: '#F9FAFB',
  card: '#FFFFFF',
  elevated: '#FFFFFF',

  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#6B7280',

  border: '#E5E7EB',
  borderSubtle: '#F3F4F6',

  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.10)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.10)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.10)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.10)',

  navBg: 'rgba(255, 255, 255, 0.85)',
  navBorder: '#E5E7EB',

  chat: {
    expense: '#8B5CF6',
    settlement: '#10B981',
    system: '#94A3B8',
  },
} as const;

export type Palette = {
  brand: string;
  brandHover: string;
  brandMuted: string;
  brandLight: string;
  brandLine: string;
  bg: string;
  surface: string;
  surface2: string;
  card: string;
  elevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
  navBg: string;
  navBorder: string;
  chat: {
    expense: string;
    settlement: string;
    system: string;
  };
};

export const palettes = {
  dark: darkPalette,
  light: lightPalette,
} as const satisfies Record<ThemeMode, Palette>;

export type ThemeMode = 'dark' | 'light';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export const typography = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '800',
    color: 'var(--dabbu-text)' as any,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: 'var(--dabbu-text)' as any,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    color: 'var(--dabbu-text)' as any,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: 'var(--dabbu-text-secondary)' as any,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: 'var(--dabbu-text-muted)' as any,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'var(--dabbu-text-muted)' as any,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: 'var(--dabbu-text)' as any,
    letterSpacing: -0.5,
  },
});
