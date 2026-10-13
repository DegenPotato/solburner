import { cn } from '@/utils/cn';

/** Shimmering placeholder used during scans/loading. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-theme bg-surface-hover', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-content/10 to-transparent" />
    </div>
  );
}
