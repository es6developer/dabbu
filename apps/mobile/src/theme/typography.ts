import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'System',
  default: 'System',
});

const fontFamilyMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const typography: Record<string, TextStyle> = {
  hero: {
    fontFamily,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  h4: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  body: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  callout: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  calloutBold: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  subhead: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  subheadBold: {
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  footnote: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  caption1: {
    fontFamily,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
  caption2: {
    fontFamily,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  tab: {
    fontFamily,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
  mono: {
    fontFamily: fontFamilyMono,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  monoBold: {
    fontFamily: fontFamilyMono,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  amount: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -1,
  },
  amountSmall: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  amountLarge: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
    letterSpacing: -2,
  },
};
