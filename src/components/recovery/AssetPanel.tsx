import { useMemo, useState } from 'react';
import type { DiscoveredAccount } from '@/core';
import type { Selection } from '@/core/selection/selection';
import { pluralize } from '@/utils/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { AssetRow } from './AssetRow';
import { KIND_META, type TabDef } from './assetMeta';
import { ValueSlider } from './ValueSlider';

interface AssetPanelProps {
  tab: TabDef;
  assets: DiscoveredAccount[];
  selection: Selection;
  priceStops: number[];
  maxUsd: number;
  onMaxUsd: (v: number) => void;
  onToggle: (id: string) => void;
  onSelectMany: (accounts: readonly DiscoveredAccount[]) => void;
  onDeselectMany: (accounts: readonly DiscoveredAccount[]) => void;
}

/** Single tab body: optional value slider, search, bulk actions, and the list. */
export function AssetPanel({
  tab,
  assets,
  selection,
  priceStops,
  maxUsd,
  onMaxUsd,
  onToggle,
  onSelectMany,
  onDeselectMany,
}: AssetPanelProps) {
  const [query, setQuery] = useState('');
  const meta = KIND_META[tab.kind];
  const executable = assets.some((a) => a.action !== 'unsupported');

  // Value protection: hide assets priced above the ceiling (unpriced stay visible).
  const valueFiltered = useMemo(() => {
    if (!tab.priceable || !Number.isFinite(maxUsd)) return assets;
    return assets.filter((a) => a.value?.usdValue == null || (a.value.usdValue ?? 0) <= maxUsd);
  }, [assets, tab.priceable, maxUsd]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return valueFiltered;
    return valueFiltered.filter((a) =>
      [a.metadata?.name, a.metadata?.symbol, a.mint, a.id].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [valueFiltered, query]);

  const selectableVisible = useMemo(() => visible.filter((a) => a.action !== 'unsupported'), [visible]);
  const selectedVisible = selectableVisible.filter((a) => selection.has(a.id)).length;

  return (
    <div className="space-y-3">
      {tab.priceable && <ValueSlider stops={priceStops} value={maxUsd} onChange={onMaxUsd} />}

      <Card flush className="overflow-hidden">
        <div className="space-y-3 border-b border-surface-border p-4">
          <div className="relative">
            <Icon name="sparkle" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full rounded-theme border border-surface-border bg-bg-inset pl-9 pr-3 text-sm text-content placeholder:text-content-subtle focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-content-muted">
              <span className="font-semibold text-content">{selectedVisible}</span> of {visible.length} selected
            </p>
            {executable && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => onSelectMany(selectableVisible)} disabled={selectableVisible.length === 0}>
                  Select all
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDeselectMany(visible)} disabled={selectedVisible === 0}>
                  Deselect all
                </Button>
              </div>
            )}
          </div>
        </div>

        {!executable && (
          <div className="flex items-start gap-2.5 border-b border-surface-border bg-warning/8 px-4 py-3">
            <Icon name="info" size={15} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-content-muted">{meta.description}</p>
          </div>
        )}

        <div className="max-h-[30rem] divide-y divide-surface-border/40 overflow-y-auto p-2">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Icon name="check-circle" size={26} className="text-content-subtle" />
              <p className="text-sm text-content-muted">
                {assets.length === 0 ? 'Nothing here.' : 'Nothing matches your filters.'}
              </p>
            </div>
          ) : (
            visible.map((asset) => (
              <AssetRow key={asset.id} asset={asset} selected={selection.has(asset.id)} onToggle={onToggle} />
            ))
          )}
        </div>
      </Card>

      <p className="px-1 text-xs text-content-subtle">{pluralize(assets.length, meta.label.toLowerCase())} in this tab</p>
    </div>
  );
}
