import { useEffect } from 'react';
import { appConfig } from '@/config';
import { useRecovery } from '@/state/RecoveryContext';
import { formatSolWithUnit, pluralize } from '@/utils/format';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { ProgressBar } from '../ui/ProgressBar';
import { FeeBreakdownCard } from './FeeBreakdownCard';

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Confirmation step: previews the costed plan, runs pre-flight simulation, warns
 * about destructive burns, and executes on explicit confirmation.
 */
export function PreviewModal({ open, onClose }: PreviewModalProps) {
  const { plan, selectedAccounts, state, simulate, execute } = useRecovery();

  const simulateEnabled = appConfig.features.simulate;
  const executing = state.phase === 'executing';
  const sim = state.simulation;

  // Kick off a simulation when the preview opens (once per open).
  useEffect(() => {
    if (open && simulateEnabled && sim.status === 'idle' && plan.accounts.length > 0) {
      void simulate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-close once execution completes (parent renders the summary screen).
  useEffect(() => {
    if (state.phase === 'complete') onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const burnCount = selectedAccounts.filter((a) => a.action === 'burn-and-close').length;
  const simFailed = simulateEnabled && sim.status === 'done' && !sim.ok;
  const canConfirm = !executing && plan.accounts.length > 0 && !(simulateEnabled && sim.status === 'running') && !simFailed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review cleanup"
      description={`${pluralize(plan.accounts.length, 'account')} · ${pluralize(plan.transactionCount, 'transaction')}`}
      dismissible={!executing}
      size="lg"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-content-subtle">
            You sign every transaction. Funds are sent directly to your wallet.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={executing}>
              Cancel
            </Button>
            <Button onClick={() => void execute()} loading={executing} disabled={!canConfirm} iconLeft="flame">
              {executing ? 'Processing…' : 'Confirm & clean up'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <FeeBreakdownCard plan={plan} />

        {burnCount > 0 && (
          <div className="flex items-start gap-2.5 rounded-theme border border-warning/30 bg-warning/8 p-3">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-sm text-content">
              {pluralize(burnCount, 'account')} still {burnCount === 1 ? 'holds a balance' : 'hold balances'}. Those tokens
              will be <span className="font-semibold text-warning">permanently burned</span> before the account is closed.
            </p>
          </div>
        )}

        {simulateEnabled && (
          <div className="rounded-theme border border-surface-border bg-bg-inset/60 p-3">
            {sim.status === 'running' && (
              <p className="flex items-center gap-2 text-sm text-content-muted">
                <Icon name="spinner" size={15} className="animate-spin" /> Simulating transactions…
              </p>
            )}
            {sim.status === 'done' && sim.ok && (
              <p className="flex items-center gap-2 text-sm text-positive">
                <Icon name="check-circle" size={15} /> Simulation passed — all {sim.results.length} transaction(s) are valid.
              </p>
            )}
            {simFailed && (
              <div className="space-y-2">
                <p className="flex items-start gap-2 text-sm text-danger">
                  <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
                  <span>Simulation failed. The transaction was not sent — your funds are untouched.</span>
                </p>
                {(() => {
                  const failed = sim.results.find((r) => !r.ok);
                  if (!failed) return null;
                  const logs = (failed.logs ?? []).slice(-6);
                  return (
                    <details className="rounded-theme border border-surface-border bg-bg-inset/60 p-2 text-xs">
                      <summary className="cursor-pointer text-content-muted">Show error details</summary>
                      {failed.error && <p className="mt-2 break-words font-mono text-danger">{failed.error}</p>}
                      {logs.length > 0 && (
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-content-subtle">
                          {logs.join('\n')}
                        </pre>
                      )}
                    </details>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {executing && (
          <ProgressBar
            value={state.progress.current}
            max={state.progress.total}
            label={`Confirming transaction ${state.progress.current} of ${state.progress.total}`}
          />
        )}

        {state.executionError && !executing && (
          <p className="flex items-start gap-2 text-sm text-danger">
            <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
            {state.executionError.message}
          </p>
        )}

        <p className="text-center text-xs text-content-subtle">
          Net payout: <span className="font-mono text-content">{formatSolWithUnit(plan.netAfterNetworkLamports, { precise: true })}</span>
        </p>
      </div>
    </Modal>
  );
}
