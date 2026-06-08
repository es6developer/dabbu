export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  brand: {
    primary: '#F3D28F',
    light: 'rgba(243, 210, 143, 0.15)',
    hover: '#E8C47A',
    muted: '#F5DBA0',
  },

  dark: {
    bg: {
      primary: '#1A1528',
      secondary: '#211D35',
      tertiary: '#2A2540',
      card: '#1A1528',
      elevated: '#231E38',
      overlay: 'rgba(0, 0, 0, 0.6)',
      glass: 'rgba(243, 210, 143, 0.04)',
      glassLight: 'rgba(243, 210, 143, 0.08)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#C4B9D4',
      tertiary: '#8E82A3',
      inverse: '#1A1528',
      link: '#F3D28F',
    },
    brand: {
      primary: '#F3D28F',
      light: 'rgba(243, 210, 143, 0.15)',
      hover: '#E8C47A',
      muted: '#F5DBA0',
    },
    border: {
      subtle: 'rgba(243, 210, 143, 0.06)',
      default: 'rgba(243, 210, 143, 0.12)',
      active: 'rgba(243, 210, 143, 0.25)',
    },
    accent: {
      primary: '#F3D28F',
      secondary: '#F5DBA0',
      tertiary: '#F7E3B5',
      hover: '#E8C47A',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.15)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.15)',
      error: '#FF4545',
      errorLight: 'rgba(255, 69, 69, 0.15)',
      info: '#F3D28F',
      infoLight: 'rgba(243, 210, 143, 0.15)',
    },
    chart: {
      line1: '#F3D28F',
      line2: '#34C759',
      line3: '#FF9F0A',
      line4: '#FF4545',
    },
    skeleton: {
      base: '#211D35',
      highlight: '#2A2540',
    },
  },

  light: {
    bg: {
      primary: '#F8F6F0',
      secondary: '#FFFFFF',
      tertiary: '#F0EDE5',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.3)',
      glass: 'rgba(255, 255, 255, 0.7)',
      glassLight: 'rgba(255, 255, 255, 0.9)',
    },
    text: {
      primary: '#1A1528',
      secondary: '#6B5F80',
      tertiary: '#9A8EB0',
      inverse: '#FFFFFF',
      link: '#B8860B',
    },
    brand: {
      primary: '#B8860B',
      light: 'rgba(184, 134, 11, 0.12)',
      hover: '#A07508',
      muted: '#D4A853',
    },
    border: {
      subtle: 'rgba(0, 0, 0, 0.06)',
      default: 'rgba(0, 0, 0, 0.1)',
      active: 'rgba(0, 0, 0, 0.2)',
    },
    accent: {
      primary: '#B8860B',
      secondary: '#D4A853',
      tertiary: '#E8C47A',
      hover: '#A07508',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.1)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.1)',
      error: '#FF4545',
      errorLight: 'rgba(255, 69, 69, 0.1)',
      info: '#B8860B',
      infoLight: 'rgba(184, 134, 11, 0.1)',
    },
    chart: {
      line1: '#B8860B',
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
