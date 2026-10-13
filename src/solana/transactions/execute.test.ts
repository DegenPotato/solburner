import { describe, expect, it, vi } from 'vitest';
import { PublicKey, Transaction } from '@solana/web3.js';
import type { DiscoveredAccount } from '@/core/types';
import type { BuiltTransaction } from './builder';
import { executePlan } from './execute';

const OWNER = PublicKey.unique();

function acct(rent: bigint): DiscoveredAccount {
  const a = PublicKey.unique().toBase58();
  return {
    id: a, address: a, mint: '', program: 'token', kind: 'empty', action: 'close',
    rawAmount: 0n, decimals: 0, uiAmount: 0, rentLamports: rent, isFrozen: false,
  };
}

/** A BuiltTransaction whose serialize() returns a recognizable tag buffer. */
function bt(tag: string, rent = 1_000n): BuiltTransaction {
  const t = new Transaction();
  // Avoid real signing/serialization in the mock — stub serialize to the tag.
  (t as unknown as { serialize: () => Buffer }).serialize = () => Buffer.from(tag);
  return { transaction: t, accounts: [acct(rent)], feeTransfers: [] };
}

interface MockRpcOptions {
  /** sendRawTransaction throws for this tag. */
  sendFailTag?: string;
  /** confirmTransaction throws (simulating the blockhash-expiry false negative) for this tag. */
  confirmFailTag?: string;
  /** Tags for which getSignatureStatuses reports the tx actually landed on-chain. */
  landedTags?: string[];
  /** confirmTransaction never settles for these tags (a deaf WebSocket subscription). */
  hangConfirmTags?: string[];
  /** Tag → number of status polls that report "not found" before the tx shows as landed. */
  landAfterPolls?: Record<string, number>;
  /** Tags whose signature status reports an on-chain error. */
  statusErrTags?: string[];
}

/** Mock RpcClient with configurable send/confirm/status-check failure points. */
function makeRpc(options: MockRpcOptions = {}) {
  const { sendFailTag, confirmFailTag, landedTags = [], hangConfirmTags = [], landAfterPolls = {}, statusErrTags = [] } = options;
  const sends: Record<string, number> = {};
  const polls: Record<string, number> = {};
  const conn = {
    getLatestBlockhash: async () => ({ blockhash: 'bh', lastValidBlockHeight: 100 }),
    sendRawTransaction: async (raw: Buffer) => {
      const tag = raw.toString();
      sends[tag] = (sends[tag] ?? 0) + 1;
      if (sendFailTag && tag === sendFailTag) throw new Error('send failed');
      return `sig-${tag}`;
    },
    confirmTransaction: async ({ signature }: { signature: string }) => {
      const tag = signature.replace('sig-', '');
      if (hangConfirmTags.includes(tag)) return new Promise<never>(() => {});
      if (confirmFailTag && tag === confirmFailTag) throw new Error('block height exceeded');
      return { value: { err: null } };
    },
    getSignatureStatuses: async (sigs: string[]) => ({
      value: sigs.map((s) => {
        const tag = s.replace('sig-', '');
        polls[tag] = (polls[tag] ?? 0) + 1;
        if (statusErrTags.includes(tag)) return { err: { InstructionError: [2, 'Custom'] }, confirmationStatus: 'confirmed' };
        if (tag in landAfterPolls) return polls[tag]! > landAfterPolls[tag]! ? { err: null, confirmationStatus: 'confirmed' } : null;
        return landedTags.includes(tag) ? { err: null, confirmationStatus: 'confirmed' } : null;
      }),
    }),
  };
  return {
    commitment: 'confirmed' as const,
    perform: <T>(_label: string, fn: (c: typeof conn) => Promise<T>) => fn(conn),
    sends,
  };
}

function makeWallet() {
  const signAllTransactions = vi.fn(async (txs: Transaction[]) => txs);
  return { wallet: { publicKey: OWNER, signAllTransactions }, signAllTransactions };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('executePlan', () => {
  it('confirms all transactions and sums recovered rent', async () => {
    const rpc = makeRpc();
    const { wallet } = makeWallet();
    const built = [bt('a', 1000n), bt('b', 2000n), bt('c', 3000n)];
    const report = await executePlan(rpc as any, wallet as any, built);
    expect(report.confirmedCount).toBe(3);
    expect(report.failedCount).toBe(0);
    expect(report.recoveredLamports).toBe(6000n);
  });

  it('signs in batches of 40 (one wallet approval per batch)', async () => {
    const rpc = makeRpc();
    const { wallet, signAllTransactions } = makeWallet();
    const built = Array.from({ length: 45 }, (_, i) => bt(`t${i}`));
    await executePlan(rpc as any, wallet as any, built);
    // 45 txs => two batches (40 + 5) => two sign calls
    expect(signAllTransactions).toHaveBeenCalledTimes(2);
  });

  it('does not abort siblings when one transaction fails', async () => {
    const rpc = makeRpc({ sendFailTag: 'b' }); // the tx tagged "b" fails to send
    const { wallet } = makeWallet();
    const built = [bt('a', 1000n), bt('b', 2000n), bt('c', 3000n)];
    const report = await executePlan(rpc as any, wallet as any, built);
    expect(report.confirmedCount).toBe(2);
    expect(report.failedCount).toBe(1);
    // No transaction is marked "skipped" — failures are independent.
    expect(report.transactions.some((t) => t.status === 'skipped')).toBe(false);
    // Only the two successful accounts' rent counts toward recovery.
    expect(report.recoveredLamports).toBe(4000n);
  });

  it('treats a confirmTransaction false-negative as success when the signature actually landed', async () => {
    // Regression test: confirmTransaction can report "expired"/throw due to a
    // timing race even though the transaction is already on-chain. If
    // getSignatureStatuses shows it landed, the executor must trust the chain,
    // not the confirm call's own timeout — otherwise a successful burn/claim
    // shows up as "failed" in the UI while the user's SOL was already reclaimed.
    const rpc = makeRpc({ confirmFailTag: 'b', landedTags: ['b'] });
    const { wallet } = makeWallet();
    const built = [bt('a', 1000n), bt('b', 2000n), bt('c', 3000n)];
    const report = await executePlan(rpc as any, wallet as any, built);
    expect(report.confirmedCount).toBe(3);
    expect(report.failedCount).toBe(0);
    expect(report.recoveredLamports).toBe(6000n);
  });

  it('confirms via status polling when confirmTransaction never settles (deaf WebSocket)', async () => {
    // Regression test for 2026-10-12, "Confirming 0 of 1" → "expired before confirming":
    // confirmTransaction waits on a WebSocket subscription the /rpc proxy may not
    // forward. Polling getSignatureStatuses over HTTP must land the tx regardless.
    const rpc = makeRpc({ hangConfirmTags: ['a'], landAfterPolls: { a: 1 } });
    const { wallet } = makeWallet();
    const report = await executePlan(rpc as any, wallet as any, [bt('a', 1000n)], { rebroadcastMs: 5 });
    expect(report.confirmedCount).toBe(1);
    expect(report.recoveredLamports).toBe(1000n);
  });

  it('re-sends the same signed bytes while a transaction is pending', async () => {
    // Solana has no mempool: a dropped tx is gone unless the client re-sends it.
    // The old path sent with maxRetries:3 and then only waited.
    const rpc = makeRpc({ hangConfirmTags: ['a'], landAfterPolls: { a: 3 } });
    const { wallet } = makeWallet();
    const report = await executePlan(rpc as any, wallet as any, [bt('a')], { rebroadcastMs: 5 });
    expect(report.confirmedCount).toBe(1);
    expect(rpc.sends['a']).toBeGreaterThan(1);
  });

  it('reports failure when the chain records an on-chain error', async () => {
    const rpc = makeRpc({ hangConfirmTags: ['a'], statusErrTags: ['a'] });
    const { wallet } = makeWallet();
    const report = await executePlan(rpc as any, wallet as any, [bt('a')], { rebroadcastMs: 5 });
    expect(report.confirmedCount).toBe(0);
    expect(report.failedCount).toBe(1);
  });

  it('still reports failure when confirmTransaction fails AND the signature never landed', async () => {
    const rpc = makeRpc({ confirmFailTag: 'b', landedTags: [] }); // truly expired, never landed
    const { wallet } = makeWallet();
    const built = [bt('a', 1000n), bt('b', 2000n), bt('c', 3000n)];
    const report = await executePlan(rpc as any, wallet as any, built);
    expect(report.confirmedCount).toBe(2);
    expect(report.failedCount).toBe(1);
    expect(report.transactions.find((t) => t.status === 'failed')?.signature).toBeNull();
  });

  it('falls back to per-transaction signing when signAllTransactions returns unsigned transactions', async () => {
    // Regression test for the desktop-extension failure mode: the wallet
    // resolves signAllTransactions but leaves the required signature slot null
    // (extension conflicts, hardware/seedless accounts). The executor must
    // detect this and retry via signTransaction instead of failing later at
    // serialize() with "Missing signature for public key …".
    const rpc = makeRpc();
    const signAllTransactions = vi.fn(async (txs: Transaction[]) =>
      txs.map((tx) => {
        tx.signatures = [{ publicKey: OWNER, signature: null }];
        return tx;
      }),
    );
    const signTransaction = vi.fn(async (tx: Transaction) => {
      tx.signatures = [{ publicKey: OWNER, signature: Buffer.alloc(64, 1) }];
      return tx;
    });
    const wallet = { publicKey: OWNER, signAllTransactions, signTransaction };
    const built = [bt('a', 1000n), bt('b', 2000n)];
    const report = await executePlan(rpc as any, wallet as any, built);
    expect(signTransaction).toHaveBeenCalledTimes(2);
    expect(report.confirmedCount).toBe(2);
    expect(report.failedCount).toBe(0);
  });

  it('throws a descriptive error when the wallet cannot produce a signature at all', async () => {
    const rpc = makeRpc();
    const unsign = (tx: Transaction) => {
      tx.signatures = [{ publicKey: OWNER, signature: null }];
      return tx;
    };
    const wallet = {
      publicKey: OWNER,
      signAllTransactions: async (txs: Transaction[]) => txs.map(unsign),
      signTransaction: async (tx: Transaction) => unsign(tx),
    };
    const built = [bt('a', 1000n)];
    await expect(executePlan(rpc as any, wallet as any, built)).rejects.toThrow(/without signing/);
  });

  it('returns an empty report for an empty plan', async () => {
    const rpc = makeRpc();
    const { wallet } = makeWallet();
    const report = await executePlan(rpc as any, wallet as any, []);
    expect(report).toEqual({ transactions: [], confirmedCount: 0, failedCount: 0, recoveredLamports: 0n, feeLamports: 0n });
  });
});
