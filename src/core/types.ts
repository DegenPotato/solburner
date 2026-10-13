/**
 * Core domain model — the vocabulary shared by the Solana layer, business
 * engines, hooks, and UI. No React, no rendering concerns. Amounts are `bigint`
 * lamports or raw token base units to stay exact.
 */

export type TokenProgram = 'token' | 'token-2022';

/**
 * The kind of asset discovered in a wallet. Drives which UI tab an asset appears
 * in and what on-chain action reclaims/cleans it.
 *
 * - `empty`   — zero-balance token account; close directly to reclaim rent.
 * - `token`   — fungible balance; burn then close to reclaim rent.
 * - `nft`     — standard (non-compressed) NFT; burn then close.
 * - `cnft`    — compressed NFT (no token account, no rent); burn via Bubblegum.
 * - `domain`  — SNS (.sol) domain name owned by the wallet.
 * - `lp`      — liquidity-pool token position.
 * - `reward`  — pump.fun volume-accumulator rewards (reclaim rent + cashback).
 * - `unknown` — discovered token account that doesn't classify into the above.
 */
export type AssetKind = 'empty' | 'token' | 'nft' | 'cnft' | 'domain' | 'lp' | 'reward' | 'unknown';

export const ASSET_KINDS: AssetKind[] = ['empty', 'token', 'nft', 'cnft', 'domain', 'lp', 'reward', 'unknown'];

/** The on-chain action needed to reclaim/clean an asset.
 *  `unsupported` = discovered + displayed, but not executable in this build
 *  (e.g. domains, which need a deliberate, separate management flow). */
export type RecoveryAction = 'close' | 'burn-and-close' | 'burn-cnft' | 'claim-pump-rewards' | 'unsupported';

/** Pump.fun reward data attached to a `reward` asset (set by the pump scanner). */
export interface PumpRewardInfo {
  program: 'pump' | 'amm';
  /** The volume-accumulator PDA address. */
  uva: string;
  /** Reclaimable account rent in lamports. */
  rentLamports: bigint;
  /** Claimable WSOL cashback in lamports (AMM only). */
  cashbackLamports: bigint;
}

/** Optional token/asset metadata resolved on-chain (best-effort). */
export interface TokenMetadata {
  name?: string;
  symbol?: string;
  image?: string;
  /** Off-chain JSON URI (Metaplex `uri`), used to lazily resolve an image. */
  uri?: string;
  collection?: string;
}

/** Pricing for an asset, used by the value-protection filter. */
export interface AssetValue {
  /** USD price per whole token, or `null` if unpriced. */
  pricePerToken: number | null;
  /** USD value of the held amount (`pricePerToken * uiAmount`), or `null`. */
  usdValue: number | null;
  /** Where the price came from. */
  source: 'das' | 'jupiter' | 'gmgn' | 'none';
}

/**
 * A single asset owned by the connected wallet that the user may want to clean
 * up. The atomic unit the user selects and the transaction builder consumes.
 *
 * For token-account-based assets (`empty`/`token`/`nft`/`lp`), `id === address`
 * (the token account). For `cnft`, `id` is the DAS asset id and there is no token
 * account or reclaimable rent. For `domain`, `id` is the domain's name account.
 */
export interface DiscoveredAccount {
  /** Stable unique id (token account, DAS asset id, or domain account). */
  id: string;
  /** Token account address (token-based assets); equals `id` otherwise. */
  address: string;
  /** The mint, when applicable. Empty string for domains. */
  mint: string;
  /** Token program owning the account (token-based assets). */
  program: TokenProgram;
  kind: AssetKind;
  action: RecoveryAction;
  /** Raw token amount in base units. `0n` for empty accounts / cNFTs / domains. */
  rawAmount: bigint;
  decimals: number;
  /** Human-readable token amount (for display only). */
  uiAmount: number;
  /** Reclaimable rent in lamports. `0n` for cNFTs and domains. */
  rentLamports: bigint;
  /** Frozen accounts cannot be burned/closed by the owner. */
  isFrozen: boolean;
  /**
   * Token-2022 transfer-fee tokens withheld in this account. A non-zero value
   * blocks `closeAccount`, so it must be harvested to the mint first.
   */
  withheldAmount?: bigint;
  metadata?: TokenMetadata;
  value?: AssetValue;
  /** Present only for `reward` assets. */
  pump?: PumpRewardInfo;
}

/** Forward-looking alias — a `DiscoveredAccount` is a wallet asset. */
export type WalletAsset = DiscoveredAccount;

/** Aggregate result of scanning a wallet. */
export interface ScanResult {
  owner: string;
  accounts: DiscoveredAccount[];
  /** Total reclaimable rent across all discovered assets. */
  totalRentLamports: bigint;
  counts: Record<AssetKind, number>;
  scannedAt: number;
  /** True if any RPC page failed and results may be partial. */
  partial: boolean;
  /** True once async metadata/price enrichment has completed. */
  enriched: boolean;
}

/** Fee computation output — the canonical numbers shown AND charged. */
export interface FeeBreakdown {
  grossLamports: bigint;
  feeLamports: bigint;
  effectiveRate: number;
  netLamports: bigint;
  referralLamports: bigint;
  platformLamports: bigint;
  comparison: FeeComparison | null;
}

export interface FeeComparison {
  benchmarkRate: number;
  benchmarkFeeLamports: bigint;
  savingsLamports: bigint;
}

/** A concrete, costed plan derived from the user's selection. */
export interface CleanupPlan {
  accounts: DiscoveredAccount[];
  fee: FeeBreakdown;
  transactionCount: number;
  /** Estimated Solana network + priority fees the user pays to submit the plan. */
  networkFeeLamports: bigint;
  /** True net the wallet gains: gross − service fee − network fee. */
  netAfterNetworkLamports: bigint;
}
