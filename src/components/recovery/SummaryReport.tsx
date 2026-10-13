import { appConfig } from '@/config';
import { computeFee } from '@/core';
import type { ExecutionReport } from '@/solana';
import { explorerTxUrl } from '@/solana';
import { formatSolWithUnit, pluralize, shortenAddress } from '@/utils/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Stat } from '../ui/Stat';

interface SummaryReportProps {
  report: ExecutionReport;
  onReset: () => void;
  onRescan: () => void;
}

/** Post-execution detailed summary with per-transaction explorer links. */
export function SummaryReport({ report, onReset, onRescan }: SummaryReportProps) {
  // Recompute net from the canonical fee engine so the summary is consistent
  // with everything the user saw before signing.
  const fee = computeFee({
    grossLamports: report.recoveredLamports,
    config: appConfig.fees,
    includeComparison: false,
  });
  const fullSuccess = report.failedCount === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-positive/12">
          <Icon name={fullSuccess ? 'check-circle' : 'alert'} size={32} className={fullSuccess ? 'text-positive' : 'text-warning'} />
        </div>
        <h1 className="font-display text-2xl font-bold text-content">
          {fullSuccess ? 'Rent reclaimed' : 'Partially completed'}
        </h1>
        <p className="mt-1 text-content-muted">
          {report.confirmedCount > 0
            ? `Closed accounts across ${pluralize(report.confirmedCount, 'transaction')}.`
            : 'No transactions confirmed.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Reclaimed" value={formatSolWithUnit(report.recoveredLamports)} tone="accent" icon="flame" />
        <Stat label="Net received" value={formatSolWithUnit(fee.netLamports)} icon="check-circle" />
        <Stat label="Service fee" value={formatSolWithUnit(report.feeLamports, { precise: true })} icon="bolt" />
      </div>

      <Card>
        <h3 className="mb-3 font-display text-base font-semibold text-content">Transactions</h3>
        <ul className="space-y-2">
          {report.transactions.map((tx) => (
            <li key={tx.index} className="flex items-center justify-between gap-3 rounded-theme border border-surface-border/60 bg-bg-inset/40 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Icon
                  name={tx.status === 'confirmed' ? 'check-circle' : tx.status === 'failed' ? 'alert' : 'info'}
                  size={16}
                  className={tx.status === 'confirmed' ? 'text-positive' : tx.status === 'failed' ? 'text-danger' : 'text-content-subtle'}
                />
                <div>
                  <p className="text-sm font-medium text-content">
                    Transaction {tx.index + 1} · {pluralize(tx.accounts.length, 'account')}
                  </p>
                  {tx.error && <p className="text-xs text-danger">{tx.error.message}</p>}
                  {tx.status === 'skipped' && <p className="text-xs text-content-subtle">Skipped after an earlier failure.</p>}
                </div>
              </div>
              {tx.signature && (
                <a
                  href={explorerTxUrl(tx.signature, appConfig.rpc.network)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                >
                  {shortenAddress(tx.signature, 4, 4)}
                  <Icon name="external" size={12} />
                </a>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="secondary" iconLeft="refresh" onClick={onRescan}>
          Scan again
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Done
        </Button>
      </div>
    </div>
  );
}
