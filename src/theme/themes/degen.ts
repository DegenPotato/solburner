import type { Theme } from '../types';

/**
 * Degen — retro arcade, pixel accents, neon magenta + acid green highlights.
 */
export const degenTheme: Theme = {
  id: 'degen',
  label: 'Degen',
  scheme: 'dark',
  colors: {
    bg: '12 8 20',
    bgElevated: '19 12 32',
    bgInset: '8 5 14',
    surface: '24 15 40',
    surfaceHover: '34 21 56',
    surfaceBorder: '64 38 102',
    text: '240 234 255',
    textMuted: '178 156 214',
    textSubtle: '124 104 158',
    accent: '0 255 153',
    accentStrong: '0 224 134',
    accentSoft: '0 255 153',
    accentContrast: '10 6 18',
    positive: '0 255 153',
    warning: '255 214 64',
    danger: '255 71 122',
    info: '120 144 255',
  },
  fonts: {
    sans: "'Space Grotesk', system-ui",
    display: "'Press Start 2P', 'Space Grotesk', system-ui",
    mono: "'JetBrains Mono', ui-monospace",
    webfontHrefs: [
      'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
    ],
  },
  decor: {
    appBackground:
      'linear-gradient(180deg, rgb(12 8 20), rgb(8 5 14)), repeating-linear-gradient(0deg, rgb(255 71 122 / 0.04) 0 2px, transparent 2px 4px)',
    heroBackground:
      'radial-gradient(700px 360px at 50% 0%, rgb(255 71 122 / 0.18), transparent 70%), radial-gradient(700px 360px at 80% 10%, rgb(0 255 153 / 0.14), transparent 70%)',
    pixelAccents: true,
    radiusPx: 6,
    motion: 'arcade',
  },
};
