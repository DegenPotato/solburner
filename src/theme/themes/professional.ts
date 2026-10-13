import type { Theme } from '../types';

/**
 * Professional — dark, modern, Solana-inspired green. The default brand.
 */
export const professionalTheme: Theme = {
  id: 'professional',
  label: 'Professional',
  scheme: 'dark',
  colors: {
    bg: '8 11 9',
    bgElevated: '13 17 14',
    bgInset: '5 7 6',
    surface: '18 23 20',
    surfaceHover: '24 31 26',
    surfaceBorder: '38 48 41',
    text: '233 242 236',
    textMuted: '150 165 156',
    textSubtle: '101 114 106',
    accent: '34 224 122',
    accentStrong: '22 200 104',
    accentSoft: '34 224 122',
    accentContrast: '6 18 11',
    positive: '52 211 153',
    warning: '245 191 79',
    danger: '248 113 113',
    info: '96 165 250',
  },
  fonts: {
    sans: "'Inter', system-ui",
    display: "'Inter', system-ui",
    mono: "'JetBrains Mono', ui-monospace",
    webfontHrefs: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
    ],
  },
  decor: {
    appBackground:
      'radial-gradient(1200px 600px at 50% -10%, rgb(34 224 122 / 0.10), transparent 60%), linear-gradient(180deg, rgb(8 11 9), rgb(6 8 7))',
    heroBackground:
      'radial-gradient(800px 400px at 50% 0%, rgb(34 224 122 / 0.16), transparent 70%)',
    pixelAccents: false,
    radiusPx: 14,
    motion: 'snappy',
  },
};
