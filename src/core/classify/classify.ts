/**
 * Asset classification refinement.
 *
 * The scanner produces coarse kinds from on-chain balance/decimals
 * (`empty` / `nft` / `token`). After metadata is resolved, this pure pass refines
 * the fungible `token` bucket into `lp` (liquidity positions) and `unknown`
 * (no on-chain metadata — typically spam/airdrops), mirroring the incinerator
 * tab layout. cNFTs and domains come pre-classified from their discoverers.
 */

import { actionForKind } from '../rent/rent';
import type { AssetKind, DiscoveredAccount, TokenMetadata } from '../types';

const LP_PATTERN = /(\bLP\b|\bLP-|-LP\b|liquidity|\bAMM\b|raydium|orca|meteora|\bpool\b|\/)/i;

/** Heuristic: does this metadata look like a liquidity-pool token? */
export function looksLikeLp(meta: TokenMetadata | undefined): boolean {
  if (!meta) return false;
  return LP_PATTERN.test(meta.symbol ?? '') || LP_PATTERN.test(meta.name ?? '');
}

/** Does the asset have any human-readable metadata? */
export function hasMetadata(meta: TokenMetadata | undefined): boolean {
  return Boolean(meta && (meta.name || meta.symbol));
}

/** Refine a single asset's kind once metadata is known. */
export function refineKind(asset: DiscoveredAccount): DiscoveredAccount {
  if (asset.kind !== 'token') return asset;

  let kind: AssetKind = asset.kind;
  if (!hasMetadata(asset.metadata)) kind = 'unknown';
  else if (looksLikeLp(asset.metadata)) kind = 'lp';

  if (kind === asset.kind) return asset;
  return { ...asset, kind, action: actionForKind(kind) };
}

/** Refine every asset's classification. Returns a new array. */
export function classifyAssets(assets: readonly DiscoveredAccount[]): DiscoveredAccount[] {
  return assets.map(refineKind);
}
