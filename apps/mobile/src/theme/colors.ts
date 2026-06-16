export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  brand: {
    primary: '#007AFF',
    hover: '#0056CC',
    muted: '#5AC8FA',
  },

  // ── iOS LIGHT ────────────────────────────────────────────────
  // System Background (grouped): #F2F2F7
  // System Background:           #FFFFFF
  // Label:                       #000000
  // Secondary Label:             #3C3C4399
  // Separator:                   #C6C6C8
  light: {
    bg: {
      primary: '#F2F2F7',
      secondary: '#FFFFFF',
      tertiary: '#F2F2F7',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      highlight: '#007AFF14',
      overlay: 'rgba(0, 0, 0, 0.20)',
      glass: 'rgba(0, 122, 255, 0.04)',
      glassLight: 'rgba(0, 122, 255, 0.08)',
    },
    card: {
      balance: '#EBF5FF',
      income: '#E8F8E8',
      expense: '#FFEBEB',
      savings: '#EBF5FF',
      budget: '#FFFFFF',
      default: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#3C3C4399',
      tertiary: '#3C3C434C',
      inverse: '#FFFFFF',
      link: '#007AFF',
      success: '#34C759',
    },
    brand: {
      primary: '#007AFF',
      light: 'rgba(0, 122, 255, 0.12)',
      hover: '#0056CC',
      muted: '#5AC8FA',
    },
    border: {
      subtle: '#C6C6C8',
      default: '#C6C6C8',
      active: 'rgba(0, 122, 255, 0.25)',
    },
    accent: {
      primary: '#007AFF',
      secondary: '#34AADC',
      tertiary: '#5AC8FA',
      hover: '#0056CC',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.12)',
      warning: '#FF9500',
      warningLight: 'rgba(255, 149, 0, 0.12)',
      error: '#FF3B30',
      errorLight: 'rgba(255, 59, 48, 0.12)',
      info: '#007AFF',
      infoLight: 'rgba(0, 122, 255, 0.12)',
    },
    chart: {
      netWorth: '#007AFF',
      income: '#34C759',
      expense: '#FF3B30',
      goals: '#FF9500',
    },
    skeleton: {
      base: '#E5E5EA',
      highlight: '#F2F2F7',
    },
    shadow: 'rgba(0, 0, 0, 0.08)',
  },

  // ── COUPLE LIGHT ────────────────────────────────────────────
  // Pink-tinted iOS palette
  coupleLight: {
    bg: {
      primary: '#FFF2F7',
      secondary: '#FFFFFF',
      tertiary: '#FFF2F7',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      highlight: '#FF2D5514',
      overlay: 'rgba(0, 0, 0, 0.20)',
      glass: 'rgba(255, 45, 85, 0.04)',
      glassLight: 'rgba(255, 45, 85, 0.08)',
    },
    card: {
      balance: '#FFEBF0',
      income: '#E8F8E8',
      expense: '#FFEBEB',
      savings: '#FFF2F7',
      budget: '#FFFFFF',
      default: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#3C3C4399',
      tertiary: '#3C3C434C',
      inverse: '#FFFFFF',
      link: '#FF2D55',
      success: '#34C759',
    },
    brand: {
      primary: '#FF2D55',
      light: 'rgba(255, 45, 85, 0.12)',
      hover: '#D6234A',
      muted: '#FF8FA8',
    },
    border: {
      subtle: '#C6C6C8',
      default: '#C6C6C8',
      active: 'rgba(255, 45, 85, 0.25)',
    },
    accent: {
      primary: '#FF2D55',
      secondary: '#FF6482',
      tertiary: '#FF8FA8',
      hover: '#D6234A',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.12)',
      warning: '#FF9500',
      warningLight: 'rgba(255, 149, 0, 0.12)',
      error: '#FF3B30',
      errorLight: 'rgba(255, 59, 48, 0.12)',
      info: '#007AFF',
      infoLight: 'rgba(0, 122, 255, 0.12)',
    },
    chart: {
      line1: '#FF2D55',
      line2: '#34C759',
      line3: '#FF9500',
      line4: '#FF3B30',
    },
    skeleton: {
      base: '#E5E5EA',
      highlight: '#FFF2F7',
    },
    shadow: 'rgba(255, 45, 85, 0.08)',
  },

  // ── COUPLE DARK ─────────────────────────────────────────────
  // Pink-tinted dark palette
  coupleDark: {
    bg: {
      primary: '#1C1C1E',
      secondary: '#2C2C2E',
      tertiary: '#3A3A3C',
      card: '#2C2C2E',
      elevated: '#3A3A3C',
      highlight: '#FF2D5526',
      overlay: 'rgba(0, 0, 0, 0.75)',
      glass: 'rgba(255, 45, 85, 0.05)',
      glassLight: 'rgba(255, 45, 85, 0.10)',
    },
    card: {
      balance: '#3A1C24',
      income: '#1C3A1C',
      expense: '#3A1C1C',
      savings: '#2C1C3A',
      budget: '#2C2C2E',
      default: '#2C2C2E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#EBEBF599',
      tertiary: '#EBEBF54C',
      inverse: '#000000',
      link: '#FF6482',
      success: '#30D158',
    },
    brand: {
      primary: '#FF6482',
      light: 'rgba(255, 100, 130, 0.18)',
      hover: '#FF8FA8',
      muted: '#FFB3C6',
    },
    border: {
      subtle: '#38383A',
      default: '#48484A',
      active: 'rgba(255, 100, 130, 0.40)',
    },
    accent: {
      primary: '#FF6482',
      secondary: '#FF8FA8',
      tertiary: '#FFB3C6',
      hover: '#D6234A',
    },
    status: {
      success: '#30D158',
      successLight: 'rgba(48, 209, 88, 0.18)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.18)',
      error: '#FF453A',
      errorLight: 'rgba(255, 69, 58, 0.18)',
      info: '#0A84FF',
      infoLight: 'rgba(10, 132, 255, 0.18)',
    },
    chart: {
      line1: '#FF6482',
      line2: '#30D158',
      line3: '#FF9F0A',
      line4: '#FF453A',
    },
    skeleton: {
      base: '#3A3A3C',
      highlight: '#48484A',
    },
    shadow: 'rgba(255, 100, 130, 0.15)',
  },

  // ── iOS DARK ─────────────────────────────────────────────────
  // System Background:           #000000
  // Secondary System Background: #1C1C1E
  // Label:                       #FFFFFF
  // Separator:                   #38383A
  dark: {
    bg: {
      primary: '#000000',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      card: '#1C1C1E',
      elevated: '#2C2C2E',
      highlight: '#0A84FF26',
      overlay: 'rgba(0, 0, 0, 0.75)',
      glass: 'rgba(10, 132, 255, 0.05)',
      glassLight: 'rgba(10, 132, 255, 0.10)',
    },
    card: {
      balance: '#002366',
      income: '#003D1A',
      expense: '#3D0000',
      savings: '#1A004D',
      budget: '#1C1C1E',
      default: '#1C1C1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#EBEBF599',
      tertiary: '#EBEBF54C',
      inverse: '#000000',
      link: '#0A84FF',
      success: '#30D158',
    },
    brand: {
      primary: '#0A84FF',
      light: 'rgba(10, 132, 255, 0.18)',
      hover: '#409CFF',
      muted: '#80C4FF',
    },
    border: {
      subtle: '#38383A',
      default: '#48484A',
      active: 'rgba(10, 132, 255, 0.40)',
    },
    accent: {
      primary: '#0A84FF',
      secondary: '#409CFF',
      tertiary: '#80C4FF',
      hover: '#0056CC',
    },
    status: {
      success: '#30D158',
      successLight: 'rgba(48, 209, 88, 0.18)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.18)',
      error: '#FF453A',
      errorLight: 'rgba(255, 69, 58, 0.18)',
      info: '#0A84FF',
      infoLight: 'rgba(10, 132, 255, 0.18)',
    },
    chart: {
      netWorth: '#0A84FF',
      income: '#30D158',
      expense: '#FF453A',
      goals: '#FF9F0A',
    },
    skeleton: {
      base: '#3A3A3C',
      highlight: '#48484A',
    },
    shadow: 'rgba(0, 0, 0, 0.55)',
  },
} as const;
