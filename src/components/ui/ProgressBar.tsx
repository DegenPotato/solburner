import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, max, className, label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex justify-between text-xs text-content-muted">
          <span>{label}</span>
          <span className="font-mono">{pct}%</span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-bg-inset"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn('h-full rounded-full bg-accent transition-[width] duration-500 ease-out')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
