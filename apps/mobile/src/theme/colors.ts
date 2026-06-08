export type DarkPalette = typeof palette.dark;
export type LightPalette = typeof palette.light;

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  brand: {
    primary: '#F5D68E',
    light: 'rgba(245, 214, 142, 0.18)',
    hover: '#EAC47A',
    muted: '#F7DEA0',
  },

  dark: {
    bg: {
      primary: '#1A1835',
      secondary: '#212048',
      tertiary: '#2B2958',
      card: '#1E1C3E',
      elevated: '#252349',
      overlay: 'rgba(0, 0, 0, 0.6)',
      glass: 'rgba(245, 214, 142, 0.05)',
      glassLight: 'rgba(245, 214, 142, 0.09)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#D4CCE6',
      tertiary: '#9A8EB8',
      inverse: '#1A1835',
      link: '#F5D68E',
    },
    brand: {
      primary: '#F5D68E',
      light: 'rgba(245, 214, 142, 0.18)',
      hover: '#EAC47A',
      muted: '#F7DEA0',
    },
    border: {
      subtle: 'rgba(245, 214, 142, 0.07)',
      default: 'rgba(245, 214, 142, 0.14)',
      active: 'rgba(245, 214, 142, 0.28)',
    },
    accent: {
      primary: '#F5D68E',
      secondary: '#F7DEA0',
      tertiary: '#F9E6B5',
      hover: '#EAC47A',
    },
    status: {
      success: '#4CDE7A',
      successLight: 'rgba(76, 222, 122, 0.18)',
      warning: '#FFB347',
      warningLight: 'rgba(255, 179, 71, 0.18)',
      error: '#FF5E5E',
      errorLight: 'rgba(255, 94, 94, 0.18)',
      info: '#F5D68E',
      infoLight: 'rgba(245, 214, 142, 0.18)',
    },
    chart: {
      line1: '#F5D68E',
      line2: '#4CDE7A',
      line3: '#FFB347',
      line4: '#FF5E5E',
    },
    skeleton: {
      base: '#212048',
      highlight: '#2B2958',
    },
  },

  light: {
    bg: {
      primary: '#F7F3EC',
      secondary: '#FFFFFF',
      tertiary: '#EFE9DE',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.3)',
      glass: 'rgba(255, 255, 255, 0.7)',
      glassLight: 'rgba(255, 255, 255, 0.9)',
    },
    text: {
      primary: '#1A1835',
      secondary: '#63587A',
      tertiary: '#9A8EB8',
      inverse: '#FFFFFF',
      link: '#A07D10',
    },
    brand: {
      primary: '#A07D10',
      light: 'rgba(160, 125, 16, 0.12)',
      hover: '#8A6A0E',
      muted: '#C8A43E',
    },
    border: {
      subtle: 'rgba(0, 0, 0, 0.06)',
      default: 'rgba(0, 0, 0, 0.1)',
      active: 'rgba(0, 0, 0, 0.2)',
    },
    accent: {
      primary: '#A07D10',
      secondary: '#C8A43E',
      tertiary: '#E0C66A',
      hover: '#8A6A0E',
    },
    status: {
      success: '#34C759',
      successLight: 'rgba(52, 199, 89, 0.1)',
      warning: '#FF9F0A',
      warningLight: 'rgba(255, 159, 10, 0.1)',
      error: '#FF4545',
      errorLight: 'rgba(255, 69, 69, 0.1)',
      info: '#A07D10',
      infoLight: 'rgba(160, 125, 16, 0.1)',
    },
    chart: {
      line1: '#A07D10',
      line2: '#34C759',
      line3: '#FF9F0A',
      line4: '#FF4545',
    },
    skeleton: {
      base: '#E8E4DC',
      highlight: '#F2EEE6',
    },
  },
} as const;
