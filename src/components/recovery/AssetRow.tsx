import { memo } from 'react';
import type { DiscoveredAccount } from '@/core';
import { appConfig } from '@/config';
import { explorerAddressUrl } from '@/solana';
import { formatSolWithUnit, formatUsd, shortenAddress } from '@/utils/format';
import { cn } from '@/utils/cn';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { Icon } from '../ui/Icon';
import { AssetAvatar } from './AssetAvatar';
import { KIND_META } from './assetMeta';

interface AssetRowProps {
  asset: DiscoveredAccount;
  selected: boolean;
  onToggle: (id: string) => void;
}

export const AssetRow = memo(function AssetRow({ asset, selected, onToggle }: AssetRowProps) {
  const meta = KIND_META[asset.kind];
  const disabled = asset.action === 'unsupported';
  const title = asset.metadata?.name || asset.metadata?.symbol || shortenAddress(asset.mint || asset.id, 4, 4);
  const usd = asset.value?.usdValue;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-theme border px-3 py-2.5 transition-colors',
        selected ? 'border-accent/40 bg-accent/5' : 'border-transparent hover:bg-surface-hover',
        disabled && 'opacity-70',
      )}
    >
      <Checkbox
        checked={selected}
        disabled={disabled}
        onChange={() => !disabled && onToggle(asset.id)}
        aria-label={`Select ${title}`}
      />

      <AssetAvatar asset={asset} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-content">{title}</span>
          {asset.metadata?.symbol && asset.metadata.symbol !== title && (
            <span className="shrink-0 font-mono text-xs text-content-subtle">{asset.metadata.symbol}</span>
          )}
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {asset.program === 'token-2022' && <Badge tone="neutral">T-2022</Badge>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-content-subtle">
          <a
            href={explorerAddressUrl(asset.mint || asset.id, appConfig.rpc.network)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono hover:text-accent"
            onClick={(e) => e.stopPropagation()}
          >
            {shortenAddress(asset.mint || asset.id, 4, 4)}
            <Icon name="external" size={11} />
          </a>
          {asset.kind !== 'empty' && asset.uiAmount > 0 && <span className="tabular-nums">· {asset.uiAmount}</span>}
        </div>
      </div>

      <div className="shrink-0 text-right">
        {usd != null && usd > 0 ? (
          <div className="font-mono text-sm font-semibold tabular-nums text-content">{formatUsd(usd)}</div>
        ) : asset.value?.source === 'none' && (asset.kind === 'token' || asset.kind === 'lp' || asset.kind === 'unknown') ? (
          <div className="font-mono text-xs text-content-subtle">no price</div>
        ) : null}
        {asset.rentLamports > 0n && (
          <div className="text-xs text-content-subtle">
            +{formatSolWithUnit(asset.rentLamports, { precise: true })} {asset.kind === 'reward' ? 'reclaim' : 'rent'}
          </div>
        )}
      </div>
    </div>
  );
});
