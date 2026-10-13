import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import type { PumpRewardInfo } from '@/core/types';
import {
  IX_DISCRIMINATOR,
  PUMP_AMM_PROGRAM_ID,
  PUMP_PROGRAM_ID,
  eventAuthority,
  userVolumeAccumulator,
} from './constants';
import { buildPumpRewardInstructions } from './rewards';

// Ground-truth values taken from a verified on-chain claim transaction.
const USER = new PublicKey('7CdkeVCRV7WeGDjBPfZoqehHiQMo2GL2n6pxYJbHExn1');
const PUMP_UVA = '3PMoYCeBxnXAzr4omiw83o2T7jL8s9kNyttRAE4Giueo';
const AMM_UVA = '5j9EUw1wy9mKa13VMpGn13gCm47YorPhKik4n1AsHVcD';
const PUMP_EVT = 'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1';
const AMM_EVT = 'GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

describe('pump reward primitives', () => {
  it('has the correct anchor discriminators', () => {
    expect(hex(IX_DISCRIMINATOR.closeUserVolumeAccumulator)).toBe('f945a4da9667548a');
    expect(hex(IX_DISCRIMINATOR.claimCashback)).toBe('253a237ebe35e4c5');
  });

  it('derives the verified volume-accumulator PDAs', () => {
    expect(userVolumeAccumulator(PUMP_PROGRAM_ID, USER).toBase58()).toBe(PUMP_UVA);
    expect(userVolumeAccumulator(PUMP_AMM_PROGRAM_ID, USER).toBase58()).toBe(AMM_UVA);
  });

  it('derives the verified event authorities', () => {
    expect(eventAuthority(PUMP_PROGRAM_ID).toBase58()).toBe(PUMP_EVT);
    expect(eventAuthority(PUMP_AMM_PROGRAM_ID).toBase58()).toBe(AMM_EVT);
  });
});

describe('buildPumpRewardInstructions', () => {
  const base: Omit<PumpRewardInfo, 'program' | 'cashbackLamports' | 'uva'> = { rentLamports: 1_000_000n };

  it('pump-main reward with no cashback emits a single close instruction', () => {
    const ixs = buildPumpRewardInstructions(USER, { ...base, program: 'pump', uva: PUMP_UVA, cashbackLamports: 0n });
    expect(ixs).toHaveLength(1);
    expect(ixs[0]!.programId.equals(PUMP_PROGRAM_ID)).toBe(true);
    expect(ixs[0]!.keys).toHaveLength(4);
  });

  it('pump-main reward with cashback claims (5-account SOL claim) then closes', () => {
    const ixs = buildPumpRewardInstructions(USER, { ...base, program: 'pump', uva: PUMP_UVA, cashbackLamports: 1_000n });
    expect(ixs).toHaveLength(2);
    // claim_cashback (main): user, uva, system_program, event_authority, program
    expect(ixs[0]!.programId.equals(PUMP_PROGRAM_ID)).toBe(true);
    expect(ixs[0]!.keys).toHaveLength(5);
    expect(hex(ixs[0]!.data)).toBe('253a237ebe35e4c5');
    // then close
    expect(ixs[1]!.keys).toHaveLength(4);
  });

  it('amm reward with no cashback emits a single close', () => {
    const ixs = buildPumpRewardInstructions(USER, { ...base, program: 'amm', uva: AMM_UVA, cashbackLamports: 0n });
    expect(ixs).toHaveLength(1);
    expect(ixs[0]!.programId.equals(PUMP_AMM_PROGRAM_ID)).toBe(true);
  });

  it('amm reward with cashback emits create-ATA → claim → close-ATA → close-UVA', () => {
    const ixs = buildPumpRewardInstructions(USER, { ...base, program: 'amm', uva: AMM_UVA, cashbackLamports: 70_815n });
    expect(ixs).toHaveLength(4);
    // claim_cashback is the AMM instruction with 9 accounts
    const claim = ixs[1]!;
    expect(claim.programId.equals(PUMP_AMM_PROGRAM_ID)).toBe(true);
    expect(claim.keys).toHaveLength(9);
    expect(hex(claim.data)).toBe('253a237ebe35e4c5');
  });
});
