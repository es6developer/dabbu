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
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
};

type ThemeColors = {
  bg: { card: string };
  border: { default: string };
};

export const cardPreset = {
  default: (colors: ThemeColors): ViewStyle => ({
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  }),
  compact: (colors: ThemeColors): ViewStyle => ({
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  }),
  elevated: (colors: ThemeColors): ViewStyle => ({
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.lg,
  }),
  highlight: (colors: ThemeColors): ViewStyle => ({
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  }),
};

export const fabShadow = {
  shadowColor: 'rgba(139, 92, 246, 0.4)',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 1,
  shadowRadius: 24,
  elevation: 4,
} as ViewStyle;

export const screenPadding = {
  paddingHorizontal: PADDING,
} as ViewStyle;
