import { TextStyle } from 'react-native';

const FONT = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  // ─── APPLE SF DISPLAY ──────────────────────────────────────
  largeTitle: {
    fontFamily: FONT.bold,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: -0.5,
  },
  title1: {
    fontFamily: FONT.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  title2: {
    fontFamily: FONT.bold,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  title3: {
    fontFamily: FONT.semiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: -0.1,
  },
  headline: {
    fontFamily: FONT.semiBold,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.05,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: -0.05,
  },
  subheadline: {
    fontFamily: FONT.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: FONT.regular,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: FONT.regular,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 13,
    letterSpacing: 0,
  },

  // ─── FINANCIAL AMOUNTS ─────────────────────────────────────
  balanceAmount: {
    fontFamily: FONT.bold,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -2,
  },
  amount: {
    fontFamily: FONT.bold,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -2,
  },
  amountLarge: {
    fontFamily: FONT.bold,
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
    letterSpacing: -3,
  },
  expenseAmount: {
    fontFamily: FONT.semiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
};
