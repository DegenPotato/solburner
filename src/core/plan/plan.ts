/**
 * Cleanup planning: turn a selection into a costed `CleanupPlan`.
 *
 * The plan reports the fee (via the single fee engine) and how many on-chain
 * transactions the work will be split into. The packing math here MUST match the
 * transaction builder so the previewed transaction count is accurate.
 */

import type { FeeConfig } from '@/config/types';
import { computeFee } from '../fees/calculator';
import { sumRent } from '../rent/rent';
import type { CleanupPlan, DiscoveredAccount } from '../types';

/**
 * Solana caps a serialized transaction at 1232 bytes. That ceiling — NOT the
 * instruction count — is what actually bounds how many accounts fit in one
 * transaction, and it's dominated by unique account keys (32 bytes each).
 * Different actions add very different numbers of keys: a `close` adds 1, a
 * `burn-and-close` adds 2 (account + mint), and an AMM pump-reward claim pulls
 * in ~9. So we pack by ESTIMATED serialized bytes, not a flat instruction
 * budget (a weight budget silently overflowed 1232 whenever a group happened to
 * contain enough burns or a pump claim). Estimates are deliberately conservative
 * — worst case, no key dedup — and a real-serialization test in the builder
 * guarantees a built transaction never crosses the on-chain limit.
 */
export const MAX_TRANSACTION_BYTES = 1232;

/**
 * Fixed per-transaction overhead, rounded up for safety: signature (65) +
 * message header (3) + recent blockhash (32) + compact-array length prefixes +
 * the always-present shared keys (fee payer, ComputeBudget program, a token
 * program) + the two compute-budget instructions.
 */
const TX_OVERHEAD_BYTES = 240;

/**
 * The final transaction also carries the service-fee transfer(s): the System
 * program key plus up to two recipient keys and their transfer instructions.
 * Reserved on every transaction's budget so packing needn't know which group is
 * last (costs at most a little extra splitting; never an over-limit tx).
 */
const FEE_TRANSFER_BYTES = 140;

/**
 * Headroom reserved in every transaction for the WALLET's own guard
 * instructions. Phantom (and other wallets) append Lighthouse assertion
 * instructions that verify the simulated balance changes actually hold on-chain.
 * If a transaction is packed right up to the 1232-byte ceiling there's no room
 * for them, so Phantom can't guard it and falls back to an unverified "balance
 * changes are estimated — amounts and assets are not guaranteed" warning (which
 * reads to users like a scam flag). Leaving this slack lets the guard fit, so
 * the request shows verified balance changes instead. Tunable: raise it if the
 * warning still appears on large batches (raising it = smaller/more txs). Sized
 * for the worst case where the guard asserts one balance change per account in
 * the group. (Per Phantom support guidance.)
 */
export const LIGHTHOUSE_RESERVE_BYTES = 320;

/** Byte budget available for account-recovery instructions within one transaction. */
export const TX_ACCOUNT_BYTE_BUDGET =
  MAX_TRANSACTION_BYTES - TX_OVERHEAD_BYTES - FEE_TRANSFER_BYTES - LIGHTHOUSE_RESERVE_BYTES;

/** Whether an asset's action can be executed by the current transaction builder. */
export function isExecutable(account: DiscoveredAccount): boolean {
  return (
    account.action === 'close' ||
    account.action === 'burn-and-close' ||
    account.action === 'claim-pump-rewards'
  );
}

const ACCOUNT_KEY_BYTES = 32;

/**
 * Conservative estimate of the serialized bytes a single asset's recovery
 * instructions add to a transaction: new account keys (32 bytes each, assuming
 * NO dedup) plus instruction overhead. Biased high — over-estimating only costs
 * an extra transaction; under-estimating risks the 1232-byte limit. Mirrors the
 * instructions the builder emits per action (see `appendAccountInstructions`).
 */
export function estimateAccountBytes(account: DiscoveredAccount): number {
  const withheld = account.program === 'token-2022' && (account.withheldAmount ?? 0n) > 0n;
  switch (account.action) {
    case 'claim-pump-rewards':
      // AMM cashback expands to ATA-create + claim + close-WSOL + close-UVA,
      // pulling in ~9 unique accounts; every other path is a plain ~3-key close.
      return account.pump?.program === 'amm' && (account.pump.cashbackLamports ?? 0n) > 0n
        ? 9 * ACCOUNT_KEY_BYTES + 90
        : 3 * ACCOUNT_KEY_BYTES + 40;
    case 'burn-and-close':
      // token account + mint keys, plus burn and close instructions (+ harvest).
      return 2 * ACCOUNT_KEY_BYTES + 32 + (withheld ? 14 : 0);
    case 'unsupported':
      return 0;
    default:
      // close: token-account key + close ix. Token-2022 with withheld fees also
      // needs the mint key + a harvest ix before the close.
      return ACCOUNT_KEY_BYTES + 10 + (withheld ? ACCOUNT_KEY_BYTES + 14 : 0);
  }
}

/**
 * Estimated compute units for a single asset's recovery action. Conservative but
 * proportional, so the builder can right-size each transaction's CU limit (a
 * fixed high limit overpays priority fees, which come out of the user's net).
 */
export function estimateComputeUnits(account: DiscoveredAccount): number {
  const harvest = account.program === 'token-2022' && (account.withheldAmount ?? 0n) > 0n ? 15_000 : 0;
  switch (account.action) {
    case 'claim-pump-rewards':
      return account.pump?.program === 'amm' && (account.pump.cashbackLamports ?? 0n) > 0n ? 90_000 : 25_000;
    case 'burn-cnft':
      return 120_000;
    case 'burn-and-close':
      return 12_000 + harvest;
    case 'unsupported':
      return 0;
    default:
      return 6_000 + harvest;
  }
}

/** Max compute units a single Solana transaction may request. */
export const MAX_COMPUTE_UNITS = 1_400_000;
/** Fixed per-transaction overhead (compute-budget ixs + a trailing fee transfer). */
const TX_BASE_COMPUTE_UNITS = 6_000;
/**
 * Compute units reserved for the wallet's appended guard (Lighthouse) assertion
 * instructions, so they run within our requested CU limit rather than blowing
 * it — the CU counterpart of `LIGHTHOUSE_RESERVE_BYTES`. Cheap: at the default
 * 20k µLamports/CU price this adds ~600 lamports of priority fee per tx.
 */
const LIGHTHOUSE_CU_RESERVE = 30_000;

/** Right-sized CU limit for a group of assets, clamped to the network maximum. */
export function estimateGroupComputeUnits(group: readonly DiscoveredAccount[]): number {
  const total = group.reduce(
    (sum, a) => sum + estimateComputeUnits(a),
    TX_BASE_COMPUTE_UNITS + LIGHTHOUSE_CU_RESERVE,
  );
  return Math.min(MAX_COMPUTE_UNITS, total);
}

export interface NetworkFeeParams {
  /** Base signature fee per transaction (lamports). Solana: 5000 per signature. */
  baseSignatureFeeLamports: bigint;
  /** Priority fee price in micro-lamports per compute unit. */
  priorityMicroLamports: number;
}

/**
 * Estimate total network + priority fees to submit `groups`. Uses the SAME CU
 * sizing the builder applies, so the displayed cost matches what's actually paid.
 */
export function estimateNetworkFeeLamports(
  groups: readonly DiscoveredAccount[][],
  params: NetworkFeeParams,
): bigint {
  let total = 0n;
  for (const group of groups) {
    const cu = estimateGroupComputeUnits(group);
    // priority fee = ceil(price_microLamports * cu / 1_000_000)
    const priority = (BigInt(params.priorityMicroLamports) * BigInt(cu) + 999_999n) / 1_000_000n;
    total += params.baseSignatureFeeLamports + priority;
  }
  return total;
}

/**
 * Pack accounts into transaction-sized groups by estimated serialized bytes,
 * keeping each group safely under Solana's 1232-byte limit. Returns the grouped
 * accounts; the builder appends a single fee transfer to the final group.
 */
export function packIntoTransactions(accounts: readonly DiscoveredAccount[]): DiscoveredAccount[][] {
  const groups: DiscoveredAccount[][] = [];
  let current: DiscoveredAccount[] = [];
  let bytes = 0;

  for (const account of accounts) {
    const b = estimateAccountBytes(account);
    if (bytes + b > TX_ACCOUNT_BYTE_BUDGET && current.length > 0) {
      groups.push(current);
      current = [];
      bytes = 0;
    }
    current.push(account);
    bytes += b;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

export interface BuildPlanInput {
  accounts: readonly DiscoveredAccount[];
  feeConfig: FeeConfig;
  includeComparison?: boolean;
  /** Network-fee estimation inputs (from config/constants). Omit to skip. */
  networkFee?: NetworkFeeParams;
}

/** Build the costed cleanup plan. Only executable assets contribute to fee/tx. */
export function buildCleanupPlan({ accounts, feeConfig, includeComparison, networkFee }: BuildPlanInput): CleanupPlan {
  const list = accounts.filter(isExecutable);
  const gross = sumRent(list);
  const fee = computeFee({ grossLamports: gross, config: feeConfig, includeComparison });
  const groups = list.length === 0 ? [] : packIntoTransactions(list);
  const networkFeeLamports = networkFee ? estimateNetworkFeeLamports(groups, networkFee) : 0n;
  const netAfterNetworkLamports = fee.netLamports - networkFeeLamports;

  return {
    accounts: list,
    fee,
    transactionCount: groups.length,
    networkFeeLamports,
    netAfterNetworkLamports,
  };
}
