/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Surface & Canvas ─────────────────────────────────
        canvas: '#F3F4F6',
        surface: '#FFFFFF',
        'surface-raised': '#FFFFFF',
        'surface-highlight': '#F3E8FF',
        'dark-canvas': '#0B0813',
        'dark-surface': '#121214',
        'dark-surface-raised': '#1A1A1E',
        'dark-surface-highlight': '#2E1065',

        // ── Text ─────────────────────────────────────────────
        ink: '#0F172A',
        'ink-muted': '#64748B',
        'ink-faint': '#94A3B8',
        'ink-inverse': '#FFFFFF',
        'ink-link': '#8B5CF6',
        'dark-ink': '#FFFFFF',
        'dark-ink-muted': '#94A3B8',
        'dark-ink-faint': '#64748B',
        'dark-ink-inverse': '#000000',
        'dark-ink-link': '#A78BFA',

        // ── Border ───────────────────────────────────────────
        'border-subtle': '#F3F4F6',
        'border-default': '#E5E7EB',
        'border-active': '#8B5CF6',
        'dark-border-subtle': '#1E1E22',
        'dark-border-default': '#2A2A2E',
        'dark-border-active': '#A78BFA',

        // ── Brand (violet family) ────────────────────────────
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },

        // ── Status ───────────────────────────────────────────
        success: '#10B981',
        'success-light': 'rgba(16, 185, 129, 0.12)',
        'success-text': '#047857',
        warning: '#F59E0B',
        'warning-light': 'rgba(245, 158, 11, 0.12)',
        expense: '#EF4444',
        'expense-light': 'rgba(239, 68, 68, 0.12)',
        info: '#3B82F6',
        'info-light': 'rgba(59, 130, 246, 0.12)',

        // ── Status (dark mode) ───────────────────────────────
        'dark-success': '#00E676',
        'dark-success-light': 'rgba(0, 230, 118, 0.18)',
        'dark-success-text': '#064E3B',
        'dark-warning': '#FBBF24',
        'dark-warning-light': 'rgba(251, 191, 36, 0.18)',
        'dark-expense': '#FB7185',
        'dark-expense-light': 'rgba(251, 113, 133, 0.18)',
        'dark-info': '#60A5FA',
        'dark-info-light': 'rgba(96, 165, 250, 0.18)',

        // ── Chart ────────────────────────────────────────────
        chart: { 1: '#8B5CF6', 2: '#10B981', 3: '#F59E0B', 4: '#EF4444' },
        'dark-chart': { 1: '#A78BFA', 2: '#00E676', 3: '#FBBF24', 4: '#FB7185' },
      },

      fontFamily: {
        sans: ['Inter-Regular'],
        'sans-medium': ['Inter-Medium'],
        'sans-semibold': ['Inter-SemiBold'],
        'sans-bold': ['Inter-Bold'],
        mono: ['JetBrainsMono-Regular'],
        'mono-medium': ['JetBrainsMono-Medium'],
      },

      fontSize: {
        hero: ['34px', { fontFamily: 'Inter-Bold', lineHeight: '41px', letterSpacing: '-0.5px', fontWeight: '700' }],
        display: ['28px', { fontFamily: 'Inter-Bold', lineHeight: '34px', letterSpacing: '-0.3px', fontWeight: '700' }],
        title: ['24px', { fontFamily: 'Inter-SemiBold', lineHeight: '30px', letterSpacing: '-0.2px', fontWeight: '600' }],
        heading: ['20px', { fontFamily: 'Inter-SemiBold', lineHeight: '26px', letterSpacing: '-0.1px', fontWeight: '600' }],
        subhead: ['16px', { fontFamily: 'Inter-SemiBold', lineHeight: '22px', fontWeight: '600' }],
        body: ['14px', { fontFamily: 'Inter-Regular', lineHeight: '20px', fontWeight: '400' }],
        'body-bold': ['14px', { fontFamily: 'Inter-SemiBold', lineHeight: '20px', fontWeight: '600' }],
        caption: ['12px', { fontFamily: 'Inter-Regular', lineHeight: '16px', fontWeight: '400' }],
        'caption-bold': ['12px', { fontFamily: 'Inter-SemiBold', lineHeight: '16px', fontWeight: '600' }],
        small: ['11px', { fontFamily: 'Inter-Regular', lineHeight: '14px', fontWeight: '400' }],
        micro: ['10px', { fontFamily: 'Inter-Medium', lineHeight: '12px', fontWeight: '500' }],
      },

      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        pill: '9999px',
      },

      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.03)',
        md: '0 2px 6px rgba(0,0,0,0.04)',
        lg: '0 4px 12px rgba(0,0,0,0.05)',
        xl: '0 8px 24px rgba(0,0,0,0.06)',
        '2xl': '0 12px 32px rgba(0,0,0,0.08)',
        'dark-sm': '0 1px 2px rgba(0,0,0,0.30)',
        'dark-md': '0 2px 6px rgba(0,0,0,0.40)',
        'dark-lg': '0 4px 12px rgba(0,0,0,0.50)',
        'dark-xl': '0 8px 24px rgba(0,0,0,0.55)',
        'dark-2xl': '0 12px 32px rgba(0,0,0,0.60)',
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

      spacing: {
        0.5: '2px',
        1.5: '6px',
        4.5: '18px',
        7.5: '30px',
        18: '72px',
        22: '88px',
      },
    },
  },
  plugins: [],
};
