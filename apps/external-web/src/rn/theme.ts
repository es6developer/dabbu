import { StyleSheet } from 'react-native';

export const darkPalette = {
  brand: '#6C3EF4', brandHover: '#5B2ED9', brandMuted: '#A78BFA',
  brandLight: 'rgba(108, 62, 244, 0.12)', brandLine: 'rgba(108, 62, 244, 0.22)',
  bg: '#000000', surface: '#121214', surface2: '#1A1A1E', card: '#121214', elevated: '#1A1A1E',
  text: '#FFFFFF', textSecondary: '#A1A1A6', textMuted: '#6B7280',
  border: '#2A2A2E', borderSubtle: '#1E1E22',
  success: '#34D399', successBg: 'rgba(52, 211, 153, 0.12)',
  error: '#FB7185', errorBg: 'rgba(251, 113, 133, 0.12)',
  warning: '#FBBF24', warningBg: 'rgba(251, 191, 36, 0.12)',
  info: '#60A5FA', infoBg: 'rgba(96, 165, 250, 0.12)',
  navBg: 'rgba(0,0,0,0.92)', navBorder: '#2A2A2E',
  chat: { expense: '#6C3EF4', settlement: '#34D399', system: '#6B7280' },
} as const;

export const lightPalette = {
  brand: '#6C3EF4', brandHover: '#5B2ED9', brandMuted: '#A78BFA',
  brandLight: 'rgba(108, 62, 244, 0.08)', brandLine: 'rgba(108, 62, 244, 0.16)',
  bg: '#F5F5F7', surface: '#FFFFFF', surface2: '#FAFAFA', card: '#FFFFFF', elevated: '#FFFFFF',
  text: '#1D1D1F', textSecondary: '#86868B', textMuted: '#A1A1A6',
  border: 'rgba(0,0,0,0.06)', borderSubtle: 'rgba(0,0,0,0.03)',
  success: '#34D399', successBg: 'rgba(52, 211, 153, 0.08)',
  error: '#FB7185', errorBg: 'rgba(251, 113, 133, 0.08)',
  warning: '#FBBF24', warningBg: 'rgba(251, 191, 36, 0.08)',
  info: '#60A5FA', infoBg: 'rgba(96, 165, 250, 0.08)',
  navBg: 'rgba(255,255,255,0.92)', navBorder: 'rgba(0,0,0,0.06)',
  chat: { expense: '#6C3EF4', settlement: '#34D399', system: '#A1A1A6' },
} as const;

export type Palette = {
  brand: string; brandHover: string; brandMuted: string; brandLight: string; brandLine: string;
  bg: string; surface: string; surface2: string; card: string; elevated: string;
  text: string; textSecondary: string; textMuted: string;
  border: string; borderSubtle: string;
  success: string; successBg: string; error: string; errorBg: string;
  warning: string; warningBg: string; info: string; infoBg: string;
  navBg: string; navBorder: string;
  chat: { expense: string; settlement: string; system: string };
};

export const palettes = { dark: darkPalette, light: lightPalette } as const satisfies Record<ThemeMode, Palette>;
export type ThemeMode = 'dark' | 'light';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radii = { sm: 14, md: 18, lg: 20, xl: 24, xxl: 28, full: 9999 } as const;

export const typography = StyleSheet.create({
  h1: { fontSize: 36, fontWeight: '700', color: 'var(--dabbu-text)' as any, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700', color: 'var(--dabbu-text)' as any, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600', color: 'var(--dabbu-text)' as any },
  body: { fontSize: 15, fontWeight: '400', color: 'var(--dabbu-text-secondary)' as any, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '500', color: 'var(--dabbu-text-muted)' as any },
  label: { fontSize: 11, fontWeight: '600', color: 'var(--dabbu-text-muted)' as any, letterSpacing: 0.3, textTransform: 'uppercase' },
  amount: { fontSize: 32, fontWeight: '800', color: 'var(--dabbu-text)' as any, letterSpacing: -0.5 },
});
