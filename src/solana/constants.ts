/**
 * Solana program identifiers and chain constants. Imported from `@solana/spl-token`
 * where available so they stay in sync with the library version.
 */

import type { PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { SolanaNetwork } from '@/config/types';
import type { TokenProgram } from '@/core/types';

export { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID };

/** Map a program PublicKey to our domain `TokenProgram` tag. */
export function tokenProgramTag(programId: PublicKey): TokenProgram {
  return programId.equals(TOKEN_2022_PROGRAM_ID) ? 'token-2022' : 'token';
}

/** Resolve a domain `TokenProgram` tag back to its program id. */
export function tokenProgramId(tag: TokenProgram): PublicKey {
  return tag === 'token-2022' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

/** Both SPL token programs we scan + operate on. */
export const SCANNED_TOKEN_PROGRAMS: { id: PublicKey; tag: TokenProgram }[] = [
  { id: TOKEN_PROGRAM_ID, tag: 'token' },
  { id: TOKEN_2022_PROGRAM_ID, tag: 'token-2022' },
];

/** Build a cluster explorer URL for a transaction signature or address. */
export function explorerTxUrl(signature: string, network: SolanaNetwork): string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://solscan.io/tx/${signature}${cluster}`;
}

export function explorerAddressUrl(address: string, network: SolanaNetwork): string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://solscan.io/account/${address}${cluster}`;
}

/**
 * Default priority fee (micro-lamports per compute unit) added to cleanup
 * transactions to improve landing reliability under load. Modest by design.
 */
export const DEFAULT_PRIORITY_FEE_MICROLAMPORTS = 20_000;

/** Base Solana signature fee per transaction (one signer): 5000 lamports. */
export const BASE_SIGNATURE_FEE_LAMPORTS = 5_000n;
