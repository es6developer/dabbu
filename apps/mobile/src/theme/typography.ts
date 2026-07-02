import { TextStyle } from 'react-native';

const FONT = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  // ─── ONE UI 8.5 HEADINGS ───────────────────────────────────
  largeTitle: {
    fontFamily: FONT.bold,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  title1: {
    fontFamily: FONT.bold,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 37,
    letterSpacing: -0.5,
  },
  title2: {
    fontFamily: FONT.bold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  title3: {
    fontFamily: FONT.semiBold,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: FONT.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: -0.05,
  },
  subheadline: {
    fontFamily: FONT.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: FONT.regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: FONT.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 15,
    letterSpacing: 0,
  },

  // ─── FINANCIAL AMOUNTS (One UI 8.5 — large, bold) ───────
  balanceAmount: {
    fontFamily: FONT.bold,
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 52,
    letterSpacing: -2.5,
  },
  amount: {
    fontFamily: FONT.bold,
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 52,
    letterSpacing: -2.5,
  },
  amountLarge: {
    fontFamily: FONT.bold,
    fontSize: 60,
    fontWeight: '700',
    lineHeight: 68,
    letterSpacing: -3.5,
  },
  expenseAmount: {
    fontFamily: FONT.semiBold,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.5,
  },
};
