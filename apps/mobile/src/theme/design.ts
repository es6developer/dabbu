import { ViewStyle, TextStyle, StyleSheet } from 'react-native';

// ─── SPACING (8pt Grid) ─────────────────────────────────────
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

// ─── CORNER RADIUS ──────────────────────────────────────────
export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  '4xl': 24,
  '5xl': 28,
  '6xl': 32,
  full: 9999,
} as const;

// ─── BUTTON HEIGHT ──────────────────────────────────────────
export const buttonHeight = {
  sm: 44,
  md: 50,
  lg: 56,
} as const;

// ─── SUBTLE APPLE SHADOWS ───────────────────────────────────
export const shadows = {
  none: {} as ViewStyle,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
} as const;

// ─── ANIMATION DURATIONS (ms) ───────────────────────────────
export const animation = {
  fast: 200,
  normal: 300,
  slow: 400,
  spring: { damping: 15, stiffness: 200 } as const,
  springSnappy: { damping: 20, stiffness: 300 } as const,
} as const;

// ─── HIT SLOP ───────────────────────────────────────────────
export const hitSlop = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
} as const;

// ─── FAB SHADOW ─────────────────────────────────────────────
export const fabShadow = {
  shadowColor: 'rgba(124, 58, 237, 0.4)',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 1,
  shadowRadius: 24,
  elevation: 4,
} as ViewStyle;

// ─── LAYOUT CONSTANTS ───────────────────────────────────────
export const PADDING = spacing.xl;

// ─── ICON SIZES ─────────────────────────────────────────────
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

// ─── DESIGN SYSTEM PRESETS ──────────────────────────────────

type Colors = {
  bg: { card: string; primary: string; secondary: string };
  border: { subtle: string; default: string };
  accent: { primary: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  status: { success: string; error: string; successLight: string; errorLight: string };
};

/** Standard iOS-style card with subtle shadow */
export function cardPreset(colors: Colors, level: 'default' | 'compact' | 'elevated' | 'highlight' = 'default'): ViewStyle {
  const presets: Record<string, ViewStyle> = {
    default: {
      borderRadius: borderRadius['3xl'],
      padding: spacing.xl,
      backgroundColor: colors.bg.card,
      ...shadows.md,
    },
    compact: {
      borderRadius: borderRadius['3xl'],
      padding: spacing.lg,
      backgroundColor: colors.bg.card,
      ...shadows.md,
    },
    elevated: {
      borderRadius: borderRadius['4xl'],
      padding: spacing['2xl'],
      backgroundColor: colors.bg.card,
      ...shadows.lg,
    },
    highlight: {
      borderRadius: borderRadius['4xl'],
      padding: spacing.xl,
      backgroundColor: colors.bg.card,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent.primary,
      ...shadows.md,
    },
  };
  return presets[level];
}

/** Apple-style list row */
export function listRow(colors: Colors): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg.card,
    gap: spacing.md,
  } as ViewStyle;
}

/** Section header style */
export const sectionHeader: TextStyle = {
  fontSize: 13,
  fontWeight: '600',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  paddingHorizontal: spacing.xl,
  paddingTop: spacing['3xl'],
  paddingBottom: spacing.sm,
};

/** Apple-style hairline separator */
export function separator(colors: Colors, inset = false): ViewStyle {
  return {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginLeft: inset ? spacing.xl : 0,
  };
}
