/**
 * Configuration contracts.
 *
 * The entire app is driven by a single immutable `AppConfig` assembled in
 * `config/index.ts`. White-label deployments override values via environment
 * variables or a brand preset — never by editing application code.
 */

export type BrandId = 'professional' | 'degen' | 'minimal';

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

export interface SocialLink {
  label: string;
  href: string;
  /** Icon key resolved by the UI icon registry. */
  icon: 'twitter' | 'discord' | 'github' | 'docs' | 'web';
}

export interface BrandConfig {
  id: BrandId;
  /** Product name shown in the header and document title. */
  name: string;
  /** Short tagline for the landing hero. */
  tagline: string;
  /** Longer supporting sentence. */
  description: string;
  /** Theme id applied at boot (usually matches `id`). */
  defaultTheme: BrandId;
  footerNote: string;
  socials: SocialLink[];
  /** Optional override for the document `<title>`. */
  documentTitle?: string;
}

export interface FeeConfig {
  /** Service fee as a fraction of recovered SOL (0.0087 = 0.87%). */
  rate: number;
  /** Absolute fee floor in lamports. `0n` disables. */
  minLamports: bigint;
  /** Absolute fee ceiling in lamports. `0n` disables. */
  maxLamports: bigint;
  /** Wallet that receives the net service fee. `null` => fee collection disabled. */
  recipient: string | null;
  /** Benchmark rate for the "you save" comparison. `null` disables comparison. */
  benchmarkRate: number | null;
  referral: ReferralConfig;
}

export interface ReferralConfig {
  /** Share of the *service fee* routed to the referrer (0.30 = 30%). */
  share: number;
  recipient: string | null;
}

export interface RpcConfig {
  network: SolanaNetwork;
  primary: string;
  fallbacks: string[];
  /** Commitment level for reads/confirmations. */
  commitment: 'processed' | 'confirmed' | 'finalized';
  /** Max accounts inspected per `getMultipleAccounts` batch. */
  batchSize: number;
  /** Concurrent in-flight RPC requests during a scan. */
  concurrency: number;
  /**
   * DAS-capable endpoint (Helius/Triton) used ONLY for things raw RPC cannot do:
   * enumerating/burning compressed NFTs and as a price hint. `null` disables
   * cNFT support. Auto-detected from a Helius primary/fallback when not set.
   */
  dasEndpoint: string | null;
}

export interface PriceConfig {
  /** Master switch for price lookups + the value-protection filter. */
  enabled: boolean;
  /** Jupiter price API URL — the primary browser-reachable fallback. */
  jupiterUrl: string;
  /** GMGN API base URL (only usable behind a same-origin proxy; Cloudflare-gated). */
  gmgnBaseUrl: string;
  /** Whether to attempt GMGN (off by default — direct browser calls are blocked). */
  gmgnEnabled: boolean;
  /** Network slug GMGN expects (e.g. `sol`). */
  gmgnChain: string;
  /** Default ceiling (USD) for the value-protection slider. */
  defaultMaxUsd: number;
  /** Discrete slider stops (USD). The last stop means "no limit". */
  sliderStops: number[];
}

export interface FeatureFlags {
  /** Allow burning non-zero token balances before closing the account. */
  burnTokens: boolean;
  /** Allow closing zero-balance token accounts. */
  closeEmpty: boolean;
  /** Simulate transactions before requesting a signature. */
  simulate: boolean;
  /** Show the "you save vs benchmark" comparison. */
  savingsComparison: boolean;
  /** Asset-type tabs. */
  nfts: boolean;
  compressedNfts: boolean;
  domains: boolean;
  lp: boolean;
  /** Detect + claim pump.fun volume-accumulator rewards in the Cleanup tab. */
  pumpRewards: boolean;
  /** Show the price-based value-protection filter. */
  valueProtection: boolean;
}

export interface AppConfig {
  brand: BrandConfig;
  fees: FeeConfig;
  rpc: RpcConfig;
  pricing: PriceConfig;
  features: FeatureFlags;
}
