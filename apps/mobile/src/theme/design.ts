import { ViewStyle, TextStyle } from 'react-native';

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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 12,
  } as ViewStyle,
};

export const fabShadow = {
  shadowColor: 'rgba(79, 70, 229, 0.25)',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 20,
  elevation: 6,
} as ViewStyle;

export const cardStyle = {
  borderRadius: borderRadius.lg,
  padding: spacing['2xl'],
} as ViewStyle;

export const sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: '700',
  letterSpacing: -0.3,
};

export const metricValue: TextStyle = {
  fontSize: 32,
  fontWeight: '800',
  letterSpacing: -1,
};

export const metricLabel: TextStyle = {
  fontSize: 13,
  fontWeight: '500',
  letterSpacing: 0.2,
};

export const amountLarge: TextStyle = {
  fontSize: 40,
  fontWeight: '800',
  letterSpacing: -1.5,
};
