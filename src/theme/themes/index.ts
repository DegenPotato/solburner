import type { BrandId } from '@/config/types';
import type { Theme } from '../types';
import { professionalTheme } from './professional';
import { degenTheme } from './degen';
import { minimalTheme } from './minimal';

export const THEMES: Record<BrandId, Theme> = {
  professional: professionalTheme,
  degen: degenTheme,
  minimal: minimalTheme,
};

export const THEME_LIST: Theme[] = [professionalTheme, degenTheme, minimalTheme];

export function getTheme(id: BrandId): Theme {
  return THEMES[id];
}
