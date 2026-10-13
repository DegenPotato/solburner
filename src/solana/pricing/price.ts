/**
 * Price orchestrator: DAS price hint first, GMGN fallback for the long tail.
 *
 * Produces a mint → { price, source } map with an in-memory TTL cache so repeated
 * scans don't re-hit the network. Pure resolution logic; applying values to
 * assets is a separate, testable step.
 */

import type { PriceConfig } from '@/config/types';
import type { AssetValue, DiscoveredAccount } from '@/core/types';
import { createLogger } from '@/utils/logger';
import type { DasClient } from '../das/client';
import { fetchGmgnPrices } from './gmgn';
import { fetchJupiterPrices } from './jupiter';

const log = createLogger('pricing');

export interface PriceQuote {
  price: number;
  source: 'das' | 'jupiter' | 'gmgn';
}

const CACHE_TTL_MS = 60_000;
const priceCache = new Map<string, { quote: PriceQuote; at: number }>();

function readCache(mint: string): PriceQuote | null {
  const hit = priceCache.get(mint);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.quote;
  return null;
}

function writeCache(mint: string, quote: PriceQuote): void {
  priceCache.set(mint, { quote, at: Date.now() });
}

/** Mints worth pricing: fungible-style holdings (tokens, lp, unknown). */
function priceableMints(assets: readonly DiscoveredAccount[]): string[] {
  const set = new Set<string>();
  for (const a of assets) {
    if ((a.kind === 'token' || a.kind === 'lp' || a.kind === 'unknown') && a.mint) set.add(a.mint);
  }
  return [...set];
}

/** Resolve prices for all priceable mints across `assets`. */
export async function fetchPrices(
  das: DasClient,
  config: PriceConfig,
  assets: readonly DiscoveredAccount[],
): Promise<Map<string, PriceQuote>> {
  const result = new Map<string, PriceQuote>();
  if (!config.enabled) return result;

  const mints = priceableMints(assets);
  if (mints.length === 0) return result;

  // Cache pass.
  const uncached: string[] = [];
  for (const mint of mints) {
    const cached = readCache(mint);
    if (cached) result.set(mint, cached);
    else uncached.push(mint);
  }

  // Pass 1 — DAS price hints (CORS-friendly on Helius/Triton).
  let stillMissing = uncached;
  if (das.isAvailable && uncached.length > 0) {
    try {
      const assetsBatch = await das.getAssetBatch(uncached);
      const found = new Set<string>();
      for (const asset of assetsBatch) {
        const price = asset.token_info?.price_info?.price_per_token;
        if (typeof price === 'number' && Number.isFinite(price)) {
          const quote: PriceQuote = { price, source: 'das' };
          result.set(asset.id, quote);
          writeCache(asset.id, quote);
          found.add(asset.id);
        }
      }
      stillMissing = uncached.filter((m) => !found.has(m));
    } catch (error) {
      log.warn('DAS price batch failed', { error: String(error) });
    }
  }

  // Pass 2 — Jupiter (browser-reachable, covers pump.fun / long-tail tokens).
  if (stillMissing.length > 0) {
    const jup = await fetchJupiterPrices(stillMissing, config.jupiterUrl);
    for (const [mint, price] of jup) {
      const quote: PriceQuote = { price, source: 'jupiter' };
      result.set(mint, quote);
      writeCache(mint, quote);
    }
    stillMissing = stillMissing.filter((m) => !jup.has(m));
  }

  // Pass 3 — GMGN, only if explicitly enabled (needs a same-origin proxy; the
  // public endpoint is Cloudflare-gated and unreachable directly from a browser).
  if (stillMissing.length > 0 && config.gmgnEnabled) {
    const gmgn = await fetchGmgnPrices(stillMissing, config);
    for (const [mint, price] of gmgn) {
      const quote: PriceQuote = { price, source: 'gmgn' };
      result.set(mint, quote);
      writeCache(mint, quote);
    }
  }

  log.info('prices resolved', { requested: mints.length, found: result.size });
  return result;
}

/** Apply resolved prices onto assets, computing USD value. Returns a new array. */
export function applyPrices(
  assets: readonly DiscoveredAccount[],
  prices: Map<string, PriceQuote>,
): DiscoveredAccount[] {
  return assets.map((asset) => {
    const quote = asset.mint ? prices.get(asset.mint) : undefined;
    const value: AssetValue = quote
      ? { pricePerToken: quote.price, usdValue: quote.price * asset.uiAmount, source: quote.source }
      : { pricePerToken: null, usdValue: null, source: 'none' };
    return { ...asset, value };
  });
}
