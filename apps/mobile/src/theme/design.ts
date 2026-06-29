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

// ─── CORNER RADIUS (One UI 8.5 — larger, more rounded) ────
export const borderRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 40,
  '7xl': 44,
  '8xl': 48,
  full: 9999,
} as const;

// ─── BUTTON HEIGHT ──────────────────────────────────────────
export const buttonHeight = {
  sm: 44,
  md: 50,
  lg: 56,
} as const;

// ─── SHADOWS (One UI 8.5 — softer, more elevated) ───────
export const shadows = {
  none: {} as ViewStyle,
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  } as ViewStyle,
  premium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  } as ViewStyle,
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,
} as const;

// ─── ANIMATION DURATIONS (ms) ───────────────────────────────
export const animation = {
  fast: 200,
  normal: 300,
  slow: 400,
  // Apple-spring: low damping + stiffness for natural iOS feel
  spring: { damping: 12, stiffness: 200, mass: 1 } as const,
  springSnappy: { damping: 16, stiffness: 300, mass: 0.8 } as const,
  springGentle: { damping: 14, stiffness: 150, mass: 1 } as const,
  springBouncy: { damping: 10, stiffness: 250, mass: 0.7 } as const,
  easing: {
    // iOS-style bezier curves
    easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
    easeOut: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
    easeIn: [0.4, 0, 1, 1] as [number, number, number, number],
    spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  },
  stagger: {
    fast: 60,
    normal: 80,
    slow: 120,
  },
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
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 6,
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
  bg: { card: string; primary: string; secondary: string; glass: string; tertiary: string };
  border: { subtle: string; default: string };
  accent: { primary: string; secondary: string; tertiary: string; hover: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  status: { success: string; error: string; successLight: string; errorLight: string };
};

/** One UI 8.5 card with depth */
export function cardPreset(colors: Colors, level: 'default' | 'compact' | 'elevated' | 'highlight' | 'premium' | 'glass' = 'default'): ViewStyle {
  const presets: Record<string, ViewStyle> = {
    default: {
      borderRadius: borderRadius['5xl'],
      padding: spacing.xl,
      backgroundColor: colors.bg.card,
      ...shadows.md,
    },
    compact: {
      borderRadius: borderRadius['5xl'],
      padding: spacing.lg,
      backgroundColor: colors.bg.card,
      ...shadows.sm,
    },
    elevated: {
      borderRadius: borderRadius['6xl'],
      padding: spacing['2xl'],
      backgroundColor: colors.bg.card,
      ...shadows.lg,
    },
    highlight: {
      borderRadius: borderRadius['6xl'],
      padding: spacing.xl,
      backgroundColor: colors.bg.card,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent.primary,
      ...shadows.md,
    },
    premium: {
      borderRadius: borderRadius['6xl'],
      padding: spacing['2xl'],
      backgroundColor: colors.bg.card,
      ...shadows.premium,
      borderWidth: 1,
      borderColor: colors.accent.primary + '20',
    },
    glass: {
      borderRadius: borderRadius['6xl'],
      padding: spacing['2xl'],
      backgroundColor: colors.bg.glass,
      ...shadows.glass,
      borderWidth: 1,
      borderColor: colors.border.subtle,
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

/** Section header style - pass colors.text.tertiary for color */
export function sectionHeader(textColor?: string): TextStyle {
  return {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    color: textColor || undefined,
  } as TextStyle;
}

/** Apple-style hairline separator */
export function separator(colors: Colors, inset = false): ViewStyle {
  return {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginLeft: inset ? spacing.xl : 0,
  };
}
