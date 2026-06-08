export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  brand: {
    primary: '#FF6B00',
    light: 'rgba(255, 107, 0, 0.15)',
    hover: '#E86200',
    muted: '#FF914D',
  },

  dark: {
    bg: {
      primary: '#070708',
      secondary: '#0E0E10',
      tertiary: '#1C1C1E',
      card: '#131315',
      elevated: '#1A1A1D',
      overlay: 'rgba(0, 0, 0, 0.6)',
      glass: 'rgba(255, 255, 255, 0.04)',
      glassLight: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#8E8E93',
      tertiary: '#636366',
      inverse: '#070708',
      link: '#FF6B00',
    },
    brand: {
      primary: '#FF6B00',
      light: 'rgba(255, 107, 0, 0.15)',
      hover: '#E86200',
      muted: '#FF914D',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.1)',
      active: 'rgba(255, 255, 255, 0.2)',
    },
    accent: {
      primary: '#FF6B00',
      secondary: '#FF914D',
      tertiary: '#FFB380',
      hover: '#E86200',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.15)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.15)',
      error: '#FF4545',
      errorLight: 'rgba(255, 69, 69, 0.15)',
      info: '#FF6B00',
      infoLight: 'rgba(255, 107, 0, 0.15)',
    },
    chart: {
      line1: '#FF6B00',
      line2: '#34C759',
      line3: '#FF9F0A',
      line4: '#FF4545',
    },
    skeleton: {
      base: '#131315',
      highlight: '#242427',
    },
  },

  light: {
    bg: {
      primary: '#F5F5F7',
      secondary: '#FFFFFF',
      tertiary: '#F0F0F5',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.3)',
      glass: 'rgba(255, 255, 255, 0.7)',
      glassLight: 'rgba(255, 255, 255, 0.9)',
    },
    text: {
      primary: '#1C1C1E',
      secondary: '#8E8E93',
      tertiary: '#C7C7CC',
      inverse: '#FFFFFF',
      link: '#FF6B00',
    },
    brand: {
      primary: '#FF6B00',
      light: 'rgba(255, 107, 0, 0.15)',
      hover: '#E86200',
      muted: '#FF914D',
    },
    border: {
      subtle: 'rgba(0, 0, 0, 0.06)',
      default: 'rgba(0, 0, 0, 0.1)',
      active: 'rgba(0, 0, 0, 0.2)',
    },
    accent: {
      primary: '#FF6B00',
      secondary: '#FF914D',
      tertiary: '#FFB380',
      hover: '#E86200',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.1)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.1)',
      error: '#FF4545',
      errorLight: 'rgba(255, 69, 69, 0.1)',
      info: '#FF6B00',
      infoLight: 'rgba(255, 107, 0, 0.1)',
    },
    chart: {
      line1: '#FF6B00',
      line2: '#34C759',
      line3: '#FF9F0A',
      line4: '#FF4545',
    },
    skeleton: {
      base: '#E8E8EE',
      highlight: '#F5F0FF',
    },
  },
} as const;
