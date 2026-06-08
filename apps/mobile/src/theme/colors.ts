export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  brand: {
    primary: '#D9700A',
    light: 'rgba(217, 112, 10, 0.15)',
    hover: '#C05F00',
    muted: '#E88D3A',
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
      link: '#D9700A',
    },
    brand: {
      primary: '#D9700A',
      light: 'rgba(217, 112, 10, 0.15)',
      hover: '#C05F00',
      muted: '#E88D3A',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.1)',
      active: 'rgba(255, 255, 255, 0.2)',
    },
    accent: {
      primary: '#D9700A',
      secondary: '#E88D3A',
      tertiary: '#F0A866',
      hover: '#C05F00',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.15)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.15)',
      error: '#FF4545',
      errorLight: 'rgba(255, 69, 69, 0.15)',
      info: '#D9700A',
      infoLight: 'rgba(217, 112, 10, 0.15)',
    },
    chart: {
      line1: '#D9700A',
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
      link: '#D9700A',
    },
    brand: {
      primary: '#D9700A',
      light: 'rgba(217, 112, 10, 0.15)',
      hover: '#C05F00',
      muted: '#E88D3A',
    },
    border: {
      subtle: 'rgba(0, 0, 0, 0.06)',
      default: 'rgba(0, 0, 0, 0.1)',
      active: 'rgba(0, 0, 0, 0.2)',
    },
    accent: {
      primary: '#D9700A',
      secondary: '#E88D3A',
      tertiary: '#F0A866',
      hover: '#C05F00',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.1)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.1)',
      error: '#FF4545',
      errorLight: 'rgba(255, 69, 69, 0.1)',
      info: '#D9700A',
      infoLight: 'rgba(217, 112, 10, 0.1)',
    },
    chart: {
      line1: '#D9700A',
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
