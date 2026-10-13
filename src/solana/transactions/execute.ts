/**
 * Transaction executor. Signs the plan's transactions (one wallet approval when
 * the wallet supports `signAllTransactions`) and submits them sequentially,
 * confirming each before the next so later fee transfers always have the rent
 * credited by earlier closes.
 */

import type { PublicKey, Transaction } from '@solana/web3.js';
import { chunk, mapWithConcurrency } from '@/utils/async';
import { sumLamports } from '@/utils/lamports';
import { createLogger } from '@/utils/logger';
import type { DiscoveredAccount } from '@/core/types';
import { normalizeError } from '../errors';
import type { NormalizedError } from '../errors';
import type { RpcClient } from '../rpc/connection';
import type { BuiltTransaction, FeeTransferTarget } from './builder';

const log = createLogger('execute');

/**
 * Transactions are executed in **batches**. Each batch gets its own fresh
 * blockhash right before signing, and its transactions are submitted in parallel
 * (bounded concurrency) — so all of a batch's transactions land well inside the
 * blockhash validity window regardless of how slow confirmation is. This is what
 * lets the app clean up 1000+ accounts (~45+ transactions) without hitting
 * blockhash expiry, at the cost of one wallet approval per batch (so a typical
 * cleanup that fits in one batch is still a single approval).
 */
const BATCH_SIZE = 40;
/** Max transactions submitted concurrently within a batch (RPC-friendly). */
const SUBMIT_CONCURRENCY = 8;

/** Minimal wallet contract — satisfied by `@solana/wallet-adapter-react`. */
export interface WalletSigner {
  publicKey: PublicKey | null;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
}

export type ExecStatus = 'confirmed' | 'failed' | 'skipped';

export interface ExecutedTransaction {
  index: number;
  status: ExecStatus;
  signature: string | null;
  accounts: DiscoveredAccount[];
  feeTransfers: FeeTransferTarget[];
  error: NormalizedError | null;
}

export interface ExecutionReport {
  transactions: ExecutedTransaction[];
  confirmedCount: number;
  failedCount: number;
  /** Reclaimed rent from accounts in confirmed transactions (gross). */
  recoveredLamports: bigint;
  /** Service fee actually transferred in confirmed transactions. */
  feeLamports: bigint;
}

export interface ExecuteOptions {
  onProgress?: (update: { index: number; total: number; status: ExecStatus; signature?: string }) => void;
  /** Re-send + status-poll interval for pending transactions. Default 2000ms; tests shorten it. */
  rebroadcastMs?: number;
}

/**
 * True when every required signature slot is filled. web3.js marks unsigned
 * slots as `null` (all-zero wire signatures are normalized to null by
 * `Transaction.from`), so a wallet that returns a transaction without actually
 * signing it — a known failure mode with conflicting wallet extensions and
 * hardware/seedless accounts — is caught here, instead of surfacing later as
 * serialize()'s cryptic "Missing signature for public key" error.
 */
function isFullySigned(tx: Transaction): boolean {
  return tx.signatures.every((pair) => pair.signature !== null);
}

const SIGN_FAILED_MESSAGE =
  'Your wallet returned the transaction without signing it. This usually means another wallet ' +
  'extension is intercepting requests — disable other wallet/crypto extensions and retry. ' +
  'Hardware (Ledger) and social-login accounts can also fail batch signing.';

async function signAll(wallet: WalletSigner, transactions: Transaction[]): Promise<Transaction[]> {
  if (wallet.signAllTransactions) {
    const signed = await wallet.signAllTransactions(transactions);
    if (signed.every(isFullySigned)) return signed;
    if (!wallet.signTransaction) throw new Error(SIGN_FAILED_MESSAGE);
    log.warn('signAllTransactions returned unsigned transaction(s) — falling back to per-transaction signing');
  }
  if (!wallet.signTransaction) throw new Error('Wallet cannot sign transactions');

  const signed: Transaction[] = [];
  for (const tx of transactions) {
    const s = await wallet.signTransaction(tx);
    if (!isFullySigned(s)) throw new Error(SIGN_FAILED_MESSAGE);
    signed.push(s);
  }
  return signed;
}

/**
 * `confirmTransaction`'s blockhash-based strategy has a well-known false-negative:
 * it can report expiry (or the promise can reject/time out) due to a timing race
 * — RPC lag, a missed WebSocket notification, a proxy that doesn't forward
 * subscriptions cleanly — even though the transaction already landed on-chain.
 * Before trusting a confirm failure, check the signature status directly; if the
 * chain says it succeeded, believe the chain over the confirm call's own timeout.
 */
async function verifyLanded(rpc: RpcClient, signature: string): Promise<boolean> {
  try {
    const { value } = await rpc.perform('getSignatureStatuses', (connection) =>
      connection.getSignatureStatuses([signature]),
    );
    const status = value[0];
    return Boolean(
      status && !status.err && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized'),
    );
  } catch {
    return false;
  }
}

/** How often a pending transaction is re-sent and its status polled. */
const DEFAULT_REBROADCAST_MS = 2000;

/**
 * Send once, then keep the transaction alive until it lands or its blockhash dies.
 *
 * Why (diagnosed 2026-10-12, symptom: "Confirming 0 of 1" → "expired before confirming"):
 *  - Solana has no mempool. A transaction a leader drops is simply gone unless the
 *    client re-sends it. The old path sent with `maxRetries: 3` and then only waited.
 *  - `confirmTransaction` waits on a WebSocket signature subscription, which the `/rpc`
 *    proxy does not reliably forward — so even a landed tx could look pending until
 *    expiry. Polling `getSignatureStatuses` over plain HTTP doesn't depend on it.
 *  - `skipPreflight: true`: the plan was already simulated before signing, so a
 *    per-send preflight only adds latency to every attempt.
 *
 * Resolves once the chain reports confirmed/finalized (via either the poll or
 * confirmTransaction). Rejects on an on-chain error or blockhash expiry; the caller
 * then double-checks the chain before declaring failure.
 */
function sendRaw(rpc: RpcClient, raw: Buffer): Promise<string> {
  return rpc.perform('sendRawTransaction', (connection) =>
    connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }),
  );
}

async function keepAliveUntilLanded(
  rpc: RpcClient,
  raw: Buffer,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number,
  rebroadcastMs: number,
): Promise<void> {
  const send = () => sendRaw(rpc, raw);
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = () => new Promise<void>((resolve) => { timer = setTimeout(resolve, rebroadcastMs); });

  const viaConfirm = rpc
    .perform('confirmTransaction', (connection) =>
      connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, rpc.commitment),
    )
    .then((confirmation) => {
      if (confirmation.value.err) throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    });

  const viaPoll = (async () => {
    for (;;) {
      await wait();
      if (settled) return new Promise<void>(() => {}); // stop quietly once the race is decided
      send().catch(() => {}); // rebroadcast the same bytes; duplicates are deduped by signature
      let status;
      try {
        ({ value: [status] } = await rpc.perform('getSignatureStatuses', (connection) =>
          connection.getSignatureStatuses([signature]),
        ));
      } catch {
        continue; // transient RPC hiccup — keep going until expiry decides
      }
      if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) return;
    }
  })();

  try {
    await Promise.race([viaConfirm, viaPoll]);
  } finally {
    settled = true;
    if (timer) clearTimeout(timer);
    viaConfirm.catch(() => {});
    viaPoll.catch(() => {});
  }
}

/** Submit + confirm one already-signed transaction. Never throws. */
async function submitOne(
  rpc: RpcClient,
  meta: BuiltTransaction,
  signed: Transaction,
  index: number,
  total: number,
  blockhash: string,
  lastValidBlockHeight: number,
  onProgress: ExecuteOptions['onProgress'],
  rebroadcastMs: number = DEFAULT_REBROADCAST_MS,
): Promise<ExecutedTransaction> {
  let signature: string | null = null;
  try {
    const raw = signed.serialize();
    // First send: a hard error (malformed tx, RPC down) throws here and fails the tx.
    signature = await sendRaw(rpc, raw);
    try {
      await keepAliveUntilLanded(rpc, raw, signature, blockhash, lastValidBlockHeight, rebroadcastMs);
    } catch (confirmError) {
      const landed = await verifyLanded(rpc, signature);
      if (!landed) throw confirmError;
      log.warn('confirmTransaction false-negative — signature status shows success', { index, signature });
    }
    onProgress?.({ index, total, status: 'confirmed', signature });
    log.info('transaction confirmed', { index, signature });
    return { index, status: 'confirmed', signature, accounts: meta.accounts, feeTransfers: meta.feeTransfers, error: null };
  } catch (error) {
    const normalized = normalizeError(error);
    onProgress?.({ index, total, status: 'failed' });
    log.error('transaction failed', { index, code: normalized.code, message: normalized.message, signature });
    return { index, status: 'failed', signature: null, accounts: meta.accounts, feeTransfers: meta.feeTransfers, error: normalized };
  }
}

/**
 * Execute a built plan in blockhash-fresh batches. Independent close/burn
 * transactions do not abort each other — one bad account never blocks the rest.
 * The single service-fee transfer rides the final transaction, whose own closes
 * (plus rent from earlier confirmed batches) cover it.
 */
export async function executePlan(
  rpc: RpcClient,
  wallet: WalletSigner,
  built: BuiltTransaction[],
  options: ExecuteOptions = {},
): Promise<ExecutionReport> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  if (built.length === 0) {
    return { transactions: [], confirmedCount: 0, failedCount: 0, recoveredLamports: 0n, feeLamports: 0n };
  }

  const owner = wallet.publicKey;
  const total = built.length;
  const batches = chunk(built, BATCH_SIZE);
  const results: ExecutedTransaction[] = [];
  let processed = 0;

  for (const batch of batches) {
    // Fresh blockhash per batch — bounds every tx's lifetime to this batch.
    const { blockhash, lastValidBlockHeight } = await rpc.perform('getLatestBlockhash', (connection) =>
      connection.getLatestBlockhash(rpc.commitment),
    );
    for (const b of batch) {
      b.transaction.recentBlockhash = blockhash;
      b.transaction.feePayer = owner;
    }

    const signed = await signAll(
      wallet,
      batch.map((b) => b.transaction),
    );

    const batchResults = await mapWithConcurrency(batch, SUBMIT_CONCURRENCY, (meta, i) =>
      submitOne(rpc, meta, signed[i] as Transaction, processed + i, total, blockhash, lastValidBlockHeight, options.onProgress, options.rebroadcastMs),
    );
    results.push(...batchResults);
    processed += batch.length;
  }

  results.sort((a, b) => a.index - b.index);
  const confirmed = results.filter((r) => r.status === 'confirmed');
  const recoveredLamports = sumLamports(
    confirmed.flatMap((r) => r.accounts.map((a) => a.rentLamports)),
  );
  const feeLamports = sumLamports(
    confirmed.flatMap((r) => r.feeTransfers.map((t) => t.lamports)),
  );

  return {
    transactions: results,
    confirmedCount: confirmed.length,
    failedCount: results.filter((r) => r.status === 'failed').length,
    recoveredLamports,
    feeLamports,
  };
}
