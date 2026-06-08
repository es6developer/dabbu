export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  brand: {
    primary: '#4F46E5',
    light: 'rgba(79, 70, 229, 0.12)',
    hover: '#4338CA',
    muted: '#A5B4FC',
  },

  dark: {
    bg: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      card: '#1E293B',
      elevated: '#253349',
      overlay: 'rgba(0, 0, 0, 0.6)',
      glass: 'rgba(99, 102, 241, 0.06)',
      glassLight: 'rgba(99, 102, 241, 0.10)',
    },
    card: {
      balance: '#1E1B4B',
      income: '#052E16',
      expense: '#450A0A',
      savings: '#312E81',
      budget: '#1E293B',
      default: '#1E293B',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
      inverse: '#0F172A',
      link: '#6366F1',
    },
    brand: {
      primary: '#6366F1',
      light: 'rgba(99, 102, 241, 0.18)',
      hover: '#4F46E5',
      muted: '#A5B4FC',
    },
    border: {
      subtle: 'rgba(51, 65, 85, 0.5)',
      default: '#334155',
      active: 'rgba(99, 102, 241, 0.4)',
    },
    accent: {
      primary: '#6366F1',
      secondary: '#818CF8',
      tertiary: '#A5B4FC',
      hover: '#4F46E5',
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
      line1: '#6366F1',
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
      glass: 'rgba(79, 70, 229, 0.05)',
      glassLight: 'rgba(79, 70, 229, 0.09)',
    },
    card: {
      balance: '#EEF2FF',
      income: '#ECFDF5',
      expense: '#FEF2F2',
      savings: '#F5F3FF',
      budget: '#FFFFFF',
      default: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      tertiary: '#94A3B8',
      inverse: '#FFFFFF',
      link: '#4F46E5',
    },
    brand: {
      primary: '#4F46E5',
      light: 'rgba(79, 70, 229, 0.12)',
      hover: '#4338CA',
      muted: '#A5B4FC',
    },
    border: {
      subtle: 'rgba(226, 232, 240, 0.6)',
      default: '#E2E8F0',
      active: 'rgba(79, 70, 229, 0.25)',
    },
    accent: {
      primary: '#4F46E5',
      secondary: '#6366F1',
      tertiary: '#818CF8',
      hover: '#4338CA',
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
      line1: '#4F46E5',
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
