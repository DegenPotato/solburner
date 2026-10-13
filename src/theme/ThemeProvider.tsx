import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { BrandId } from '@/config/types';
import { appConfig } from '@/config';
import { createLogger } from '@/utils/logger';
import { applyTheme } from './applyTheme';
import { getTheme, THEME_LIST } from './themes';
import type { Theme } from './types';

const log = createLogger('theme');
const STORAGE_KEY = 'solburner.theme';

interface ThemeContextValue {
  theme: Theme;
  themeId: BrandId;
  availableThemes: Theme[];
  setTheme: (id: BrandId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): BrandId | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && THEME_LIST.some((t) => t.id === value) ? (value as BrandId) : null;
  } catch {
    return null;
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  /** When true, ignore any persisted selection (used for white-label previews). */
  locked?: boolean;
}

export function ThemeProvider({ children, locked = false }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<BrandId>(() => {
    if (locked) return appConfig.brand.defaultTheme;
    return readStoredTheme() ?? appConfig.brand.defaultTheme;
  });

  const theme = useMemo(() => getTheme(themeId), [themeId]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (id: BrandId) => {
      if (locked) return;
      setThemeId(id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch (error) {
        log.warn('failed to persist theme', { error: String(error) });
      }
    },
    [locked],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeId, availableThemes: THEME_LIST, setTheme }),
    [theme, themeId, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
