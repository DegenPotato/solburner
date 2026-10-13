/**
 * Minimal DAS (Digital Asset Standard) read-API client.
 *
 * Used ONLY for the things raw RPC physically cannot do under the hybrid model:
 *   - enumerating compressed NFTs (`getAssetsByOwner`)
 *   - fetching Merkle proofs to burn them (`getAssetProof`)
 *   - opportunistic price hints for fungibles (`getAssetBatch`)
 *
 * Talks plain JSON-RPC to a DAS-capable endpoint (Helius / Triton). If no such
 * endpoint is configured, `isAvailable` is false and callers degrade gracefully.
 */

import { retry, withTimeout } from '@/utils/async';
import { createLogger } from '@/utils/logger';

const log = createLogger('das');

export interface DasAssetCompression {
  compressed: boolean;
  tree?: string;
  leaf_id?: number;
  data_hash?: string;
  creator_hash?: string;
  asset_hash?: string;
}

export interface DasAsset {
  id: string;
  interface?: string;
  compression?: DasAssetCompression;
  ownership?: { owner?: string };
  grouping?: { group_key: string; group_value: string }[];
  content?: {
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string };
    files?: { uri?: string; cdn_uri?: string; mime?: string }[];
    json_uri?: string;
  };
  token_info?: {
    symbol?: string;
    decimals?: number;
    price_info?: { price_per_token?: number; currency?: string };
  };
}

export interface DasAssetProof {
  root: string;
  proof: string[];
  node_index: number;
  leaf: string;
  tree_id: string;
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

export class DasClient {
  readonly endpoint: string | null;

  constructor(endpoint: string | null) {
    this.endpoint = endpoint;
  }

  get isAvailable(): boolean {
    return Boolean(this.endpoint);
  }

  private async call<T>(method: string, params: unknown): Promise<T> {
    if (!this.endpoint) throw new Error('DAS endpoint not configured');
    return retry(
      async () => {
        const res = await withTimeout(
          fetch(this.endpoint as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 'das', method, params }),
          }),
          15_000,
          method,
        );
        if (!res.ok) throw new Error(`DAS ${method} HTTP ${res.status}`);
        const json = (await res.json()) as JsonRpcResponse<T>;
        if (json.error) throw new Error(`DAS ${method}: ${json.error.message}`);
        return json.result as T;
      },
      { label: `das:${method}`, retries: 2, baseDelayMs: 400 },
    );
  }

  /** Page through every asset owned by `owner`. Returns all items. */
  async getAssetsByOwner(
    owner: string,
    opts: { showFungible?: boolean; showZeroBalance?: boolean; limit?: number; maxPages?: number } = {},
  ): Promise<DasAsset[]> {
    const limit = opts.limit ?? 1000;
    const maxPages = opts.maxPages ?? 10;
    const items: DasAsset[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const result = await this.call<{ items: DasAsset[]; total: number }>('getAssetsByOwner', {
        ownerAddress: owner,
        page,
        limit,
        displayOptions: {
          showFungible: opts.showFungible ?? false,
          showZeroBalance: opts.showZeroBalance ?? false,
        },
      });
      const batch = result?.items ?? [];
      items.push(...batch);
      if (batch.length < limit) break;
    }
    log.info('getAssetsByOwner', { owner, count: items.length });
    return items;
  }

  /** Batch-fetch assets by id (≤1000). Used for fungible price hints. */
  async getAssetBatch(ids: string[]): Promise<DasAsset[]> {
    if (ids.length === 0) return [];
    return this.call<DasAsset[]>('getAssetBatch', { ids });
  }

  /** Merkle proof required to burn/transfer a compressed NFT. */
  async getAssetProof(id: string): Promise<DasAssetProof> {
    return this.call<DasAssetProof>('getAssetProof', { id });
  }
}

let singleton: DasClient | null = null;
let singletonKey = '';

export function getDasClient(endpoint: string | null): DasClient {
  const key = endpoint ?? '';
  if (!singleton || singletonKey !== key) {
    singleton = new DasClient(endpoint);
    singletonKey = key;
  }
  return singleton;
}
