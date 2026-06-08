export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  brand: {
    primary: '#0F766E',
    light: 'rgba(15, 118, 110, 0.12)',
    hover: '#115E59',
    muted: '#5EEAD4',
  },

  dark: {
    bg: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      card: '#1E293B',
      elevated: '#253349',
      overlay: 'rgba(0, 0, 0, 0.6)',
      glass: 'rgba(20, 184, 166, 0.06)',
      glassLight: 'rgba(20, 184, 166, 0.10)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
      inverse: '#0F172A',
      link: '#14B8A6',
    },
    brand: {
      primary: '#14B8A6',
      light: 'rgba(20, 184, 166, 0.18)',
      hover: '#0D9488',
      muted: '#5EEAD4',
    },
    border: {
      subtle: 'rgba(51, 65, 85, 0.5)',
      default: '#334155',
      active: 'rgba(20, 184, 166, 0.4)',
    },
    accent: {
      primary: '#14B8A6',
      secondary: '#2DD4BF',
      tertiary: '#5EEAD4',
      hover: '#0D9488',
    },
    status: {
      success: '#22C55E',
      successLight: 'rgba(34, 197, 94, 0.18)',
      warning: '#FBBF24',
      warningLight: 'rgba(251, 191, 36, 0.18)',
      error: '#F87171',
      errorLight: 'rgba(248, 113, 113, 0.18)',
      info: '#60A5FA',
      infoLight: 'rgba(96, 165, 250, 0.18)',
    },
    chart: {
      line1: '#14B8A6',
      line2: '#22C55E',
      line3: '#FBBF24',
      line4: '#F87171',
    },
    skeleton: {
      base: '#1E293B',
      highlight: '#334155',
    },
  },

  light: {
    bg: {
      primary: '#F8FAFC',
      secondary: '#FFFFFF',
      tertiary: '#F1F5F9',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.3)',
      glass: 'rgba(15, 118, 110, 0.05)',
      glassLight: 'rgba(15, 118, 110, 0.09)',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      tertiary: '#94A3B8',
      inverse: '#FFFFFF',
      link: '#0F766E',
    },
    brand: {
      primary: '#0F766E',
      light: 'rgba(15, 118, 110, 0.12)',
      hover: '#115E59',
      muted: '#5EEAD4',
    },
    border: {
      subtle: 'rgba(226, 232, 240, 0.6)',
      default: '#E2E8F0',
      active: 'rgba(15, 118, 110, 0.25)',
    },
    accent: {
      primary: '#0F766E',
      secondary: '#14B8A6',
      tertiary: '#5EEAD4',
      hover: '#115E59',
    },
    status: {
      success: '#10B981',
      successLight: 'rgba(16, 185, 129, 0.1)',
      warning: '#F59E0B',
      warningLight: 'rgba(245, 158, 11, 0.1)',
      error: '#EF4444',
      errorLight: 'rgba(239, 68, 68, 0.1)',
      info: '#3B82F6',
      infoLight: 'rgba(59, 130, 246, 0.1)',
    },
    chart: {
      line1: '#0F766E',
      line2: '#10B981',
      line3: '#F59E0B',
      line4: '#EF4444',
    },
    skeleton: {
      base: '#E2E8F0',
      highlight: '#F1F5F9',
    },
  },
} as const;
