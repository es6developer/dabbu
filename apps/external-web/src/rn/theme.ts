import { StyleSheet } from 'react-native';

export const palette = {
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

  chat: {
    expense: '#8B5CF6',
    settlement: '#10B981',
    system: '#64748B',
  },
} as const;

export const typography = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: palette.textSecondary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: palette.textMuted,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: -0.5,
  },
});

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
