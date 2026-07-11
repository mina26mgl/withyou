import type { Config } from 'tailwindcss';

/**
 * Shared base Tailwind theme for WithYou apps. Mobile-first breakpoints:
 * base = 375px, sm = 430px, md = 768px, lg = 1024px.
 */
const baseConfig: Partial<Config> = {
  theme: {
    screens: {
      sm: '375px',
      md: '430px',
      lg: '768px',
      xl: '1024px',
    },
    extend: {
      colors: {
        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          900: '#4C1D95',
        },
        secondary: {
          50: '#FFF0F5',
          100: '#FFE4EF',
          500: '#EC4899',
          600: '#DB2777',
        },
        withyou: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          text: '#1A1A1A',
          muted: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
};

export default baseConfig;
