/**
 * Compressed-NFT discovery via the DAS read API.
 *
 * cNFTs have no token account and hold no reclaimable rent, but users still want
 * to clear spam from their wallet. They can ONLY be enumerated through a DAS
 * indexer — there is no raw-RPC path — so this discoverer is gated on a
 * configured DAS endpoint and returns nothing (gracefully) when absent.
 */

import type { DiscoveredAccount, TokenMetadata } from '@/core/types';
import { createLogger } from '@/utils/logger';
import type { DasAsset, DasClient } from '../das/client';

const log = createLogger('cnft-scan');

function extractImage(asset: DasAsset): string | undefined {
  const direct = asset.content?.links?.image;
  if (direct) return direct;
  const file = asset.content?.files?.find((f) => f.cdn_uri || f.uri);
  return file?.cdn_uri || file?.uri;
}

function toMetadata(asset: DasAsset): TokenMetadata {
  const collection = asset.grouping?.find((g) => g.group_key === 'collection')?.group_value;
  return {
    name: asset.content?.metadata?.name,
    symbol: asset.content?.metadata?.symbol,
    image: extractImage(asset),
    uri: asset.content?.json_uri,
    collection,
  };
}

/** Discover compressed NFTs owned by `owner`. Empty array if DAS is unavailable. */
export async function scanCompressedNfts(das: DasClient, owner: string): Promise<DiscoveredAccount[]> {
  if (!das.isAvailable) return [];
  try {
    const assets = await das.getAssetsByOwner(owner, { showFungible: false, showZeroBalance: false });
    const compressed = assets.filter((a) => a.compression?.compressed);
    log.info('compressed nfts found', { count: compressed.length });

    return compressed.map((asset) => ({
      id: asset.id,
      address: asset.id,
      mint: asset.id,
      program: 'token',
      kind: 'cnft',
      action: 'unsupported',
      rawAmount: 1n,
      decimals: 0,
      uiAmount: 1,
      rentLamports: 0n,
      isFrozen: false,
      metadata: toMetadata(asset),
      value: { pricePerToken: null, usdValue: null, source: 'none' },
    }));
  } catch (error) {
    log.warn('cNFT scan failed', { error: String(error) });
    return [];
  }
}
