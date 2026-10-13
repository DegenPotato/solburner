/**
 * On-chain Metaplex Token Metadata decoding.
 *
 * We deliberately hand-decode the account rather than pull the full Metaplex SDK:
 * we only need `name`, `symbol`, and `uri`, which live at a fixed offset, so a
 * tiny borsh reader keeps the dependency surface (and bundle) minimal — in line
 * with the "derive on-chain, no heavy third parties" goal.
 */

import { PublicKey } from '@solana/web3.js';
import type { TokenMetadata } from '@/core/types';

/** Metaplex Token Metadata program. */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const METADATA_SEED = new TextEncoder().encode('metadata');
const NUL = String.fromCharCode(0);

/** Derive the metadata PDA for a mint. */
export function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [METADATA_SEED, TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes()],
    TOKEN_METADATA_PROGRAM_ID,
  );
  return pda;
}

/** Strip borsh null-padding and trim a decoded string. */
function cleanString(value: string): string {
  const nul = value.indexOf(NUL);
  return (nul === -1 ? value : value.slice(0, nul)).trim();
}

/**
 * Decode `name`/`symbol`/`uri` from a raw Metadata account buffer.
 * Layout: key(1) + updateAuthority(32) + mint(32) then three borsh strings.
 * Returns `null` if the buffer is too short or malformed.
 */
export function decodeMetadataAccount(data: Uint8Array): TokenMetadata | null {
  try {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let offset = 1 + 32 + 32; // skip key + update authority + mint

    const readString = (): string => {
      const len = view.getUint32(offset, true);
      offset += 4;
      if (len > data.byteLength - offset) throw new Error('string length out of bounds');
      const bytes = data.subarray(offset, offset + len);
      offset += len;
      return cleanString(decoder.decode(bytes));
    };

    const name = readString();
    const symbol = readString();
    const uri = readString();

    if (!name && !symbol && !uri) return null;
    return { name: name || undefined, symbol: symbol || undefined, uri: uri || undefined };
  } catch {
    return null;
  }
}
