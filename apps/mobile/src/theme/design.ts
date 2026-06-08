import { ViewStyle, TextStyle } from 'react-native';

export const PADDING = 24;
export const CARD_GAP = 16;

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
  lg: 20,
  xl: 24,
  '2xl': 28,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 12,
  } as ViewStyle,
};

export const fabShadow = {
  shadowColor: 'rgba(79, 70, 229, 0.3)',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 1,
  shadowRadius: 24,
  elevation: 8,
} as ViewStyle;

export const screenPadding = {
  paddingHorizontal: PADDING,
} as ViewStyle;

export const typography = {
  heroNumber: {
    fontSize: 44,
    fontWeight: '800' as const,
    letterSpacing: -2,
    lineHeight: 50,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1,
    lineHeight: 38,
  },
  title1: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  title2: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  title3: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  headline: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  subhead: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0.15,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  small: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  amount: {
    fontSize: 40,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  amountLarge: {
    fontSize: 56,
    fontWeight: '800' as const,
    letterSpacing: -2.5,
    lineHeight: 64,
  },
  amountMedium: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  amountSmall: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -1,
    lineHeight: 34,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export const cardPreset = {
  default: {
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
    ...shadows.md,
  } as ViewStyle,
  compact: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  } as ViewStyle,
  hero: {
    borderRadius: borderRadius['2xl'],
    padding: spacing['3xl'],
    ...shadows.lg,
  } as ViewStyle,
  elevated: {
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    ...shadows.lg,
  } as ViewStyle,
};
