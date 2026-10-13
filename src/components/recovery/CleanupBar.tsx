import type { CleanupPlan } from '@/core';
import { formatSolWithUnit, pluralize } from '@/utils/format';
import { Button } from '../ui/Button';

interface CleanupBarProps {
  plan: CleanupPlan;
  disabled: boolean;
  onReview: () => void;
}

/** Sticky action bar summarizing the net payout and launching the preview. */
export function CleanupBar({ plan, disabled, onReview }: CleanupBarProps) {
  const count = plan.accounts.length;
  return (
    <div className="sticky bottom-0 z-20 mt-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 rounded-theme-lg border border-surface-border bg-bg-elevated/95 p-4 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-content-subtle">You receive</p>
            <p className="font-display text-xl font-bold tabular-nums text-positive">
              {formatSolWithUnit(plan.netAfterNetworkLamports, { precise: true })}
            </p>
            <p className="text-xs text-content-muted">
              {count === 0 ? 'Select accounts to continue' : `${pluralize(count, 'account')} · ${pluralize(plan.transactionCount, 'transaction')}`}
            </p>
          </div>
          <Button size="lg" iconRight="arrow-right" disabled={disabled || count === 0} onClick={onReview}>
            Review &amp; clean up
          </Button>
        </div>
      </div>
    </div>
  );
}
