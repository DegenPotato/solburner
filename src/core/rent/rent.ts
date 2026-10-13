/**
 * Rent domain logic: classify token accounts and aggregate reclaimable rent.
 * Pure functions operating on the raw fields the scanner extracts from chain.
 */

import { sumLamports } from '@/utils/lamports';
import { ASSET_KINDS } from '../types';
import type { AssetKind, DiscoveredAccount, RecoveryAction, ScanResult } from '../types';

/**
 * Base classification from a token account's balance/decimals. Produces only the
 * token-account kinds (`empty` / `nft` / `token`); richer kinds (`lp`, `domain`,
 * `cnft`, `unknown`) are assigned by the classifier and dedicated discoverers.
 */
export function categorizeAccount(rawAmount: bigint, decimals: number): AssetKind {
  if (rawAmount === 0n) return 'empty';
  if (decimals === 0 && rawAmount === 1n) return 'nft';
  return 'token';
}

/** The on-chain action required to reclaim/clean an asset of a given kind.
 *  `cnft`/`domain` are discovered + displayed but not yet executable here
 *  (cNFT Bubblegum burns and domain deletion are a deliberate next increment). */
export function actionForKind(kind: AssetKind): RecoveryAction {
  if (kind === 'empty') return 'close';
  if (kind === 'reward') return 'claim-pump-rewards';
  if (kind === 'cnft') return 'unsupported';
  if (kind === 'domain') return 'unsupported';
  return 'burn-and-close';
}

function emptyCounts(): Record<AssetKind, number> {
  return ASSET_KINDS.reduce(
    (acc, kind) => {
      acc[kind] = 0;
      return acc;
    },
    {} as Record<AssetKind, number>,
  );
}

/** Build a `ScanResult` from discovered assets, computing totals + counts. */
export function summarizeScan(
  owner: string,
  accounts: DiscoveredAccount[],
  options: { partial?: boolean; scannedAt?: number; enriched?: boolean } = {},
): ScanResult {
  const counts = emptyCounts();
  for (const account of accounts) counts[account.kind] += 1;

  return {
    owner,
    accounts,
    totalRentLamports: sumLamports(accounts.map((a) => a.rentLamports)),
    counts,
    scannedAt: options.scannedAt ?? Date.now(),
    partial: options.partial ?? false,
    enriched: options.enriched ?? false,
  };
}

/** Sum reclaimable rent for an arbitrary subset of assets. */
export function sumRent(accounts: Iterable<DiscoveredAccount>): bigint {
  let total = 0n;
  for (const account of accounts) total += account.rentLamports;
  return total;
}
