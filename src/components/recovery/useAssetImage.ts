import { useEffect, useState } from 'react';
import type { DiscoveredAccount } from '@/core';
import { withTimeout } from '@/utils/async';

/**
 * Lazily resolves an asset's image URL. Images live in off-chain JSON referenced
 * by the on-chain `uri`, so fetching them is deferred to when a card actually
 * renders (only the active tab's assets mount). Results are cached process-wide
 * and in-flight requests are de-duped, so paging between tabs is instant.
 */

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/** Normalize ipfs:// / ar:// URIs to public gateways. */
function normalizeUri(uri: string): string {
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length).replace(/^ipfs\//, '')}`;
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice('ar://'.length)}`;
  return uri;
}

async function resolveFromUri(uri: string): Promise<string | null> {
  const url = normalizeUri(uri);
  try {
    const res = await withTimeout(fetch(url, { headers: { accept: 'application/json' } }), 8_000, 'metadata-json');
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.startsWith('image/')) return url; // uri is itself an image
    const json = (await res.json()) as { image?: string; properties?: { files?: { uri?: string }[] } };
    const image = json.image ?? json.properties?.files?.find((f) => f.uri)?.uri;
    return image ? normalizeUri(image) : null;
  } catch {
    return null;
  }
}

function imageKey(asset: DiscoveredAccount): string {
  return asset.metadata?.image ? `img:${asset.metadata.image}` : `uri:${asset.metadata?.uri ?? asset.id}`;
}

export function useAssetImage(asset: DiscoveredAccount): { src: string | null; loading: boolean } {
  const direct = asset.metadata?.image ? normalizeUri(asset.metadata.image) : null;
  const key = imageKey(asset);

  const [src, setSrc] = useState<string | null>(() => direct ?? cache.get(key) ?? null);
  const [loading, setLoading] = useState<boolean>(() => !direct && !cache.has(key) && Boolean(asset.metadata?.uri));

  useEffect(() => {
    if (direct) {
      setSrc(direct);
      setLoading(false);
      return;
    }
    if (cache.has(key)) {
      setSrc(cache.get(key) ?? null);
      setLoading(false);
      return;
    }
    const uri = asset.metadata?.uri;
    if (!uri) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    let promise = inflight.get(key);
    if (!promise) {
      promise = resolveFromUri(uri).then((result) => {
        cache.set(key, result);
        inflight.delete(key);
        return result;
      });
      inflight.set(key, promise);
    }
    promise.then((result) => {
      if (!active) return;
      setSrc(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [key, direct, asset.metadata?.uri]);

  return { src, loading };
}
