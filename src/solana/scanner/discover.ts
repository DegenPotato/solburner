/**
 * Discovery + enrichment orchestrator. Two phases so the UI can render fast:
 *
 *   Phase 1 `discoverAssets`  — token accounts + cNFTs (DAS) + domains (SNS),
 *                               run in parallel. Returns coarse-classified assets.
 *   Phase 2 `enrichAssets`    — on-chain metadata → refine classification (lp/
 *                               unknown) → resolve prices. Returns enriched assets.
 *
 * Each phase produces a `ScanResult` so the state layer can swap it in atomically.
 */

import { classifyAssets } from '@/core/classify/classify';
import { summarizeScan } from '@/core/rent/rent';
import type { DiscoveredAccount, ScanResult } from '@/core/types';
import type { FeatureFlags, PriceConfig } from '@/config/types';
import type { DasClient } from '../das/client';
import { applyMetadata, fetchMetadataMap } from '../metadata/enrich';
import { applyPrices, fetchPrices } from '../pricing/price';
import type { RpcClient } from '../rpc/connection';
import { scanPumpRewards } from '../pump/rewards';
import { scanCompressedNfts } from './cnfts';
import { scanDomains } from './domains';
import { scanTokenAccounts, sortAssets } from './scan';
import type { ScanOptions } from './scan';

export interface DiscoverOptions extends ScanOptions {
  features: FeatureFlags;
}

/** Phase 1 — discover all assets across sources. */
export async function discoverAssets(
  rpc: RpcClient,
  das: DasClient,
  owner: string,
  options: DiscoverOptions,
): Promise<ScanResult> {
  const { features } = options;

  const [tokenResult, cnfts, domains, rewards] = await Promise.all([
    scanTokenAccounts(rpc, owner, options),
    features.compressedNfts ? scanCompressedNfts(das, owner) : Promise.resolve<DiscoveredAccount[]>([]),
    features.domains ? scanDomains(rpc, owner) : Promise.resolve<DiscoveredAccount[]>([]),
    features.pumpRewards ? scanPumpRewards(rpc, owner) : Promise.resolve<DiscoveredAccount[]>([]),
  ]);

  const all = sortAssets([...tokenResult.accounts, ...cnfts, ...domains, ...rewards]);
  return summarizeScan(owner, all, { partial: tokenResult.partial, enriched: false });
}

/** Phase 2 — enrich with on-chain metadata, refined classification, and prices. */
export async function enrichAssets(
  rpc: RpcClient,
  das: DasClient,
  priceConfig: PriceConfig,
  scan: ScanResult,
): Promise<ScanResult> {
  // 1. On-chain metadata for token-account assets.
  const metadata = await fetchMetadataMap(rpc, scan.accounts);
  const withMeta = applyMetadata(scan.accounts, metadata);

  // 2. Refine classification (token -> lp / unknown) now that metadata is known.
  const classified = classifyAssets(withMeta);

  // 3. Prices (DAS hint -> GMGN fallback).
  const prices = await fetchPrices(das, priceConfig, classified);
  const priced = applyPrices(classified, prices);

  return summarizeScan(scan.owner, sortAssets(priced), {
    partial: scan.partial,
    scannedAt: scan.scannedAt,
    enriched: true,
  });
}
