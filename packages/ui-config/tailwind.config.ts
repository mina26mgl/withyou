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
        partner: {
          bg: '#FAFCFD',
          card: '#FFFFFF',
          ink: '#1F2B24',
          muted: '#6B7A71',
          border: '#E6ECEA',
          heading: '#173A24',
          cta: '#173A24',
          ctaHover: '#24523A',
          leaf: '#3A9A5E',
          leafBg: '#EAF6EE',
          sky1: '#D3E9F2',
          sky2: '#F1F8FA',
          soft: '#EEF6F8',
          warn: '#9A6414',
          warnBg: '#FBF0DA',
          danger: '#B23F36',
          dangerBg: '#F9E2DF',
          info: '#2B6982',
          infoBg: '#E4EFF4',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        partner: ['var(--font-figtree)', 'system-ui', 'sans-serif'],
        'partner-heading': ['var(--font-dm-serif)', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
};

export default baseConfig;
