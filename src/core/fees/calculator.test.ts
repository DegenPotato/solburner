import { describe, expect, it } from 'vitest';
import type { FeeConfig } from '@/config/types';
import { LAMPORTS_PER_SOL } from '@/utils/lamports';
import { applyRate, computeFee } from './calculator';

const recipient = '11111111111111111111111111111111';

function makeConfig(overrides: Partial<FeeConfig> = {}): FeeConfig {
  return {
    rate: 0.0087,
    minLamports: 0n,
    maxLamports: 0n,
    recipient,
    benchmarkRate: 0.02,
    referral: { share: 0, recipient: null },
    ...overrides,
  };
}

describe('applyRate', () => {
  it('returns 0 for non-positive inputs', () => {
    expect(applyRate(0n, 0.5)).toBe(0n);
    expect(applyRate(1000n, 0)).toBe(0n);
  });

  it('rounds half-up', () => {
    // 3 * 0.5 = 1.5 -> 2
    expect(applyRate(3n, 0.5)).toBe(2n);
  });

  it('computes percentage of one SOL', () => {
    // 0.87% of 1 SOL = 0.0087 SOL = 8_700_000 lamports
    expect(applyRate(LAMPORTS_PER_SOL, 0.0087)).toBe(8_700_000n);
  });
});

describe('computeFee', () => {
  it('splits gross into fee + net', () => {
    const result = computeFee({ grossLamports: LAMPORTS_PER_SOL, config: makeConfig() });
    expect(result.feeLamports).toBe(8_700_000n);
    expect(result.netLamports).toBe(LAMPORTS_PER_SOL - 8_700_000n);
    expect(result.grossLamports).toBe(LAMPORTS_PER_SOL);
  });

  it('charges nothing when no recipient is configured', () => {
    const result = computeFee({
      grossLamports: LAMPORTS_PER_SOL,
      config: makeConfig({ recipient: null }),
    });
    expect(result.feeLamports).toBe(0n);
    expect(result.netLamports).toBe(LAMPORTS_PER_SOL);
  });

  it('respects the minimum fee floor', () => {
    const result = computeFee({
      grossLamports: 1_000_000n,
      config: makeConfig({ minLamports: 50_000n }),
    });
    expect(result.feeLamports).toBe(50_000n);
  });

  it('respects the maximum fee ceiling', () => {
    const result = computeFee({
      grossLamports: 10n * LAMPORTS_PER_SOL,
      config: makeConfig({ maxLamports: 1_000_000n }),
    });
    expect(result.feeLamports).toBe(1_000_000n);
  });

  it('never charges more than the gross amount', () => {
    const result = computeFee({
      grossLamports: 100n,
      config: makeConfig({ rate: 1, minLamports: 10_000n }),
    });
    expect(result.feeLamports).toBeLessThanOrEqual(100n);
  });

  it('computes a referral split of the fee', () => {
    const result = computeFee({
      grossLamports: LAMPORTS_PER_SOL,
      config: makeConfig({ referral: { share: 0.3, recipient } }),
    });
    expect(result.referralLamports).toBe(2_610_000n); // 30% of 8.7M
    expect(result.platformLamports).toBe(result.feeLamports - result.referralLamports);
  });

  it('reports savings vs the benchmark', () => {
    const result = computeFee({ grossLamports: LAMPORTS_PER_SOL, config: makeConfig() });
    expect(result.comparison).not.toBeNull();
    // 2% benchmark = 20M lamports; fee 8.7M; savings 11.3M
    expect(result.comparison?.savingsLamports).toBe(11_300_000n);
  });

  it('omits comparison when disabled', () => {
    const result = computeFee({
      grossLamports: LAMPORTS_PER_SOL,
      config: makeConfig(),
      includeComparison: false,
    });
    expect(result.comparison).toBeNull();
  });
});
