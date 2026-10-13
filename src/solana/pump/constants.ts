/**
 * Pump.fun "rewards" constants — reverse-engineered from on-chain Anchor IDLs and
 * verified against a real claim transaction.
 *
 * When you trade pump.fun tokens, the protocol creates a per-user "volume
 * accumulator" PDA (one on the main program, one on the PumpSwap AMM). Each holds
 * rent, and the AMM one accrues WSOL cashback. Closing them reclaims the rent;
 * claiming sweeps the cashback. This is the "Pump Rewards / Reclaim SOL" item.
 *
 * Every value below was confirmed: PDA seeds, event-authority PDAs, the AMM
 * cashback WSOL ATA, and the Anchor instruction discriminators (sha256
 * "global:<ix>"[:8]).
 */

import { PublicKey } from '@solana/web3.js';

export const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_AMM_PROGRAM_ID = new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA');
export const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

/** Anchor discriminators (sha256("global:<name>")[:8]). */
export const IX_DISCRIMINATOR = {
  closeUserVolumeAccumulator: new Uint8Array([0xf9, 0x45, 0xa4, 0xda, 0x96, 0x67, 0x54, 0x8a]),
  claimCashback: new Uint8Array([0x25, 0x3a, 0x23, 0x7e, 0xbe, 0x35, 0xe4, 0xc5]),
} as const;

const UVA_SEED = new TextEncoder().encode('user_volume_accumulator');
const EVENT_AUTHORITY_SEED = new TextEncoder().encode('__event_authority');

/** Derive a program's `__event_authority` PDA. */
export function eventAuthority(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([EVENT_AUTHORITY_SEED], programId)[0];
}

/** Derive a user's volume-accumulator PDA on a given pump program. */
export function userVolumeAccumulator(programId: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([UVA_SEED, user.toBytes()], programId)[0];
}

/**
 * Byte offsets into the `UserVolumeAccumulator` account data (after the 8-byte
 * Anchor discriminator). Layout is identical on both programs.
 */
export const UVA_LAYOUT = {
  // user(32) needs_claim(1) total_unclaimed(8) total_claimed(8) current_sol_volume(8)
  // last_update(8) has_total_claimed(1) cashback_earned(8) total_cashback_claimed(8)
  cashbackEarned: 8 + 32 + 1 + 8 + 8 + 8 + 8 + 1, // = 74
  totalCashbackClaimed: 8 + 32 + 1 + 8 + 8 + 8 + 8 + 1 + 8, // = 82
} as const;
