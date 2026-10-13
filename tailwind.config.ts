import type { Config } from 'tailwindcss';

/**
 * Tailwind is wired to CSS custom properties so the runtime theme engine can
 * swap an entire brand palette without rebuilding. Tokens are defined in
 * `src/theme/applyTheme.ts` and injected onto `:root`.
 *
 * `<alpha-value>` lets utilities like `bg-accent/40` work with rgb channel vars.
 */
const withVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: withVar('--c-bg'),
          elevated: withVar('--c-bg-elevated'),
          inset: withVar('--c-bg-inset'),
        },
        surface: {
          DEFAULT: withVar('--c-surface'),
          hover: withVar('--c-surface-hover'),
          border: withVar('--c-surface-border'),
        },
        content: {
          DEFAULT: withVar('--c-text'),
          muted: withVar('--c-text-muted'),
          subtle: withVar('--c-text-subtle'),
        },
        accent: {
          DEFAULT: withVar('--c-accent'),
          strong: withVar('--c-accent-strong'),
          soft: withVar('--c-accent-soft'),
          contrast: withVar('--c-accent-contrast'),
        },
        positive: withVar('--c-positive'),
        warning: withVar('--c-warning'),
        danger: withVar('--c-danger'),
        info: withVar('--c-info'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        theme: 'var(--radius)',
        'theme-lg': 'calc(var(--radius) * 1.6)',
        'theme-sm': 'calc(var(--radius) * 0.5)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.25), 0 8px 40px -12px rgb(var(--c-accent) / 0.45)',
        card: '0 1px 0 0 rgb(var(--c-surface-border) / 0.6), 0 18px 50px -24px rgb(0 0 0 / 0.7)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-in-fast': 'fade-in-fast 0.25s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.215,0.61,0.355,1) infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
