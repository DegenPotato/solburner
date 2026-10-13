import { Icon } from '../ui/Icon';
import { cn } from '@/utils/cn';

interface ValueSliderProps {
  stops: number[];
  /** Current ceiling (USD). `Infinity` means no limit. */
  value: number;
  onChange: (value: number) => void;
}

function labelFor(stop: number): string {
  return Number.isFinite(stop) ? `$${stop}` : 'All';
}

/**
 * Value-protection control: hide (and exclude from "select all") tokens worth
 * more than the chosen USD ceiling, so valuable bags can't be burned by accident.
 */
export function ValueSlider({ stops, value, onChange }: ValueSliderProps) {
  const index = Math.max(0, stops.indexOf(value));

  return (
    <div className="rounded-theme border border-surface-border bg-bg-inset/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-content">
        <Icon name="shield" size={15} className="text-accent" />
        <span className="font-medium">Hide tokens worth more than {labelFor(value)}</span>
      </div>

      <input
        type="range"
        min={0}
        max={stops.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(stops[Number(e.target.value)] ?? Number.POSITIVE_INFINITY)}
        className="w-full accent-[rgb(var(--c-accent))]"
        aria-label="Maximum token value to show"
      />

      <div className="mt-1 flex justify-between">
        {stops.map((stop, i) => (
          <button
            key={stop}
            type="button"
            onClick={() => onChange(stop)}
            className={cn(
              'font-mono text-xs transition-colors',
              i === index ? 'font-bold text-accent' : 'text-content-subtle hover:text-content',
            )}
          >
            {labelFor(stop)}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-content-subtle">
        This estimate isn't always accurate. Always double-check items before burning.
      </p>
    </div>
  );
}
