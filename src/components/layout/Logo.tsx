import { appConfig } from '@/config';
import { cn } from '@/utils/cn';

/**
 * Original brand mark: a stylized flame inside a rounded hexagon, tinted by the
 * active theme accent. The wordmark reads from brand config.
 */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-accent))" />
              <stop offset="100%" stopColor="rgb(var(--c-accent-strong))" />
            </linearGradient>
          </defs>
          <path
            d="M20 2.5l13.5 7.8v15.4L20 33.5 6.5 25.7V10.3L20 2.5z"
            fill="rgb(var(--c-accent) / 0.10)"
            stroke="rgb(var(--c-accent) / 0.45)"
            strokeWidth="1.5"
          />
          <path
            d="M20 9c3.2 4 5.2 7 5.2 10.2 0 2.4-1.4 4.1-3.5 4.8.6-1.3.6-2.7.1-4-.8 2.6-2.9 3.6-4.6 5.2-1.5 1.4-2.2 3-2.2 4.6 0 1.9 1.6 3.2 3.8 3.2 3 0 5.4-2.4 5.4-5.6C24.2 17.6 23 13.4 20 9z"
            fill="url(#logo-grad)"
          />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-content">{appConfig.brand.name}</span>
      )}
    </div>
  );
}
