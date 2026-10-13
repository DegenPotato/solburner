/**
 * Jupiter price provider — the primary browser-reachable fallback.
 *
 * `lite-api.jup.ag` is CORS-open and built for client use, and its coverage
 * includes pump.fun / long-tail SPL tokens (it returns `usdPrice` + `liquidity`),
 * which DAS often lacks for pre-graduation tokens. Batched by id; fully defensive.
 */

import { chunk, mapWithConcurrency, withTimeout } from '@/utils/async';
import { createLogger } from '@/utils/logger';

const log = createLogger('jupiter');

const IDS_PER_REQUEST = 50;
const CONCURRENCY = 4;

interface JupPriceEntry {
  usdPrice?: number;
  price?: number | string;
}

/** Fetch USD prices for mints from Jupiter. Returns mint → price (found only). */
export async function fetchJupiterPrices(mints: string[], baseUrl: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (mints.length === 0) return out;

  const batches = chunk(mints, IDS_PER_REQUEST);
  await mapWithConcurrency(batches, CONCURRENCY, async (batch) => {
    const url = `${baseUrl.replace(/\/$/, '')}?ids=${batch.join(',')}`;
    try {
      const res = await withTimeout(fetch(url, { headers: { accept: 'application/json' } }), 10_000, 'jupiter');
      if (!res.ok) return;
      const json = (await res.json()) as Record<string, JupPriceEntry | null>;
      for (const [mint, entry] of Object.entries(json)) {
        if (!entry) continue;
        const raw = entry.usdPrice ?? entry.price;
        const price = typeof raw === 'string' ? Number(raw) : raw;
        if (typeof price === 'number' && Number.isFinite(price) && price >= 0) out.set(mint, price);
      }
    } catch {
      /* best-effort */
    }
  });

  if (out.size > 0) log.info('jupiter prices', { requested: mints.length, found: out.size });
  return out;
}
