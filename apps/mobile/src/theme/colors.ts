export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  brand: {
    primary: '#7C3AED',
    hover: '#6D28D9',
    muted: '#A78BFA',
  },

  // ── WEALTH COLORS ───────────────────────────────────────────
  // Primary Purple:  #7C3AED  – brand
  // Income Green:    #16A34A  – earnings
  // Expense Red:     #DC2626  – spending
  // Goal Gold:       #F59E0B  – dreams
  // Net Worth Blue:  #2563EB  – total wealth
  // Canvas:          #F8FAFC  – ultra-clean
  light: {
    bg: {
      primary: '#F8FAFC',
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
      link: '#7C3AED',
      success: '#15803D',
    },
    brand: {
      primary: '#7C3AED',
      light: 'rgba(124, 58, 237, 0.12)',
      hover: '#6D28D9',
      muted: '#A78BFA',
    },
    border: {
      subtle: '#E5E7EB',
      default: '#D1D5DB',
      active: 'rgba(124, 58, 237, 0.25)',
    },
    accent: {
      primary: '#7C3AED',
      secondary: '#8B5CF6',
      tertiary: '#A78BFA',
      hover: '#6D28D9',
    },
    status: {
      success: '#16A34A',
      successLight: 'rgba(22, 163, 74, 0.12)',
      warning: '#F59E0B',
      warningLight: 'rgba(245, 158, 11, 0.12)',
      error: '#DC2626',
      errorLight: 'rgba(220, 38, 38, 0.12)',
      info: '#2563EB',
      infoLight: 'rgba(37, 99, 235, 0.12)',
    },
    chart: {
      netWorth: '#2563EB',
      income: '#16A34A',
      expense: '#DC2626',
      goals: '#F59E0B',
    },
    skeleton: {
      base: '#E5E7EB',
      highlight: '#F3F4F6',
    },
    shadow: 'rgba(0, 0, 0, 0.04)',
  },

  // ── COUPLE LIGHT ────────────────────────────────────────────
  // Pink-tinted light palette for couple mode
  coupleLight: {
    bg: {
      primary: '#fdf2f8',
      secondary: '#ffffff',
      tertiary: '#fce7f3',
      card: '#ffffff',
      elevated: '#ffffff',
      highlight: '#fce7f3',
      overlay: 'rgba(0, 0, 0, 0.20)',
      glass: 'rgba(236, 72, 153, 0.04)',
      glassLight: 'rgba(236, 72, 153, 0.08)',
    },
    card: {
      balance: '#fce7f3',
      income: '#ecfdf5',
      expense: '#fef2f2',
      savings: '#fdf2f8',
      budget: '#ffffff',
      default: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      tertiary: '#6b7280',
      inverse: '#ffffff',
      link: '#ec4899',
      success: '#047857',
    },
    brand: {
      primary: '#ec4899',
      light: 'rgba(236, 72, 153, 0.12)',
      hover: '#db2777',
      muted: '#f9a8d4',
    },
    border: {
      subtle: '#fbcfe8',
      default: '#f9a8d4',
      active: 'rgba(236, 72, 153, 0.25)',
    },
    accent: {
      primary: '#ec4899',
      secondary: '#f472b6',
      tertiary: '#f9a8d4',
      hover: '#db2777',
    },
    status: {
      success: '#10b981',
      successLight: 'rgba(16, 185, 129, 0.12)',
      warning: '#f59e0b',
      warningLight: 'rgba(245, 158, 11, 0.12)',
      error: '#ef4444',
      errorLight: 'rgba(239, 68, 68, 0.12)',
      info: '#3b82f6',
      infoLight: 'rgba(59, 130, 246, 0.12)',
    },
    chart: {
      line1: '#ec4899',
      line2: '#10b981',
      line3: '#f59e0b',
      line4: '#ef4444',
    },
    skeleton: {
      base: '#fbcfe8',
      highlight: '#fdf2f8',
    },
    shadow: 'rgba(236, 72, 153, 0.08)',
  },

  // ── COUPLE DARK ─────────────────────────────────────────────
  // Pink-tinted dark palette for couple mode
  coupleDark: {
    bg: {
      primary: '#1a0a14',
      secondary: '#1f0f1a',
      tertiary: '#2a1525',
      card: '#1f0f1a',
      elevated: '#2a1525',
      highlight: '#3a1025',
      overlay: 'rgba(0, 0, 0, 0.75)',
      glass: 'rgba(236, 72, 153, 0.05)',
      glassLight: 'rgba(236, 72, 153, 0.10)',
    },
    card: {
      balance: '#3a1025',
      income: '#1a2e1a',
      expense: '#3a1010',
      savings: '#2a1035',
      budget: '#1f0f1a',
      default: '#1f0f1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#e8b4c8',
      tertiary: '#c88aa4',
      inverse: '#1a0a14',
      link: '#ff6b9d',
      success: '#064e3b',
    },
    brand: {
      primary: '#ff6b9d',
      light: 'rgba(255, 107, 157, 0.18)',
      hover: '#ff8fb3',
      muted: '#ffb3cc',
    },
    border: {
      subtle: '#2a1525',
      default: '#3a2030',
      active: 'rgba(255, 107, 157, 0.40)',
    },
    accent: {
      primary: '#ff6b9d',
      secondary: '#ff8fb3',
      tertiary: '#ffb3cc',
      hover: '#ec4899',
    },
    status: {
      success: '#00e676',
      successLight: 'rgba(0, 230, 118, 0.18)',
      warning: '#fbbf24',
      warningLight: 'rgba(251, 191, 36, 0.18)',
      error: '#fb7185',
      errorLight: 'rgba(251, 113, 133, 0.18)',
      info: '#60a5fa',
      infoLight: 'rgba(96, 165, 250, 0.18)',
    },
    chart: {
      line1: '#ff6b9d',
      line2: '#00e676',
      line3: '#fbbf24',
      line4: '#fb7185',
    },
    skeleton: {
      base: '#2a1525',
      highlight: '#3a2030',
    },
    shadow: 'rgba(255, 107, 157, 0.15)',
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
      netWorth: '#60A5FA',
      income: '#4ADE80',
      expense: '#FB7185',
      goals: '#FBBF24',
    },
    skeleton: {
      base: '#1A1A1E',
      highlight: '#2A2A2E',
    },
    shadow: 'rgba(0, 0, 0, 0.55)',
  },
} as const;
