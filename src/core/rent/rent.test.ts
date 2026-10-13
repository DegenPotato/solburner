import { describe, expect, it } from 'vitest';
import type { DiscoveredAccount } from '../types';
import { actionForKind, categorizeAccount, summarizeScan, sumRent } from './rent';

function account(partial: Partial<DiscoveredAccount>): DiscoveredAccount {
  return {
    id: partial.address ?? partial.id ?? 'addr',
    address: 'addr',
    mint: 'mint',
    program: 'token',
    kind: 'empty',
    action: 'close',
    rawAmount: 0n,
    decimals: 0,
    uiAmount: 0,
    rentLamports: 2_039_280n,
    isFrozen: false,
    ...partial,
  };
}

describe('categorizeAccount', () => {
  it('classifies zero balance as empty', () => {
    expect(categorizeAccount(0n, 6)).toBe('empty');
  });
  it('classifies single indivisible unit as nft', () => {
    expect(categorizeAccount(1n, 0)).toBe('nft');
  });
  it('classifies remaining balances as token', () => {
    expect(categorizeAccount(500n, 6)).toBe('token');
    expect(categorizeAccount(2n, 0)).toBe('token');
  });
});

describe('actionForKind', () => {
  it('maps kinds to recovery actions', () => {
    expect(actionForKind('empty')).toBe('close');
    expect(actionForKind('nft')).toBe('burn-and-close');
    expect(actionForKind('token')).toBe('burn-and-close');
    expect(actionForKind('cnft')).toBe('unsupported');
    expect(actionForKind('domain')).toBe('unsupported');
  });
});

describe('summarizeScan', () => {
  it('totals rent and counts kinds', () => {
    const accounts = [
      account({ id: 'a', kind: 'empty', rentLamports: 2_000_000n }),
      account({ id: 'b', kind: 'nft', rentLamports: 2_000_000n }),
      account({ id: 'c', kind: 'token', rentLamports: 3_000_000n }),
    ];
    const result = summarizeScan('owner', accounts);
    expect(result.totalRentLamports).toBe(7_000_000n);
    expect(result.counts.empty).toBe(1);
    expect(result.counts.nft).toBe(1);
    expect(result.counts.token).toBe(1);
    expect(result.owner).toBe('owner');
  });
});

describe('sumRent', () => {
  it('sums an arbitrary subset', () => {
    expect(sumRent([account({ rentLamports: 1n }), account({ rentLamports: 2n })])).toBe(3n);
  });
});
