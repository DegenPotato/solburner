/**
 * Theme contract.
 *
 * A `Theme` is pure data: color channels, font stacks, radius, decorative knobs.
 * The engine (`applyTheme`) maps it to CSS custom properties consumed by Tailwind
 * tokens. Application logic never branches on the theme — only its presentation.
 *
 * Colors are stored as space-separated RGB **channels** (e.g. `"34 224 122"`) so
 * they compose with Tailwind's `rgb(var(--token) / <alpha-value>)` opacity model.
 */

import type { BrandId } from '@/config/types';

export type RgbChannels = string; // "R G B"

export interface ThemeColors {
  bg: RgbChannels;
  bgElevated: RgbChannels;
  bgInset: RgbChannels;
  surface: RgbChannels;
  surfaceHover: RgbChannels;
  surfaceBorder: RgbChannels;
  text: RgbChannels;
  textMuted: RgbChannels;
  textSubtle: RgbChannels;
  accent: RgbChannels;
  accentStrong: RgbChannels;
  accentSoft: RgbChannels;
  accentContrast: RgbChannels;
  positive: RgbChannels;
  warning: RgbChannels;
  danger: RgbChannels;
  info: RgbChannels;
}

export interface ThemeFonts {
  sans: string;
  display: string;
  mono: string;
  /** Optional <link> hrefs to load webfonts (e.g. Google Fonts). */
  webfontHrefs?: string[];
}

export interface ThemeDecor {
  /** CSS background applied to the app root (gradients, grids, etc.). */
  appBackground: string;
  /** CSS background for the landing hero section. */
  heroBackground: string;
  /** Pixel/retro decorative accents toggle. */
  pixelAccents: boolean;
  /** Corner radius in px for the radius scale. */
  radiusPx: number;
  /** Named motion personality affecting transition durations. */
  motion: 'calm' | 'snappy' | 'arcade';
}

export interface Theme {
  id: BrandId;
  label: string;
  /** `color-scheme` hint for native form controls/scrollbars. */
  scheme: 'dark' | 'light';
  colors: ThemeColors;
  fonts: ThemeFonts;
  decor: ThemeDecor;
}
