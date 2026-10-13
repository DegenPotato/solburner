import type { Theme } from '../types';

/**
 * Minimal — security-first, clean, near-monochrome with a restrained teal accent.
 * Light scheme to signal a "white-hat" aesthetic distinct from the dark brands.
 */
export const minimalTheme: Theme = {
  id: 'minimal',
  label: 'Minimal',
  scheme: 'light',
  colors: {
    bg: '247 248 248',
    bgElevated: '255 255 255',
    bgInset: '241 243 243',
    surface: '255 255 255',
    surfaceHover: '244 246 246',
    surfaceBorder: '223 227 227',
    text: '24 30 28',
    textMuted: '88 99 95',
    textSubtle: '140 150 146',
    accent: '13 148 136',
    accentStrong: '15 118 110',
    accentSoft: '13 148 136',
    accentContrast: '255 255 255',
    positive: '16 138 92',
    warning: '180 132 20',
    danger: '200 54 54',
    info: '37 99 235',
  },
  fonts: {
    sans: "'Inter', system-ui",
    display: "'Inter', system-ui",
    mono: "'JetBrains Mono', ui-monospace",
    webfontHrefs: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    ],
  },
  decor: {
    appBackground:
      'linear-gradient(180deg, rgb(247 248 248), rgb(241 243 243))',
    heroBackground:
      'radial-gradient(700px 320px at 50% 0%, rgb(13 148 136 / 0.08), transparent 70%)',
    pixelAccents: false,
    radiusPx: 10,
    motion: 'calm',
  },
};
