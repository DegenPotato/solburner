/**
 * The fee engine — the ONE place fees are computed.
 *
 * Every number the UI displays (fee %, fee amount, net received, savings) and
 * every lamport the transaction builder actually charges flows through
 * `computeFee`. There is no second implementation. This guarantees the preview
 * and the on-chain transfer can never disagree.
 */

import type { FeeConfig } from '@/config/types';
import { clampBigInt } from '@/utils/lamports';
import type { FeeBreakdown, FeeComparison } from '../types';

/**
 * Multiply a lamport amount by a fractional rate with bigint-safe rounding.
 * Rates are scaled to 1e9 micro-units to avoid float error, then rounded half-up.
 */
export function applyRate(lamports: bigint, rate: number): bigint {
  if (rate <= 0 || lamports <= 0n) return 0n;
  const SCALE = 1_000_000_000n;
  const scaledRate = BigInt(Math.round(rate * Number(SCALE)));
  const product = lamports * scaledRate;
  // Round half-up: add half the divisor before integer division.
  return (product + SCALE / 2n) / SCALE;
}

export interface ComputeFeeInput {
  grossLamports: bigint;
  config: FeeConfig;
  /** Override whether to include the benchmark comparison (feature flag). */
  includeComparison?: boolean;
}

/** Compute the canonical fee breakdown for a gross reclaimable amount. */
export function computeFee({ grossLamports, config, includeComparison = true }: ComputeFeeInput): FeeBreakdown {
  const gross = grossLamports > 0n ? grossLamports : 0n;

  // Raw percentage fee, then clamp to absolute floor/ceiling (when configured),
  // and never charge more than the gross amount itself.
  let fee = applyRate(gross, config.rate);
  const min = config.minLamports > 0n ? config.minLamports : 0n;
  const max = config.maxLamports > 0n ? config.maxLamports : gross;
  fee = clampBigInt(fee, min, max);
  if (fee > gross) fee = gross;
  if (fee < 0n) fee = 0n;

  // If fee collection is disabled (no recipient), the service takes nothing.
  if (!config.recipient) fee = 0n;

  const net = gross - fee;
  const effectiveRate = gross > 0n ? Number(fee) / Number(gross) : 0;

  // Referral split — share of the *fee*, only when a referral recipient exists.
  const referral =
    config.referral.recipient && config.referral.share > 0
      ? applyRate(fee, config.referral.share)
      : 0n;
  const platform = fee - referral;

  const comparison =
    includeComparison && config.benchmarkRate && config.benchmarkRate > 0
      ? buildComparison(gross, fee, config.benchmarkRate)
      : null;

  return {
    grossLamports: gross,
    feeLamports: fee,
    effectiveRate,
    netLamports: net,
    referralLamports: referral,
    platformLamports: platform,
    comparison,
  };
}

function buildComparison(gross: bigint, fee: bigint, benchmarkRate: number): FeeComparison {
  const benchmarkFee = applyRate(gross, benchmarkRate);
  const savings = benchmarkFee > fee ? benchmarkFee - fee : 0n;
  return { benchmarkRate, benchmarkFeeLamports: benchmarkFee, savingsLamports: savings };
}
