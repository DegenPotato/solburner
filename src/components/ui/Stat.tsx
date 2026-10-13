import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: IconName;
  tone?: 'default' | 'accent';
  className?: string;
}

/** A single labelled metric used in the scan summary grid. */
export function Stat({ label, value, hint, icon, tone = 'default', className }: StatProps) {
  return (
    <div
      className={cn(
        'rounded-theme border p-4',
        tone === 'accent' ? 'border-accent/30 bg-accent/5' : 'border-surface-border bg-bg-inset/60',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-content-muted">
        {icon && <Icon name={icon} size={15} className={tone === 'accent' ? 'text-accent' : undefined} />}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn('mt-2 font-display text-2xl font-bold tabular-nums', tone === 'accent' ? 'text-accent' : 'text-content')}>
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-content-subtle">{hint}</p>}
    </div>
  );
}
