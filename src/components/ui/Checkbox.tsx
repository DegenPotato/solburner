import { cn } from '@/utils/cn';
import { Icon } from './Icon';

interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Accessible, theme-styled checkbox driven by a controlled `checked` prop. */
export function Checkbox({ checked, onChange, indeterminate, disabled, ...aria }: CheckboxProps) {
  const active = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={aria['aria-label']}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-theme-sm border transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
        active ? 'border-accent bg-accent text-accent-contrast' : 'border-surface-border bg-bg-inset hover:border-accent/60',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2.5 rounded bg-accent-contrast" />
      ) : checked ? (
        <Icon name="check" size={14} strokeWidth={2.5} />
      ) : null}
    </button>
  );
}
