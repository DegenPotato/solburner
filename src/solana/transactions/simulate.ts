/**
 * Pre-flight simulation. Runs each built transaction through the RPC simulator
 * with a fresh blockhash so failures surface BEFORE the user is asked to sign.
 */

import { Transaction } from '@solana/web3.js';
import { createLogger } from '@/utils/logger';
import type { RpcClient } from '../rpc/connection';
import type { BuiltTransaction } from './builder';

const log = createLogger('simulate');

export interface SimulationResult {
  index: number;
  ok: boolean;
  error: string | null;
  /** Estimated compute units consumed, when reported by the node. */
  unitsConsumed?: number;
  logs?: string[];
}

/** Simulate one transaction (mutates its blockhash to the provided one). */
async function simulateOne(
  rpc: RpcClient,
  built: BuiltTransaction,
  blockhash: string,
  index: number,
): Promise<SimulationResult> {
  const tx = built.transaction;
  tx.recentBlockhash = blockhash;

  try {
    const result = await rpc.perform('simulateTransaction', (connection) =>
      connection.simulateTransaction(tx),
    );
    const err = result.value.err;
    if (err) {
      const message = typeof err === 'string' ? err : JSON.stringify(err);
      log.warn('simulation reported error', { index, err: message });
      return { index, ok: false, error: message, logs: result.value.logs ?? undefined };
    }
    return {
      index,
      ok: true,
      error: null,
      unitsConsumed: result.value.unitsConsumed,
      logs: result.value.logs ?? undefined,
    };
  } catch (error) {
    return { index, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Simulate every transaction in a plan. Returns one result per transaction. */
export async function simulatePlan(
  rpc: RpcClient,
  transactions: BuiltTransaction[],
): Promise<SimulationResult[]> {
  if (transactions.length === 0) return [];
  const { blockhash } = await rpc.perform('getLatestBlockhash', (connection) =>
    connection.getLatestBlockhash(rpc.commitment),
  );

  // Simulations are independent and read-only — run them in parallel.
  return Promise.all(transactions.map((built, index) => simulateOne(rpc, built, blockhash, index)));
}

export { Transaction };
