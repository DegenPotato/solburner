import type { CleanupPlan, ScanResult } from '@/core';
import { formatCount, formatSol } from '@/utils/format';
import { Stat } from '../ui/Stat';

interface ScanSummaryProps {
  scan: ScanResult;
  plan: CleanupPlan;
}

/** Top-level metrics grid: what's available vs. what's selected. */
export function ScanSummary({ scan, plan }: ScanSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Recoverable"
        value={`${formatSol(scan.totalRentLamports)} SOL`}
        hint="Across all closeable accounts"
        icon="flame"
        tone="accent"
      />
      <Stat
        label="You receive"
        value={`${formatSol(plan.netAfterNetworkLamports)} SOL`}
        hint="Net of all fees, current selection"
        icon="check-circle"
      />
      <Stat label="Accounts" value={formatCount(scan.accounts.length)} hint={`${scan.counts.empty} empty · ${scan.counts.nft} NFT`} icon="wallet" />
      <Stat label="Transactions" value={formatCount(plan.transactionCount)} hint="To complete your selection" icon="bolt" />
    </div>
  );
}
