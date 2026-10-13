/**
 * GMGN price provider (fallback source).
 *
 * Best-effort and defensive: GMGN's public endpoints may rate-limit or block
 * browser origins (CORS). Any failure resolves to "unpriced" rather than throwing,
 * so the value-protection filter degrades gracefully. In production, point
 * `VITE_GMGN_BASE_URL` at a same-origin proxy to avoid CORS.
 */

import type { PriceConfig } from '@/config/types';
import { mapWithConcurrency, withTimeout } from '@/utils/async';
import { createLogger } from '@/utils/logger';

const log = createLogger('gmgn');

const CONCURRENCY = 5;

function extractPrice(payload: unknown): number | null {
  // GMGN responses vary; probe the common shapes defensively.
  const data = (payload as { data?: unknown })?.data ?? payload;
  const candidates: unknown[] = [
    (data as { price?: unknown })?.price,
    (data as { usd_price?: unknown })?.usd_price,
    (data as { token?: { price?: unknown } })?.token?.price,
    (data as { price_usd?: unknown })?.price_usd,
  ];
  for (const c of candidates) {
    const n = typeof c === 'string' ? Number(c) : (c as number);
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** Fetch USD prices for mints from GMGN. Returns mint → price (only those found). */
export async function fetchGmgnPrices(mints: string[], config: PriceConfig): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (mints.length === 0) return out;

  await mapWithConcurrency(mints, CONCURRENCY, async (mint) => {
    const url = `${config.gmgnBaseUrl.replace(/\/$/, '')}/tokens/${config.gmgnChain}/${mint}`;
    try {
      const res = await withTimeout(fetch(url, { headers: { accept: 'application/json' } }), 8_000, 'gmgn');
      if (!res.ok) return;
      const price = extractPrice(await res.json());
      if (price !== null) out.set(mint, price);
    } catch {
      /* best-effort; ignore */
    }
  });

  if (out.size > 0) log.info('gmgn prices', { requested: mints.length, found: out.size });
  return out;
}
