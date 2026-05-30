import { TextStyle } from 'react-native';

const inter = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  // ─── TITLES ──────────────────────────────────────────────
  hero: {
    fontFamily: inter.bold,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: -0.5,
  },
  appTitle: {
    fontFamily: inter.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h1: {
    fontFamily: inter.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  screenTitle: {
    fontFamily: inter.semiBold,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  h2: {
    fontFamily: inter.semiBold,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  sectionHeader: {
    fontFamily: inter.semiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  h3: {
    fontFamily: inter.semiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  cardTitle: {
    fontFamily: inter.semiBold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  h4: {
    fontFamily: inter.semiBold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },

  // ─── BODY ────────────────────────────────────────────────
  body: {
    fontFamily: inter.regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodyBold: {
    fontFamily: inter.semiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  callout: {
    fontFamily: inter.regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  calloutBold: {
    fontFamily: inter.semiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // ─── SECONDARY ───────────────────────────────────────────
  secondary: {
    fontFamily: inter.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  subhead: {
    fontFamily: inter.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  subheadBold: {
    fontFamily: inter.semiBold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // ─── CAPTIONS ────────────────────────────────────────────
  caption: {
    fontFamily: inter.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  footnote: {
    fontFamily: inter.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  smallCaption: {
    fontFamily: inter.regular,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
  caption1: {
    fontFamily: inter.regular,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
  caption2: {
    fontFamily: inter.medium,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },

  // ─── BUTTONS ─────────────────────────────────────────────
  button: {
    fontFamily: inter.semiBold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontFamily: inter.semiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  tab: {
    fontFamily: inter.medium,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },

  // ─── FINANCIAL AMOUNTS ───────────────────────────────────
  balanceAmount: {
    fontFamily: inter.bold,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -1,
  },
  amount: {
    fontFamily: inter.bold,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -1,
  },
  expenseAmount: {
    fontFamily: inter.semiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  amountSmall: {
    fontFamily: inter.bold,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  dashboardMetric: {
    fontFamily: inter.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  analyticsNumber: {
    fontFamily: inter.bold,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: -0.5,
  },
  amountLarge: {
    fontFamily: inter.bold,
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
    letterSpacing: -2,
  },
};
