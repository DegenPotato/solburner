import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { AssetKind } from '@/core';
import { appConfig } from '@/config';
import { useRecovery } from '@/state/RecoveryContext';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { AssetPanel } from './AssetPanel';
import { AssetTabs } from './AssetTabs';
import { TABS, tabKinds } from './assetMeta';
import { CleanupBar } from './CleanupBar';
import { FeeBreakdownCard } from './FeeBreakdownCard';
import { PreviewModal } from './PreviewModal';
import { ScanSummary } from './ScanSummary';
import { SummaryReport } from './SummaryReport';
import { ConnectGate, NothingToRecover, ReadyToScan, ScanningState } from './states';

/**
 * Orchestrates the full recovery flow by reading the recovery state machine and
 * rendering the appropriate view. Contains no business logic — only view routing
 * and local UI state (active tab, value ceiling, preview visibility).
 */
export function RecoveryDashboard() {
  const { connected } = useWallet();
  const { state, plan, scan, toggleAccount, selectMany, deselectMany, reset, canExecute } = useRecovery();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<AssetKind>('empty');
  const [maxUsd, setMaxUsd] = useState<number>(appConfig.pricing.defaultMaxUsd);

  useEffect(() => {
    if (connected && state.phase === 'idle' && state.scan === null) void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, state.phase, state.scan]);

  const activeTab = useMemo(() => TABS.find((t) => t.kind === activeKind) ?? TABS[0]!, [activeKind]);
  const tabAssets = useMemo(() => {
    if (!state.scan) return [];
    const kinds = new Set(tabKinds(activeTab));
    return state.scan.accounts.filter((a) => kinds.has(a.kind));
  }, [state.scan, activeTab]);

  if (!connected) return <ConnectGate />;

  if (state.phase === 'complete' && state.execution) {
    return (
      <SummaryReport
        report={state.execution}
        onReset={reset}
        onRescan={() => {
          reset();
          void scan();
        }}
      />
    );
  }

  if (state.phase === 'scanning') return <ScanningState />;
  if (state.scan === null) return <ReadyToScan onScan={() => void scan()} scanning={false} />;
  if (state.scan.accounts.length === 0) return <NothingToRecover onRescan={() => void scan()} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-content">Wallet cleanup</h1>
          <p className="flex items-center gap-2 text-sm text-content-muted">
            Select assets to clean up.
            {state.enriching && (
              <span className="inline-flex items-center gap-1 text-content-subtle">
                <Icon name="spinner" size={12} className="animate-spin" /> loading metadata & prices…
              </span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" iconLeft="refresh" onClick={() => void scan()}>
          Rescan
        </Button>
      </div>

      <ScanSummary scan={state.scan} plan={plan} />

      <AssetTabs scan={state.scan} active={activeKind} onChange={setActiveKind} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssetPanel
            tab={activeTab!}
            assets={tabAssets}
            selection={state.selection}
            priceStops={appConfig.pricing.sliderStops}
            maxUsd={maxUsd}
            onMaxUsd={setMaxUsd}
            onToggle={toggleAccount}
            onSelectMany={selectMany}
            onDeselectMany={deselectMany}
          />
        </div>
        <div className="space-y-5">
          <FeeBreakdownCard plan={plan} />
        </div>
      </div>

      <CleanupBar plan={plan} disabled={!canExecute} onReview={() => setPreviewOpen(true)} />
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
