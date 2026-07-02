import { ViewStyle, TextStyle, StyleSheet } from 'react-native';

// ─── SPACING (One UI 8.5 — generous padding) ───────────────
export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 44,
  '5xl': 52,
  '6xl': 60,
  '7xl': 68,
  '8xl': 84,
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

// ─── BUTTON HEIGHT (One UI 8.5 — pill buttons, large touch targets) ──
export const buttonHeight = {
  sm: 48,
  md: 54,
  lg: 60,
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

// ─── LAYOUT CONSTANTS (One UI 8.5 — generous content padding) ──
export const PADDING = spacing['2xl'];

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

/** One UI 8.5 — tall list row with generous spacing */
export function listRow(colors: Colors): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing['2xl'],
    backgroundColor: colors.bg.card,
    gap: spacing.lg,
    minHeight: 56,
  } as ViewStyle;
}

/** One UI 8.5 — bold section header with extra spacing */
export function sectionHeader(textColor?: string): TextStyle {
  return {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    color: textColor || undefined,
  } as TextStyle;
}

/** One UI 8.5 — subtle separator */
export function separator(colors: Colors, inset = false): ViewStyle {
  return {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginLeft: inset ? spacing['2xl'] : 0,
  };
}
