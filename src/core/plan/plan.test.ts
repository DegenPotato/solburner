import { describe, expect, it } from 'vitest';
import type { FeeConfig } from '@/config/types';
import type { DiscoveredAccount } from '../types';
import {
  TX_ACCOUNT_BYTE_BUDGET,
  buildCleanupPlan,
  estimateAccountBytes,
  isExecutable,
  packIntoTransactions,
} from './plan';

const feeConfig: FeeConfig = {
  rate: 0.0087,
  minLamports: 0n,
  maxLamports: 0n,
  recipient: '11111111111111111111111111111111',
  benchmarkRate: 0.02,
  referral: { share: 0, recipient: null },
};

function account(id: string, action: DiscoveredAccount['action'] = 'close'): DiscoveredAccount {
  return {
    id,
    address: id,
    mint: 'mint',
    program: 'token',
    kind: action === 'close' ? 'empty' : 'token',
    action,
    rawAmount: action === 'close' ? 0n : 100n,
    decimals: 6,
    uiAmount: 0,
    rentLamports: 2_039_280n,
    isFrozen: false,
  };
}

describe('packIntoTransactions', () => {
  it('keeps every group within the per-transaction byte budget', () => {
    const accounts = Array.from({ length: 200 }, (_, i) => account(`a${i}`));
    const groups = packIntoTransactions(accounts);
    for (const group of groups) {
      const bytes = group.reduce((sum, a) => sum + estimateAccountBytes(a), 0);
      expect(bytes).toBeLessThanOrEqual(TX_ACCOUNT_BYTE_BUDGET);
    }
  });

  it('fits more simple closes than burn-and-closes per transaction (bytes, not count)', () => {
    const closes = packIntoTransactions(Array.from({ length: 40 }, (_, i) => account(`c${i}`)));
    const burns = packIntoTransactions(Array.from({ length: 40 }, (_, i) => account(`b${i}`, 'burn-and-close')));
    // burn-and-close adds a mint key per asset, so it packs fewer per transaction.
    expect(closes[0]!.length).toBeGreaterThan(burns[0]!.length);
  });

  it('never overflows even with a heavy AMM pump-reward claim in the mix', () => {
    const heavy = account('pump', 'claim-pump-rewards');
    heavy.pump = { program: 'amm', uva: 'uva', rentLamports: 1n, cashbackLamports: 5n };
    const accounts = [heavy, ...Array.from({ length: 30 }, (_, i) => account(`b${i}`, 'burn-and-close'))];
    const groups = packIntoTransactions(accounts);
    for (const group of groups) {
      const bytes = group.reduce((sum, a) => sum + estimateAccountBytes(a), 0);
      expect(bytes).toBeLessThanOrEqual(TX_ACCOUNT_BYTE_BUDGET);
    }
  });
});

describe('isExecutable', () => {
  it('treats close/burn-and-close as executable, others not', () => {
    expect(isExecutable(account('a', 'close'))).toBe(true);
    expect(isExecutable(account('b', 'burn-and-close'))).toBe(true);
    expect(isExecutable(account('c', 'unsupported'))).toBe(false);
  });
});

describe('buildCleanupPlan', () => {
  it('returns an empty plan for no accounts', () => {
    const plan = buildCleanupPlan({ accounts: [], feeConfig });
    expect(plan.transactionCount).toBe(0);
    expect(plan.fee.grossLamports).toBe(0n);
  });

  it('excludes unsupported assets from fee + tx count', () => {
    const accounts = [account('a'), account('b'), account('x', 'unsupported')];
    const plan = buildCleanupPlan({ accounts, feeConfig });
    expect(plan.accounts).toHaveLength(2);
    expect(plan.fee.grossLamports).toBe(2n * 2_039_280n);
    expect(plan.transactionCount).toBe(1);
  });

  it('estimates a positive network fee and subtracts it from the net', () => {
    const plan = buildCleanupPlan({
      accounts: [account('a'), account('b')],
      feeConfig,
      networkFee: { baseSignatureFeeLamports: 5_000n, priorityMicroLamports: 20_000 },
    });
    expect(plan.networkFeeLamports).toBeGreaterThan(0n);
    expect(plan.netAfterNetworkLamports).toBe(plan.fee.netLamports - plan.networkFeeLamports);
  });

  it('reports zero network fee when no params are supplied', () => {
    const plan = buildCleanupPlan({ accounts: [account('a')], feeConfig });
    expect(plan.networkFeeLamports).toBe(0n);
    expect(plan.netAfterNetworkLamports).toBe(plan.fee.netLamports);
  });
});
