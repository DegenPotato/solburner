/**
 * The theme engine: maps a `Theme` (pure data) onto CSS custom properties on
 * `:root`. Tailwind tokens reference these vars, so applying a theme restyles
 * the entire app without re-rendering React or shipping per-brand CSS bundles.
 */

import type { Theme } from './types';

const MOTION_DURATIONS: Record<Theme['decor']['motion'], string> = {
  calm: '320ms',
  snappy: '200ms',
  arcade: '120ms',
};

const loadedFontHrefs = new Set<string>();

function ensureWebfonts(hrefs: string[] | undefined): void {
  if (!hrefs || typeof document === 'undefined') return;
  for (const href of hrefs) {
    if (loadedFontHrefs.has(href)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-theme-font', '');
    document.head.appendChild(link);
    loadedFontHrefs.add(href);
  }
}

/** Apply `theme` to the document root. Safe to call repeatedly. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const c = theme.colors;

  const vars: Record<string, string> = {
    '--c-bg': c.bg,
    '--c-bg-elevated': c.bgElevated,
    '--c-bg-inset': c.bgInset,
    '--c-surface': c.surface,
    '--c-surface-hover': c.surfaceHover,
    '--c-surface-border': c.surfaceBorder,
    '--c-text': c.text,
    '--c-text-muted': c.textMuted,
    '--c-text-subtle': c.textSubtle,
    '--c-accent': c.accent,
    '--c-accent-strong': c.accentStrong,
    '--c-accent-soft': c.accentSoft,
    '--c-accent-contrast': c.accentContrast,
    '--c-positive': c.positive,
    '--c-warning': c.warning,
    '--c-danger': c.danger,
    '--c-info': c.info,
    '--font-sans': theme.fonts.sans,
    '--font-display': theme.fonts.display,
    '--font-mono': theme.fonts.mono,
    '--radius': `${theme.decor.radiusPx}px`,
    '--app-bg': theme.decor.appBackground,
    '--hero-bg': theme.decor.heroBackground,
    '--motion-duration': MOTION_DURATIONS[theme.decor.motion],
  };

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  root.style.colorScheme = theme.scheme;
  root.dataset.theme = theme.id;
  root.dataset.pixel = theme.decor.pixelAccents ? 'on' : 'off';

  ensureWebfonts(theme.fonts.webfontHrefs);
}
