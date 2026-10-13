import type { AssetKind } from '@/core';
import type { IconName } from '../ui/Icon';

interface KindMeta {
  label: string;
  tone: 'neutral' | 'accent' | 'warning' | 'info' | 'danger';
  description: string;
}

/** Presentation metadata per asset kind. Pure lookup, no logic. */
export const KIND_META: Record<AssetKind, KindMeta> = {
  empty: { label: 'Empty', tone: 'accent', description: 'Zero balance — closes directly to reclaim rent.' },
  token: { label: 'Token', tone: 'info', description: 'Fungible balance — burned, then the account is closed.' },
  nft: { label: 'NFT', tone: 'accent', description: 'Burned, then the account is closed to reclaim rent.' },
  cnft: { label: 'cNFT', tone: 'neutral', description: 'Compressed NFT — view-only here (burn coming next).' },
  domain: { label: 'Domain', tone: 'info', description: '.sol domain — managed separately, not burned here.' },
  lp: { label: 'LP', tone: 'warning', description: 'Looks like a liquidity position — review carefully before burning.' },
  reward: { label: 'Pump Rewards', tone: 'accent', description: 'Reclaim rent from pump.fun volume accumulators and claim accrued cashback.' },
  unknown: { label: 'Unknown', tone: 'neutral', description: 'No on-chain metadata — usually spam or airdrops.' },
};

export interface TabDef {
  /** Primary kind (also the tab's stable id). */
  kind: AssetKind;
  /** Additional kinds shown in the same tab (e.g. rewards live under Cleanup). */
  extraKinds?: AssetKind[];
  /** Display name (matches the incinerator layout). */
  label: string;
  icon: IconName;
  /** Whether this tab supports the value-protection slider. */
  priceable: boolean;
  /** Feature-flag key, if gated. */
  flag?: 'nfts' | 'compressedNfts' | 'domains' | 'lp' | 'pumpRewards';
}

/** Tab order mirrors the familiar incinerator layout. */
export const TABS: TabDef[] = [
  { kind: 'empty', extraKinds: ['reward'], label: 'Cleanup', icon: 'sparkle', priceable: false },
  { kind: 'token', label: 'Tokens', icon: 'bolt', priceable: true },
  { kind: 'nft', label: 'NFTs', icon: 'sparkle', priceable: false, flag: 'nfts' },
  { kind: 'cnft', label: 'cNFTs', icon: 'sparkle', priceable: false, flag: 'compressedNfts' },
  { kind: 'domain', label: 'Domains', icon: 'web', priceable: false, flag: 'domains' },
  { kind: 'lp', label: 'LP', icon: 'bolt', priceable: true, flag: 'lp' },
  { kind: 'unknown', label: 'Unknown', icon: 'info', priceable: true },
];

/** All kinds a tab is responsible for. */
export function tabKinds(tab: TabDef): AssetKind[] {
  return [tab.kind, ...(tab.extraKinds ?? [])];
}
