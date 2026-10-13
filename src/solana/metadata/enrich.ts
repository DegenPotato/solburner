/**
 * Metadata enrichment pipeline. Resolves on-chain `name`/`symbol`/`uri` for a
 * batch of assets:
 *   1. Metaplex Token Metadata PDAs, fetched via `getMultipleAccountsInfo`
 *      (≤100/batch, concurrent batches).
 *   2. Token-2022 metadata extension as a fallback for mints not covered above.
 *
 * Pure-on-chain — no indexer. Images are NOT fetched here (that requires an
 * off-chain JSON GET per asset); the UI resolves images lazily from `uri`.
 */

import { PublicKey } from '@solana/web3.js';
import { getTokenMetadata } from '@solana/spl-token';
import type { DiscoveredAccount, TokenMetadata } from '@/core/types';
import { chunk, mapWithConcurrency } from '@/utils/async';
import { createLogger } from '@/utils/logger';
import { tokenProgramId } from '../constants';
import type { RpcClient } from '../rpc/connection';
import { decodeMetadataAccount, findMetadataPda } from './metaplex';

const log = createLogger('metadata');

const MINTS_PER_BATCH = 100;
const BATCH_CONCURRENCY = 4;
const TOKEN2022_CONCURRENCY = 6;

/** Kinds that carry token metadata worth resolving on-chain here. */
function needsMetadata(asset: DiscoveredAccount): boolean {
  return asset.kind === 'token' || asset.kind === 'nft' || asset.kind === 'lp' || asset.kind === 'unknown';
}

/** Resolve metadata for the unique mints across `assets`. Returns mint → metadata. */
export async function fetchMetadataMap(
  rpc: RpcClient,
  assets: readonly DiscoveredAccount[],
): Promise<Map<string, TokenMetadata>> {
  const result = new Map<string, TokenMetadata>();

  const mintInfos = new Map<string, { program: DiscoveredAccount['program'] }>();
  for (const asset of assets) {
    if (needsMetadata(asset) && asset.mint && !mintInfos.has(asset.mint)) {
      mintInfos.set(asset.mint, { program: asset.program });
    }
  }
  if (mintInfos.size === 0) return result;

  const mints = [...mintInfos.keys()];

  // --- Pass 1: Metaplex metadata PDAs (covers classic + most token-2022) ------
  const pdaBatches = chunk(mints, MINTS_PER_BATCH);
  await mapWithConcurrency(pdaBatches, BATCH_CONCURRENCY, async (batch) => {
    const pdas = batch.map((mint) => {
      try {
        return findMetadataPda(new PublicKey(mint));
      } catch {
        return null;
      }
    });
    const valid = pdas.map((p, i) => ({ pda: p, mint: batch[i] as string })).filter((x) => x.pda);
    if (valid.length === 0) return;

    try {
      const infos = await rpc.perform('getMultipleAccountsInfo:metadata', (connection) =>
        connection.getMultipleAccountsInfo(valid.map((v) => v.pda as PublicKey)),
      );
      infos.forEach((info, i) => {
        if (!info?.data) return;
        const decoded = decodeMetadataAccount(info.data);
        const mint = valid[i]?.mint;
        if (decoded && mint) result.set(mint, decoded);
      });
    } catch (error) {
      log.warn('metadata batch failed', { error: String(error) });
    }
  });

  // --- Pass 2: Token-2022 extension fallback for still-missing mints ----------
  const missing2022 = mints.filter((mint) => !result.has(mint) && mintInfos.get(mint)?.program === 'token-2022');
  if (missing2022.length > 0) {
    await mapWithConcurrency(missing2022, TOKEN2022_CONCURRENCY, async (mint) => {
      try {
        const onchain = await rpc.perform('getTokenMetadata', (connection) =>
          getTokenMetadata(connection, new PublicKey(mint), rpc.commitment, tokenProgramId('token-2022')),
        );
        if (onchain) {
          result.set(mint, {
            name: onchain.name || undefined,
            symbol: onchain.symbol || undefined,
            uri: onchain.uri || undefined,
          });
        }
      } catch {
        /* best-effort */
      }
    });
  }

  log.info('metadata resolved', { requested: mints.length, found: result.size });
  return result;
}

/** Apply a mint→metadata map onto assets, returning a new array. */
export function applyMetadata(
  assets: readonly DiscoveredAccount[],
  metadata: Map<string, TokenMetadata>,
): DiscoveredAccount[] {
  return assets.map((asset) => {
    const meta = asset.mint ? metadata.get(asset.mint) : undefined;
    if (!meta) return asset;
    // Preserve any metadata an asset already had (e.g. DAS cNFTs).
    return { ...asset, metadata: { ...meta, ...asset.metadata } };
  });
}
