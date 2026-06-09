import { ViewStyle } from 'react-native';

export const PADDING = 20;
export const CARD_GAP = 12;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 56,
  '7xl': 64,
  '8xl': 80,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  } as ViewStyle,
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
};

export const cardPreset = {
  default: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.md,
  } as ViewStyle,
  compact: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.md,
  } as ViewStyle,
  elevated: {
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.lg,
  } as ViewStyle,
  highlight: {
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.12)',
    ...shadows.md,
  } as ViewStyle,
};

export const fabShadow = {
  shadowColor: 'rgba(139, 92, 246, 0.4)',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 1,
  shadowRadius: 24,
  elevation: 8,
} as ViewStyle;

export const screenPadding = {
  paddingHorizontal: PADDING,
} as ViewStyle;
