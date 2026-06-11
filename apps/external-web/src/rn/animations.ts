import type { ViewStyle, TextStyle } from 'react-native';

// Animation helpers for inline styles
// Use CSS classes from globals.css for actual animations

export const staggerDelays = (count: number, base = 80): string[] =>
  Array.from({ length: count }, (_, i) => `${i * base}ms`);

export const fadeIn = { animation: 'fadeIn 0.5s ease-in-out' } as any as ViewStyle;
export const slideUp = { animation: 'slideUp 0.5s ease-out' } as any as ViewStyle;
export const fadeInUp = { animation: 'fadeInUp 0.6s ease-out forwards' } as any as ViewStyle;
export const fadeInScale = { animation: 'fadeInScale 0.4s ease-out forwards' } as any as ViewStyle;

export const getStaggerStyle = (index: number, base = 80): ViewStyle => ({
  opacity: 0,
  ...({ animation: `fadeInUp 0.6s ease-out ${index * base}ms forwards` } as any),
});

export function webStyle<T extends Record<string, any>>(style: T): ViewStyle {
  return style as unknown as ViewStyle;
}
