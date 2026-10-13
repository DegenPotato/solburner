import type { CleanupPlan } from '@/core';
import { formatPercent, formatSolWithUnit } from '@/utils/format';
import { cn } from '@/utils/cn';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

interface FeeBreakdownCardProps {
  plan: CleanupPlan;
  className?: string;
}

function Row({ label, value, tone, strong, hint }: { label: string; value: string; tone?: 'muted' | 'accent' | 'positive'; strong?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <div className="min-w-0">
        <span className={cn('text-sm', strong ? 'font-semibold text-content' : 'text-content-muted')}>{label}</span>
        {hint && <p className="text-xs text-content-subtle">{hint}</p>}
      </div>
      <span
        className={cn(
          'shrink-0 font-mono tabular-nums',
          strong ? 'text-lg font-bold' : 'text-sm',
          tone === 'accent' && 'text-accent',
          tone === 'positive' && 'text-positive',
          (!tone || tone === 'muted') && !strong && 'text-content',
          strong && !tone && 'text-content',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The transparency centerpiece. Every figure originates from the single fee
 * engine + the plan's network-fee estimate — the same numbers used to build and
 * submit the on-chain transactions. The displayed "You receive" is the true net
 * wallet gain: gross − service fee − network fee (nothing hidden).
 */
export function FeeBreakdownCard({ plan, className }: FeeBreakdownCardProps) {
  const { fee } = plan;
  const accountCount = plan.accounts.length;
  const feeDisabled = fee.feeLamports === 0n;

  return (
    <Card className={className}>
      <div className="mb-1 flex items-center gap-2">
        <Icon name="bolt" size={16} className="text-accent" />
        <h3 className="font-display text-base font-semibold text-content">Fee breakdown</h3>
      </div>
      <p className="mb-3 text-xs text-content-subtle">
        Based on {accountCount} selected {accountCount === 1 ? 'account' : 'accounts'}. No hidden charges.
      </p>

      <div className="divide-y divide-surface-border/60">
        <Row label="Recoverable SOL" value={formatSolWithUnit(fee.grossLamports, { precise: true })} />
        <Row
          label={feeDisabled ? 'Service fee' : `Service fee (${formatPercent(fee.effectiveRate)})`}
          value={feeDisabled ? '0 SOL' : `– ${formatSolWithUnit(fee.feeLamports, { precise: true })}`}
          tone="muted"
        />
        <Row
          label="Network fee (est.)"
          value={`– ${formatSolWithUnit(plan.networkFeeLamports, { precise: true })}`}
          tone="muted"
          hint={plan.transactionCount > 0 ? `${plan.transactionCount} transaction${plan.transactionCount === 1 ? '' : 's'} · paid to Solana` : undefined}
        />
        <Row label="You receive" value={formatSolWithUnit(plan.netAfterNetworkLamports, { precise: true })} tone="positive" strong />
      </div>

      {fee.comparison && fee.comparison.savingsLamports > 0n && (
        <div className="mt-4 flex items-start gap-2.5 rounded-theme border border-positive/25 bg-positive/8 p-3">
          <Icon name="check-circle" size={16} className="mt-0.5 shrink-0 text-positive" />
          <p className="text-sm text-content">
            Compared with a {formatPercent(fee.comparison.benchmarkRate)} service fee, you keep{' '}
            <span className="font-semibold text-positive">{formatSolWithUnit(fee.comparison.savingsLamports, { precise: true })}</span>{' '}
            more.
          </p>
        </div>
      )}
    </Card>
  );
}
