import { useState } from 'react';
import type { DiscoveredAccount } from '@/core';
import { cn } from '@/utils/cn';
import { useAssetImage } from './useAssetImage';

/** Letter fallback derived from symbol/name when no image resolves. */
function initials(asset: DiscoveredAccount): string {
  const label = asset.metadata?.symbol || asset.metadata?.name || asset.mint || '?';
  return label.slice(0, 2).toUpperCase();
}

export function AssetAvatar({ asset, size = 40 }: { asset: DiscoveredAccount; size?: number }) {
  const { src, loading } = useAssetImage(asset);
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-theme border border-surface-border bg-bg-inset',
        loading && 'animate-pulse',
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-xs font-bold text-content-subtle">
          {initials(asset)}
        </div>
      )}
    </div>
  );
}
