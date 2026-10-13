import { useState } from 'react';
import { useTheme } from '@/theme';
import { cn } from '@/utils/cn';
import { Icon } from '../ui/Icon';

/** Compact theme picker. Lets any visitor preview the white-label brands live. */
export function ThemeSwitcher() {
  const { theme, availableThemes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="inline-flex h-9 items-center gap-1.5 rounded-theme border border-surface-border bg-surface px-3 text-sm font-medium text-content-muted transition-colors hover:text-content"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon name="sparkle" size={15} className="text-accent" />
        <span className="hidden sm:inline">{theme.label}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <ul
          className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-theme border border-surface-border bg-bg-elevated p-1 shadow-card animate-fade-in-fast"
          role="listbox"
        >
          {availableThemes.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected={t.id === theme.id}
                onMouseDown={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-theme-sm px-3 py-2 text-sm transition-colors',
                  t.id === theme.id ? 'bg-accent/12 text-accent' : 'text-content-muted hover:bg-surface-hover hover:text-content',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-white/10"
                    style={{ background: `rgb(${t.colors.accent})` }}
                  />
                  {t.label}
                </span>
                {t.id === theme.id && <Icon name="check" size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
