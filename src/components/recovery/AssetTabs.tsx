import type { AssetKind, ScanResult } from '@/core';
import { appConfig } from '@/config';
import { cn } from '@/utils/cn';
import { Icon } from '../ui/Icon';
import { TABS, tabKinds } from './assetMeta';

interface AssetTabsProps {
  scan: ScanResult;
  active: AssetKind;
  onChange: (kind: AssetKind) => void;
}

/** Tab bar across the asset kinds, gated by feature flags, with live counts. */
export function AssetTabs({ scan, active, onChange }: AssetTabsProps) {
  const tabs = TABS.filter((t) => !t.flag || appConfig.features[t.flag]);

  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-theme-lg border border-surface-border bg-surface/60 p-1.5">
      {tabs.map((tab) => {
        const count = tabKinds(tab).reduce((sum, k) => sum + (scan.counts[k] ?? 0), 0);
        const isActive = tab.kind === active;
        return (
          <button
            key={tab.kind}
            type="button"
            onClick={() => onChange(tab.kind)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-theme px-3 py-2 text-sm font-semibold transition-colors',
              isActive ? 'bg-accent text-accent-contrast' : 'text-content-muted hover:bg-surface-hover hover:text-content',
            )}
            aria-current={isActive}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs tabular-nums',
                isActive ? 'bg-black/15' : 'bg-bg-inset text-content-subtle',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
