import { describe, expect, it } from 'vitest';
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { FeeConfig } from '@/config/types';
import type { DiscoveredAccount } from '@/core/types';
import { LIGHTHOUSE_RESERVE_BYTES, MAX_TRANSACTION_BYTES, buildCleanupPlan } from '@/core/plan/plan';
import { buildCleanupTransactions } from './builder';

// On-curve owner (a real wallet key) — required for ATA derivation in the pump path.
const OWNER = Keypair.generate().publicKey;
const FEE_RECIPIENT = PublicKey.unique().toBase58();

const feeConfig: FeeConfig = {
  rate: 0.01,
  minLamports: 0n,
  maxLamports: 0n,
  recipient: FEE_RECIPIENT,
  benchmarkRate: 0.02,
  referral: { share: 0, recipient: null },
};

function account(overrides: Partial<DiscoveredAccount>): DiscoveredAccount {
  const addr = PublicKey.unique().toBase58();
  return {
    id: addr,
    address: addr,
    mint: PublicKey.unique().toBase58(),
    program: 'token',
    kind: 'empty',
    action: 'close',
    rawAmount: 0n,
    decimals: 0,
    uiAmount: 0,
    rentLamports: 2_039_280n,
    isFrozen: false,
    ...overrides,
  };
}

function plan(accounts: DiscoveredAccount[]) {
  return buildCleanupPlan({ accounts, feeConfig });
}

function programIds(instructions: { programId: PublicKey }[]): string[] {
  return instructions.map((ix) => ix.programId.toBase58());
}

describe('buildCleanupTransactions', () => {
  it('returns nothing for an empty plan', () => {
    expect(buildCleanupTransactions({ owner: OWNER, plan: plan([]), feeRecipient: FEE_RECIPIENT, referralRecipient: null })).toEqual([]);
  });

  it('prepends compute-budget instructions and closes each account', () => {
    const acc = account({});
    const [tx] = buildCleanupTransactions({ owner: OWNER, plan: plan([acc]), feeRecipient: FEE_RECIPIENT, referralRecipient: null });
    const ids = programIds(tx!.transaction.instructions);
    // setComputeUnitLimit, setComputeUnitPrice, close, fee transfer
    expect(ids[0]).toBe(ComputeBudgetProgram.programId.toBase58());
    expect(ids[1]).toBe(ComputeBudgetProgram.programId.toBase58());
    expect(ids).toContain(TOKEN_PROGRAM_ID.toBase58());
    expect(ids).toContain(SystemProgram.programId.toBase58()); // the fee transfer
  });

  it('burns before closing for burn-and-close accounts', () => {
    const acc = account({ kind: 'token', action: 'burn-and-close', rawAmount: 1000n, decimals: 6 });
    const [tx] = buildCleanupTransactions({ owner: OWNER, plan: plan([acc]), feeRecipient: FEE_RECIPIENT, referralRecipient: null });
    const tokenIxs = tx!.transaction.instructions.filter((ix) => ix.programId.equals(TOKEN_PROGRAM_ID));
    // two token-program ixs: burn then close, in that order
    expect(tokenIxs).toHaveLength(2);
  });

  it('inserts a harvest before close for Token-2022 accounts with withheld fees', () => {
    const acc = account({ program: 'token-2022', kind: 'token', action: 'burn-and-close', rawAmount: 1000n, decimals: 6, withheldAmount: 500n });
    const [tx] = buildCleanupTransactions({ owner: OWNER, plan: plan([acc]), feeRecipient: FEE_RECIPIENT, referralRecipient: null });
    const t22 = tx!.transaction.instructions.filter((ix) => ix.programId.equals(TOKEN_2022_PROGRAM_ID));
    // burn + harvest + close = 3 Token-2022 instructions
    expect(t22).toHaveLength(3);
  });

  it('does NOT harvest when there are no withheld fees', () => {
    const acc = account({ program: 'token-2022', kind: 'token', action: 'burn-and-close', rawAmount: 1000n, decimals: 6, withheldAmount: 0n });
    const [tx] = buildCleanupTransactions({ owner: OWNER, plan: plan([acc]), feeRecipient: FEE_RECIPIENT, referralRecipient: null });
    const t22 = tx!.transaction.instructions.filter((ix) => ix.programId.equals(TOKEN_2022_PROGRAM_ID));
    expect(t22).toHaveLength(2); // burn + close only
  });

  it('attaches the fee transfer ONLY to the last transaction', () => {
    // Enough accounts to force multiple transactions (byte-budgeted packing).
    const accounts = Array.from({ length: 30 }, () => account({}));
    const built = buildCleanupTransactions({ owner: OWNER, plan: plan(accounts), feeRecipient: FEE_RECIPIENT, referralRecipient: null });
    expect(built.length).toBeGreaterThan(1);
    built.forEach((b, i) => {
      const hasTransfer = b.transaction.instructions.some((ix) => ix.programId.equals(SystemProgram.programId));
      expect(hasTransfer).toBe(i === built.length - 1);
      expect(b.feeTransfers.length).toBe(i === built.length - 1 ? 1 : 0);
    });
  });

  it('adds no fee transfer when no recipient is configured', () => {
    const noFee = buildCleanupPlan({ accounts: [account({})], feeConfig: { ...feeConfig, recipient: null } });
    const [tx] = buildCleanupTransactions({ owner: OWNER, plan: noFee, feeRecipient: null, referralRecipient: null });
    const transfers = tx!.transaction.instructions.filter((ix) => ix.programId.equals(SystemProgram.programId));
    expect(transfers).toHaveLength(0);
  });

  it('leaves Lighthouse-guard headroom under the 1232-byte limit', () => {
    // Regression: packing used to budget by instruction COUNT, which silently
    // overflowed the 1232-byte size limit once a group held enough burns (each
    // adds a 32-byte mint key) or a heavy pump-reward claim. Packing now budgets
    // by estimated bytes AND reserves LIGHTHOUSE_RESERVE_BYTES of headroom so the
    // wallet can append its guard (Lighthouse) instructions — otherwise Phantom
    // can't verify the tx and shows a scam-like "not guaranteed" warning. This
    // proves the real serialized output (with both fee transfers attached) stays
    // within 1232 - LIGHTHOUSE_RESERVE_BYTES across the worst-case action mixes.
    const MAX_WITH_GUARD_ROOM = MAX_TRANSACTION_BYTES - LIGHTHOUSE_RESERVE_BYTES;
    const pumpAmm = account({
      kind: 'reward',
      action: 'claim-pump-rewards',
      pump: { program: 'amm', uva: PublicKey.unique().toBase58(), rentLamports: 2_000_000n, cashbackLamports: 5_000n },
    });
    const scenarios: DiscoveredAccount[][] = [
      Array.from({ length: 60 }, () => account({})), // simple closes, distinct mints
      Array.from({ length: 60 }, () => account({ kind: 'token', action: 'burn-and-close', rawAmount: 1000n })),
      Array.from({ length: 60 }, () =>
        account({ program: 'token-2022', kind: 'token', action: 'burn-and-close', rawAmount: 1000n, withheldAmount: 500n }),
      ),
      [pumpAmm, ...Array.from({ length: 40 }, () => account({ kind: 'token', action: 'burn-and-close', rawAmount: 1000n }))],
    ];

    const referralRecipient = PublicKey.unique().toBase58();
    for (const accounts of scenarios) {
      // Referral share > 0 forces BOTH platform + referral transfers onto the
      // final tx — the heaviest possible trailing instruction set.
      const withReferral = buildCleanupPlan({
        accounts,
        feeConfig: { ...feeConfig, referral: { share: 0.3, recipient: referralRecipient } },
      });
      const built = buildCleanupTransactions({
        owner: OWNER,
        plan: withReferral,
        feeRecipient: FEE_RECIPIENT,
        referralRecipient,
      });
      expect(built.length).toBeGreaterThan(0);
      for (const b of built) {
        b.transaction.recentBlockhash = PublicKey.unique().toBase58();
        const size = b.transaction.serialize({ verifySignatures: false, requireAllSignatures: false }).length;
        expect(size).toBeLessThanOrEqual(MAX_WITH_GUARD_ROOM);
      }
    }
  });

  it('splits platform + referral into two transfers when referral is configured', () => {
    const referral = PublicKey.unique().toBase58();
    const refPlan = buildCleanupPlan({
      accounts: [account({})],
      feeConfig: { ...feeConfig, referral: { share: 0.3, recipient: referral } },
    });
    const [tx] = buildCleanupTransactions({ owner: OWNER, plan: refPlan, feeRecipient: FEE_RECIPIENT, referralRecipient: referral });
    const transfers = tx!.transaction.instructions.filter((ix) => ix.programId.equals(SystemProgram.programId));
    expect(transfers).toHaveLength(2);
  });
});
