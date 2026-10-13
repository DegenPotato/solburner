/**
 * Pump.fun rewards: detection + instruction building.
 *
 * Detection derives the user's volume-accumulator PDAs on both pump programs and
 * decodes claimable cashback from the account. The builder emits the exact
 * instruction sequence verified against a real claim transaction:
 *   - pump main: close the accumulator (reclaim rent).
 *   - AMM, cashback > 0: create WSOL ATA → claim_cashback → close WSOL ATA
 *                        (unwrap to SOL) → close the accumulator.
 *   - AMM, cashback == 0: just close the accumulator.
 */

import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import type { DiscoveredAccount, PumpRewardInfo } from '@/core/types';
import { createLogger } from '@/utils/logger';
import type { RpcClient } from '../rpc/connection';
import {
  IX_DISCRIMINATOR,
  PUMP_AMM_PROGRAM_ID,
  PUMP_PROGRAM_ID,
  UVA_LAYOUT,
  WSOL_MINT,
  eventAuthority,
  userVolumeAccumulator,
} from './constants';

const log = createLogger('pump-rewards');

export type PumpProgramKind = 'pump' | 'amm';

function readU64LE(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getBigUint64(offset, true);
}

function decodeCashback(data: Uint8Array): bigint {
  if (data.byteLength < UVA_LAYOUT.totalCashbackClaimed + 8) return 0n;
  const earned = readU64LE(data, UVA_LAYOUT.cashbackEarned);
  const claimed = readU64LE(data, UVA_LAYOUT.totalCashbackClaimed);
  return earned > claimed ? earned - claimed : 0n;
}

const PROGRAMS: { kind: PumpProgramKind; programId: PublicKey }[] = [
  { kind: 'pump', programId: PUMP_PROGRAM_ID },
  { kind: 'amm', programId: PUMP_AMM_PROGRAM_ID },
];

/** Discover claimable pump rewards for a wallet. Returns `reward` assets. */
export async function scanPumpRewards(rpc: RpcClient, ownerAddress: string): Promise<DiscoveredAccount[]> {
  let owner: PublicKey;
  try {
    owner = new PublicKey(ownerAddress);
  } catch {
    return [];
  }

  const uvas = PROGRAMS.map((p) => ({ ...p, uva: userVolumeAccumulator(p.programId, owner) }));

  let infos;
  try {
    infos = await rpc.perform('getMultipleAccountsInfo:pump-uva', (connection) =>
      connection.getMultipleAccountsInfo(uvas.map((u) => u.uva)),
    );
  } catch (error) {
    log.warn('pump reward scan failed', { error: String(error) });
    return [];
  }

  const rewards: DiscoveredAccount[] = [];
  infos.forEach((info, i) => {
    if (!info) return;
    const entry = uvas[i];
    if (!entry) return;

    const rent = BigInt(info.lamports);
    // Both accumulators can accrue claimable cashback (AMM in WSOL, main in SOL).
    const cashback = decodeCashback(info.data);
    const reclaimable = rent + cashback;
    if (reclaimable <= 0n) return;

    const reward: PumpRewardInfo = {
      program: entry.kind,
      uva: entry.uva.toBase58(),
      rentLamports: rent,
      cashbackLamports: cashback,
    };

    rewards.push({
      id: entry.uva.toBase58(),
      address: entry.uva.toBase58(),
      mint: '',
      program: 'token',
      kind: 'reward',
      action: 'claim-pump-rewards',
      rawAmount: 0n,
      decimals: 0,
      uiAmount: 0,
      rentLamports: reclaimable,
      isFrozen: false,
      metadata: {
        name: entry.kind === 'amm' ? 'Pump Rewards (PumpSwap)' : 'Pump Rewards (Pump.fun)',
        symbol: 'PUMP',
      },
      value: { pricePerToken: null, usdValue: null, source: 'none' },
      pump: reward,
    });
  });

  log.info('pump rewards found', { count: rewards.length });
  return rewards;
}

/** Anchor instruction data is just the 8-byte discriminator (no args here). */
function ixData(discriminator: Uint8Array): Buffer {
  return Buffer.from(discriminator);
}

function closeUvaInstruction(programId: PublicKey, user: PublicKey, uva: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: uva, isSigner: false, isWritable: true },
      { pubkey: eventAuthority(programId), isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    data: ixData(IX_DISCRIMINATOR.closeUserVolumeAccumulator),
  });
}

function claimCashbackInstruction(user: PublicKey, uva: PublicKey, userWsolAta: PublicKey): TransactionInstruction {
  const uvaWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, uva, true);
  return new TransactionInstruction({
    programId: PUMP_AMM_PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: uva, isSigner: false, isWritable: true },
      { pubkey: WSOL_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: uvaWsolAta, isSigner: false, isWritable: true },
      { pubkey: userWsolAta, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: eventAuthority(PUMP_AMM_PROGRAM_ID), isSigner: false, isWritable: false },
      { pubkey: PUMP_AMM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: ixData(IX_DISCRIMINATOR.claimCashback),
  });
}

/**
 * Pump.fun main-program `claim_cashback` (SOL). Account layout is taken directly
 * from the on-chain Anchor IDL: [user, user_volume_accumulator, system_program,
 * event_authority, program] — no WSOL (cashback is credited in native SOL).
 */
function claimCashbackMainInstruction(user: PublicKey, uva: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: uva, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: eventAuthority(PUMP_PROGRAM_ID), isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: ixData(IX_DISCRIMINATOR.claimCashback),
  });
}

/** Build the instruction sequence to claim + close a single pump reward. */
export function buildPumpRewardInstructions(owner: PublicKey, reward: PumpRewardInfo): TransactionInstruction[] {
  const uva = new PublicKey(reward.uva);

  if (reward.program === 'pump') {
    // Claim accrued SOL cashback first (clears needs_claim), then close for rent.
    return reward.cashbackLamports > 0n
      ? [claimCashbackMainInstruction(owner, uva), closeUvaInstruction(PUMP_PROGRAM_ID, owner, uva)]
      : [closeUvaInstruction(PUMP_PROGRAM_ID, owner, uva)];
  }

  // AMM
  if (reward.cashbackLamports > 0n) {
    const userWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, owner, false);
    return [
      createAssociatedTokenAccountIdempotentInstruction(owner, userWsolAta, owner, WSOL_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      claimCashbackInstruction(owner, uva, userWsolAta),
      // Close the temp WSOL ATA: unwraps claimed WSOL + its rent back to the owner.
      createCloseAccountInstruction(userWsolAta, owner, owner),
      closeUvaInstruction(PUMP_AMM_PROGRAM_ID, owner, uva),
    ];
  }
  return [closeUvaInstruction(PUMP_AMM_PROGRAM_ID, owner, uva)];
}
