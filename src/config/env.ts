/**
 * Typed accessor over `import.meta.env`. Centralizing this keeps the rest of the
 * codebase free of raw `import.meta.env` lookups and makes the full set of
 * recognized variables discoverable in one place.
 */

import type { BrandId, SolanaNetwork } from './types';

interface RawEnv {
  brand: string | undefined;
  rpcPrimary: string | undefined;
  rpcFallbacks: string | undefined;
  dasEndpoint: string | undefined;
  network: string | undefined;
  feeRate: string | undefined;
  feeMinSol: string | undefined;
  feeMaxSol: string | undefined;
  feeRecipient: string | undefined;
  benchmarkFeeRate: string | undefined;
  referralShare: string | undefined;
  referralRecipient: string | undefined;
  featureBurnTokens: string | undefined;
  featureCloseEmpty: string | undefined;
  featureSimulate: string | undefined;
  featureSavingsComparison: string | undefined;
  featureNfts: string | undefined;
  featureCnfts: string | undefined;
  featureDomains: string | undefined;
  featureLp: string | undefined;
  featurePumpRewards: string | undefined;
  featureValueProtection: string | undefined;
  priceEnabled: string | undefined;
  jupiterUrl: string | undefined;
  gmgnBaseUrl: string | undefined;
  gmgnEnabled: string | undefined;
  gmgnChain: string | undefined;
}

const env = import.meta.env as Record<string, string | undefined>;

export const rawEnv: RawEnv = {
  brand: env.VITE_BRAND,
  rpcPrimary: env.VITE_RPC_PRIMARY,
  rpcFallbacks: env.VITE_RPC_FALLBACKS,
  dasEndpoint: env.VITE_DAS_ENDPOINT,
  network: env.VITE_SOLANA_NETWORK,
  feeRate: env.VITE_FEE_RATE,
  feeMinSol: env.VITE_FEE_MIN_SOL,
  feeMaxSol: env.VITE_FEE_MAX_SOL,
  feeRecipient: env.VITE_FEE_RECIPIENT,
  benchmarkFeeRate: env.VITE_BENCHMARK_FEE_RATE,
  referralShare: env.VITE_REFERRAL_SHARE,
  referralRecipient: env.VITE_REFERRAL_RECIPIENT,
  featureBurnTokens: env.VITE_FEATURE_BURN_TOKENS,
  featureCloseEmpty: env.VITE_FEATURE_CLOSE_EMPTY,
  featureSimulate: env.VITE_FEATURE_SIMULATE,
  featureSavingsComparison: env.VITE_FEATURE_SAVINGS_COMPARISON,
  featureNfts: env.VITE_FEATURE_NFTS,
  featureCnfts: env.VITE_FEATURE_CNFTS,
  featureDomains: env.VITE_FEATURE_DOMAINS,
  featureLp: env.VITE_FEATURE_LP,
  featurePumpRewards: env.VITE_FEATURE_PUMP_REWARDS,
  featureValueProtection: env.VITE_FEATURE_VALUE_PROTECTION,
  priceEnabled: env.VITE_PRICE_ENABLED,
  jupiterUrl: env.VITE_JUPITER_PRICE_URL,
  gmgnBaseUrl: env.VITE_GMGN_BASE_URL,
  gmgnEnabled: env.VITE_GMGN_ENABLED,
  gmgnChain: env.VITE_GMGN_CHAIN,
};

const VALID_BRANDS: BrandId[] = ['professional', 'degen', 'minimal'];
const VALID_NETWORKS: SolanaNetwork[] = ['mainnet-beta', 'devnet', 'testnet'];

export function resolveBrandId(fallback: BrandId = 'degen'): BrandId {
  const candidate = rawEnv.brand?.trim().toLowerCase() as BrandId | undefined;
  return candidate && VALID_BRANDS.includes(candidate) ? candidate : fallback;
}

export function resolveNetwork(fallback: SolanaNetwork = 'mainnet-beta'): SolanaNetwork {
  const candidate = rawEnv.network?.trim().toLowerCase() as SolanaNetwork | undefined;
  return candidate && VALID_NETWORKS.includes(candidate) ? candidate : fallback;
}
