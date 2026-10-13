import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { appConfig } from '@/config';
import {
  addMany,
  buildCleanupPlan,
  reconcile,
  removeMany,
  resolveSelected,
  selectByKind,
  selectAll as selectAllAccounts,
  selectNone as selectNoneSelection,
  toggle as toggleSelection,
} from '@/core';
import type { CleanupPlan, DiscoveredAccount, ScanResult } from '@/core';
import type { Selection } from '@/core/selection/selection';
import {
  buildCleanupTransactions,
  BASE_SIGNATURE_FEE_LAMPORTS,
  DEFAULT_PRIORITY_FEE_MICROLAMPORTS,
  discoverAssets,
  enrichAssets,
  executePlan,
  explorerTxUrl,
  getDasClient,
  normalizeError,
  simulatePlan,
} from '@/solana';
import type { BuiltTransaction, ExecutionReport, NormalizedError, SimulationResult } from '@/solana';
import { createLogger } from '@/utils/logger';
import { useRpcClient } from '@/hooks/useRpcClient';
import { useNotifications } from '@/components/notifications';

const log = createLogger('recovery');

export type RecoveryPhase = 'idle' | 'scanning' | 'review' | 'executing' | 'complete';

interface SimulationState {
  status: 'idle' | 'running' | 'done';
  results: SimulationResult[];
  ok: boolean;
}

interface RecoveryState {
  phase: RecoveryPhase;
  scan: ScanResult | null;
  /** True while async metadata/price enrichment is in flight. */
  enriching: boolean;
  scanError: NormalizedError | null;
  selection: Selection;
  simulation: SimulationState;
  execution: ExecutionReport | null;
  executionError: NormalizedError | null;
  progress: { current: number; total: number };
}

const INITIAL_STATE: RecoveryState = {
  phase: 'idle',
  scan: null,
  enriching: false,
  scanError: null,
  selection: new Set<string>(),
  simulation: { status: 'idle', results: [], ok: false },
  execution: null,
  executionError: null,
  progress: { current: 0, total: 0 },
};

type Action =
  | { type: 'scan/start' }
  | { type: 'scan/discovered'; scan: ScanResult; firstScan: boolean }
  | { type: 'scan/enriched'; scan: ScanResult }
  | { type: 'enrich/done' }
  | { type: 'scan/error'; error: NormalizedError }
  | { type: 'selection/set'; selection: Selection }
  | { type: 'sim/start' }
  | { type: 'sim/done'; results: SimulationResult[]; ok: boolean }
  | { type: 'exec/start'; total: number }
  | { type: 'exec/progress'; current: number; total: number }
  | { type: 'exec/success'; report: ExecutionReport }
  | { type: 'exec/error'; error: NormalizedError }
  | { type: 'reset' };

function reducer(state: RecoveryState, action: Action): RecoveryState {
  switch (action.type) {
    case 'scan/start':
      return { ...state, phase: 'scanning', scanError: null, enriching: false };
    case 'scan/discovered': {
      // Default selection on the first scan: safe, zero-balance accounts.
      const selection = action.firstScan
        ? selectByKind(action.scan.accounts, ['empty'])
        : reconcile(state.selection, action.scan.accounts);
      return {
        ...state,
        phase: 'review',
        scan: action.scan,
        enriching: true,
        selection,
        simulation: INITIAL_STATE.simulation,
        execution: null,
        executionError: null,
      };
    }
    case 'scan/enriched':
      return {
        ...state,
        scan: action.scan,
        enriching: false,
        selection: reconcile(state.selection, action.scan.accounts),
      };
    case 'enrich/done':
      return { ...state, enriching: false };
    case 'scan/error':
      return { ...state, phase: 'idle', enriching: false, scanError: action.error };
    case 'selection/set':
      return { ...state, selection: action.selection, simulation: INITIAL_STATE.simulation };
    case 'sim/start':
      return { ...state, simulation: { status: 'running', results: [], ok: false } };
    case 'sim/done':
      return { ...state, simulation: { status: 'done', results: action.results, ok: action.ok } };
    case 'exec/start':
      return { ...state, phase: 'executing', executionError: null, progress: { current: 0, total: action.total } };
    case 'exec/progress':
      // Submissions confirm in parallel, so updates arrive out of order — only
      // ever advance the progress counter, never move it backward.
      return {
        ...state,
        progress: { current: Math.max(state.progress.current, action.current), total: action.total },
      };
    case 'exec/success':
      return { ...state, phase: 'complete', execution: action.report };
    case 'exec/error':
      return { ...state, phase: 'review', executionError: action.error };
    case 'reset':
      return { ...INITIAL_STATE, selection: new Set<string>() };
    default:
      return state;
  }
}

interface RecoveryContextValue {
  state: RecoveryState;
  plan: CleanupPlan;
  selectedAccounts: DiscoveredAccount[];
  scan: () => Promise<void>;
  toggleAccount: (id: string) => void;
  selectMany: (accounts: readonly DiscoveredAccount[]) => void;
  deselectMany: (accounts: readonly DiscoveredAccount[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  simulate: () => Promise<boolean>;
  execute: () => Promise<void>;
  reset: () => void;
  canExecute: boolean;
}

const RecoveryContext = createContext<RecoveryContextValue | null>(null);

export function RecoveryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const rpc = useRpcClient();
  const das = useMemo(() => getDasClient(appConfig.rpc.dasEndpoint), []);
  const wallet = useWallet();
  const { notify } = useNotifications();
  const busy = useRef(false);
  const scanToken = useRef(0);

  const owner = wallet.publicKey?.toBase58() ?? null;

  const selectedAccounts = useMemo(
    () => (state.scan ? resolveSelected(state.scan.accounts, state.selection) : []),
    [state.scan, state.selection],
  );

  const plan = useMemo<CleanupPlan>(
    () =>
      buildCleanupPlan({
        accounts: selectedAccounts,
        feeConfig: appConfig.fees,
        includeComparison: appConfig.features.savingsComparison,
        networkFee: {
          baseSignatureFeeLamports: BASE_SIGNATURE_FEE_LAMPORTS,
          priorityMicroLamports: DEFAULT_PRIORITY_FEE_MICROLAMPORTS,
        },
      }),
    [selectedAccounts],
  );

  const buildTransactions = useCallback((): BuiltTransaction[] => {
    if (!wallet.publicKey) return [];
    return buildCleanupTransactions({
      owner: wallet.publicKey,
      plan,
      feeRecipient: appConfig.fees.recipient,
      referralRecipient: appConfig.fees.referral.recipient,
    });
  }, [wallet.publicKey, plan]);

  const scan = useCallback(async () => {
    if (!owner || busy.current) return;
    busy.current = true;
    const token = ++scanToken.current;
    const firstScan = state.scan === null;
    dispatch({ type: 'scan/start' });
    try {
      // Phase 1 — fast discovery.
      const discovered = await discoverAssets(rpc, das, owner, {
        includeNonEmpty: appConfig.features.burnTokens,
        includeFrozen: false,
        features: appConfig.features,
      });
      if (token !== scanToken.current) return;
      dispatch({ type: 'scan/discovered', scan: discovered, firstScan });
      if (discovered.partial) {
        notify({ kind: 'warning', title: 'Partial scan', message: 'Some accounts could not be read. Results may be incomplete.' });
      }

      // Phase 2 — enrichment (metadata + classification + prices).
      try {
        const enriched = await enrichAssets(rpc, das, appConfig.pricing, discovered);
        if (token === scanToken.current) dispatch({ type: 'scan/enriched', scan: enriched });
      } catch (error) {
        log.warn('enrichment failed', { error: String(error) });
        if (token === scanToken.current) dispatch({ type: 'enrich/done' });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      log.error('scan failed', { code: normalized.code });
      if (token === scanToken.current) {
        dispatch({ type: 'scan/error', error: normalized });
        notify({ kind: 'error', title: 'Scan failed', message: normalized.message });
      }
    } finally {
      busy.current = false;
    }
  }, [owner, rpc, das, notify, state.scan]);

  const toggleAccount = useCallback(
    (id: string) => dispatch({ type: 'selection/set', selection: toggleSelection(state.selection, id) }),
    [state.selection],
  );
  const selectMany = useCallback(
    (accounts: readonly DiscoveredAccount[]) =>
      dispatch({ type: 'selection/set', selection: addMany(state.selection, accounts) }),
    [state.selection],
  );
  const deselectMany = useCallback(
    (accounts: readonly DiscoveredAccount[]) =>
      dispatch({ type: 'selection/set', selection: removeMany(state.selection, accounts) }),
    [state.selection],
  );
  const selectAll = useCallback(() => {
    if (state.scan) dispatch({ type: 'selection/set', selection: selectAllAccounts(state.scan.accounts) });
  }, [state.scan]);
  const clearSelection = useCallback(
    () => dispatch({ type: 'selection/set', selection: selectNoneSelection() }),
    [],
  );

  const simulate = useCallback(async (): Promise<boolean> => {
    const transactions = buildTransactions();
    if (transactions.length === 0) return false;
    dispatch({ type: 'sim/start' });
    try {
      const results = await simulatePlan(rpc, transactions);
      const ok = results.every((r) => r.ok);
      dispatch({ type: 'sim/done', results, ok });
      return ok;
    } catch (error) {
      const normalized = normalizeError(error);
      dispatch({ type: 'sim/done', results: [], ok: false });
      notify({ kind: 'error', title: 'Simulation failed', message: normalized.message });
      return false;
    }
  }, [buildTransactions, rpc, notify]);

  const execute = useCallback(async () => {
    if (!wallet.publicKey || busy.current) return;
    const transactions = buildTransactions();
    if (transactions.length === 0) return;

    busy.current = true;
    dispatch({ type: 'exec/start', total: transactions.length });
    try {
      if (appConfig.features.simulate) {
        const results = await simulatePlan(rpc, transactions);
        const ok = results.every((r) => r.ok);
        dispatch({ type: 'sim/done', results, ok });
        if (!ok) {
          const firstError = results.find((r) => !r.ok)?.error ?? 'Unknown simulation error';
          throw new Error(`Transaction simulation failed: ${firstError}`);
        }
      }

      const report = await executePlan(rpc, wallet, transactions, {
        onProgress: ({ index, total }) => dispatch({ type: 'exec/progress', current: index + 1, total }),
      });
      dispatch({ type: 'exec/success', report });

      const lastConfirmed = [...report.transactions].reverse().find((t) => t.signature);
      if (report.failedCount === 0) {
        notify({
          kind: 'success',
          title: 'Cleanup complete',
          message: `Processed ${report.confirmedCount} transaction(s).`,
          action: lastConfirmed?.signature
            ? { label: 'View on explorer', href: explorerTxUrl(lastConfirmed.signature, appConfig.rpc.network) }
            : undefined,
        });
      } else {
        notify({ kind: 'warning', title: 'Partially completed', message: `${report.confirmedCount} confirmed, ${report.failedCount} failed.` });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      log.error('execution failed', { code: normalized.code });
      dispatch({ type: 'exec/error', error: normalized });
      if (normalized.code !== 'user-rejected') {
        notify({ kind: 'error', title: 'Transaction failed', message: normalized.message });
      }
    } finally {
      busy.current = false;
    }
  }, [wallet, buildTransactions, rpc, notify]);

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  // Reset everything when the wallet disconnects or switches accounts.
  const prevOwner = useRef<string | null>(null);
  useEffect(() => {
    if (prevOwner.current !== null && prevOwner.current !== owner) dispatch({ type: 'reset' });
    prevOwner.current = owner;
  }, [owner]);

  const canExecute =
    state.phase === 'review' &&
    plan.accounts.length > 0 &&
    Boolean(wallet.publicKey) &&
    (Boolean(wallet.signAllTransactions) || Boolean(wallet.signTransaction));

  const value = useMemo<RecoveryContextValue>(
    () => ({
      state,
      plan,
      selectedAccounts,
      scan,
      toggleAccount,
      selectMany,
      deselectMany,
      selectAll,
      clearSelection,
      simulate,
      execute,
      reset,
      canExecute,
    }),
    [state, plan, selectedAccounts, scan, toggleAccount, selectMany, deselectMany, selectAll, clearSelection, simulate, execute, reset, canExecute],
  );

  return <RecoveryContext.Provider value={value}>{children}</RecoveryContext.Provider>;
}

export function useRecovery(): RecoveryContextValue {
  const ctx = useContext(RecoveryContext);
  if (!ctx) throw new Error('useRecovery must be used within a RecoveryProvider');
  return ctx;
}

export type { RecoveryState };
