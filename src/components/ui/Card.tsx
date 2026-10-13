import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the accent glow border treatment. */
  glow?: boolean;
  /** Removes default padding for custom layouts. */
  flush?: boolean;
}

export function Card({ glow, flush, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-theme-lg border border-surface-border bg-surface/80 backdrop-blur-sm',
        glow ? 'shadow-glow' : 'shadow-card',
        !flush && 'p-5 sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-content">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-content-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
