export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  brand: {
    primary: '#8B5CF6',
    hover: '#7C3AED',
    muted: '#C4B5FD',
  },

  // ── PLATINUM LIGHT ──────────────────────────────────────────
  // Canvas:     #F3F4F6  – ultra-clean soft gray-white blend
  // Card base:  #FFFFFF  – pure white w/ #E5E7EB razor-thin border
  // Highlight:  #F3E8FF  – subtle pastel lavender wash
  // Text:       #0F172A  – sharp midnight black
  // Text muted: #64748B  – slate gray
  // Brand:      #8B5CF6  – royal orchid violet
  // Success:    #10B981  bg / #047857 text
  light: {
    bg: {
      primary: '#F3F4F6',
      secondary: '#FFFFFF',
      tertiary: '#F9FAFB',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      highlight: '#F3E8FF',
      overlay: 'rgba(0, 0, 0, 0.20)',
      glass: 'rgba(139, 92, 246, 0.04)',
      glassLight: 'rgba(139, 92, 246, 0.08)',
    },
    card: {
      balance: '#F3E8FF',
      income: '#ECFDF5',
      expense: '#FEF2F2',
      savings: '#F5F3FF',
      budget: '#FFFFFF',
      default: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      tertiary: '#6B7280',
      inverse: '#FFFFFF',
      link: '#8B5CF6',
      success: '#047857',
    },
    brand: {
      primary: '#8B5CF6',
      light: 'rgba(139, 92, 246, 0.12)',
      hover: '#7C3AED',
      muted: '#C4B5FD',
    },
    border: {
      subtle: '#E5E7EB',
      default: '#D1D5DB',
      active: 'rgba(139, 92, 246, 0.25)',
    },
    accent: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      tertiary: '#C4B5FD',
      hover: '#7C3AED',
    },
    status: {
      success: '#10B981',
      successLight: 'rgba(16, 185, 129, 0.12)',
      warning: '#F59E0B',
      warningLight: 'rgba(245, 158, 11, 0.12)',
      error: '#EF4444',
      errorLight: 'rgba(239, 68, 68, 0.12)',
      info: '#3B82F6',
      infoLight: 'rgba(59, 130, 246, 0.12)',
    },
    chart: {
      line1: '#8B5CF6',
      line2: '#10B981',
      line3: '#F59E0B',
      line4: '#EF4444',
    },
    skeleton: {
      base: '#E5E7EB',
      highlight: '#F3F4F6',
    },
    shadow: 'rgba(0, 0, 0, 0.04)',
  },

  // ── OBSIDIAN DARK ───────────────────────────────────────────
  // Canvas:     #000000  – deep OLED pure pitch black
  // Card base:  #121214  – sleek charcoal w/ #1E1E22 outline
  // Highlight:  #2E1065  – deep translucent dark purple
  // Text:       #FFFFFF  – crisp high-contrast white
  // Text muted: #94A3B8  – cool muted platinum gray
  // Brand:      #A78BFA  – vibrant neon violet
  // Success:    #00E676  bg / #064E3B text
  dark: {
    bg: {
      primary: '#000000',
      secondary: '#121214',
      tertiary: '#1A1A1E',
      card: '#121214',
      elevated: '#1A1A1E',
      highlight: '#2E1065',
      overlay: 'rgba(0, 0, 0, 0.75)',
      glass: 'rgba(167, 139, 250, 0.05)',
      glassLight: 'rgba(167, 139, 250, 0.10)',
    },
    card: {
      balance: '#2E1065',
      income: '#064E3B',
      expense: '#450A0A',
      savings: '#1E1B4B',
      budget: '#121214',
      default: '#121214',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#94A3B8',
      tertiary: '#64748B',
      inverse: '#000000',
      link: '#A78BFA',
      success: '#064E3B',
    },
    brand: {
      primary: '#A78BFA',
      light: 'rgba(167, 139, 250, 0.18)',
      hover: '#C4B5FD',
      muted: '#DDD6FE',
    },
    border: {
      subtle: '#1E1E22',
      default: '#2A2A2E',
      active: 'rgba(167, 139, 250, 0.40)',
    },
    accent: {
      primary: '#A78BFA',
      secondary: '#C4B5FD',
      tertiary: '#DDD6FE',
      hover: '#8B5CF6',
    },
    status: {
      success: '#00E676',
      successLight: 'rgba(0, 230, 118, 0.18)',
      warning: '#FBBF24',
      warningLight: 'rgba(251, 191, 36, 0.18)',
      error: '#FB7185',
      errorLight: 'rgba(251, 113, 133, 0.18)',
      info: '#60A5FA',
      infoLight: 'rgba(96, 165, 250, 0.18)',
    },
    chart: {
      line1: '#A78BFA',
      line2: '#00E676',
      line3: '#FBBF24',
      line4: '#FB7185',
    },
    skeleton: {
      base: '#1A1A1E',
      highlight: '#2A2A2E',
    },
    shadow: 'rgba(0, 0, 0, 0.55)',
  },
} as const;
