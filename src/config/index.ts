/**
 * Single source of truth for runtime configuration.
 *
 * `appConfig` is assembled once from environment variables + brand presets and
 * frozen. Every module — fee engine, transaction builder, UI — reads the same
 * object, so there is exactly one place where fees, RPC, and branding are
 * defined. White-label deployments change `.env`, not code.
 */

import { solToLamports } from '@/utils/lamports';
import { parseBool, parseNonNegativeNumber, parseRate, tryParsePublicKey } from '@/utils/validation';
import { getBrand } from './brands';
import { rawEnv, resolveBrandId, resolveNetwork } from './env';
import type { AppConfig, FeatureFlags, FeeConfig, PriceConfig, RpcConfig } from './types';

const DEFAULTS = {
  feeRate: 0.0087,
  benchmarkRate: 0.02,
  referralShare: 0,
  batchSize: 100,
  concurrency: 6,
  jupiterUrl: 'https://lite-api.jup.ag/price/v3',
  gmgnBaseUrl: 'https://gmgn.ai/api/v1',
  gmgnChain: 'sol',
  priceMaxUsd: 10,
  sliderStops: [1, 10, 30, 100, Number.POSITIVE_INFINITY],
} as const;

/** Detect whether an endpoint supports the DAS read API (Helius / Triton / proxy). */
function isDasCapable(endpoint: string): boolean {
  return /helius|triton|rpcpool|das|\/rpc/i.test(endpoint);
}

/**
 * Resolve a same-origin relative endpoint (e.g. `/rpc`) against the current
 * origin. This lets production point the client at a server-side proxy that
 * injects the RPC key — so no API key is ever shipped in the client bundle —
 * while staying domain-agnostic for white-label deployments. Absolute URLs pass
 * through unchanged.
 */
function resolveEndpoint(endpoint: string): string {
  if (endpoint.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${endpoint}`;
  }
  return endpoint;
}

/** Public RPC fallbacks per network, used when no custom endpoint is provided. */
const PUBLIC_RPC: Record<RpcConfig['network'], string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

function sanitizeRecipient(value: string | undefined): string | null {
  const key = tryParsePublicKey(value);
  return key ? key.toBase58() : null;
}

function buildFeeConfig(): FeeConfig {
  const rate = parseRate(rawEnv.feeRate, DEFAULTS.feeRate);
  const minSol = parseNonNegativeNumber(rawEnv.feeMinSol, 0);
  const maxSol = parseNonNegativeNumber(rawEnv.feeMaxSol, 0);
  const benchmarkRaw = rawEnv.benchmarkFeeRate;
  const benchmarkRate =
    benchmarkRaw === undefined || benchmarkRaw === ''
      ? DEFAULTS.benchmarkRate
      : parseRate(benchmarkRaw, DEFAULTS.benchmarkRate);

  return {
    rate,
    minLamports: solToLamports(minSol),
    maxLamports: solToLamports(maxSol),
    recipient: sanitizeRecipient(rawEnv.feeRecipient),
    benchmarkRate: benchmarkRate > 0 ? benchmarkRate : null,
    referral: {
      share: parseRate(rawEnv.referralShare, DEFAULTS.referralShare),
      recipient: sanitizeRecipient(rawEnv.referralRecipient),
    },
  };
}

function buildRpcConfig(): RpcConfig {
  const network = resolveNetwork();
  const primary = resolveEndpoint(rawEnv.rpcPrimary?.trim() || PUBLIC_RPC[network]);
  const fallbacks = (rawEnv.rpcFallbacks ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(resolveEndpoint);

  // DAS endpoint: explicit env wins. Otherwise PREFER a Helius endpoint — its DAS
  // returns full metadata + price_info. Generic rpcpool/Triton endpoints often
  // advertise DAS but return nulls, so they're only a last resort.
  const dasExplicit = rawEnv.dasEndpoint?.trim();
  const dasCandidates = [primary, ...fallbacks];
  const dasEndpoint = dasExplicit
    ? resolveEndpoint(dasExplicit)
    : dasCandidates.find((e) => /helius|\/rpc/i.test(e)) || dasCandidates.find(isDasCapable) || null;

  return {
    network,
    primary,
    fallbacks,
    commitment: 'confirmed',
    batchSize: DEFAULTS.batchSize,
    concurrency: DEFAULTS.concurrency,
    dasEndpoint,
  };
}

function buildPriceConfig(): PriceConfig {
  return {
    enabled: parseBool(rawEnv.priceEnabled, true),
    jupiterUrl: rawEnv.jupiterUrl?.trim() || DEFAULTS.jupiterUrl,
    gmgnBaseUrl: rawEnv.gmgnBaseUrl?.trim() || DEFAULTS.gmgnBaseUrl,
    gmgnEnabled: parseBool(rawEnv.gmgnEnabled, false),
    gmgnChain: rawEnv.gmgnChain?.trim() || DEFAULTS.gmgnChain,
    defaultMaxUsd: DEFAULTS.priceMaxUsd,
    sliderStops: [...DEFAULTS.sliderStops],
  };
}

function buildFeatureFlags(): FeatureFlags {
  return {
    burnTokens: parseBool(rawEnv.featureBurnTokens, true),
    closeEmpty: parseBool(rawEnv.featureCloseEmpty, true),
    simulate: parseBool(rawEnv.featureSimulate, true),
    savingsComparison: parseBool(rawEnv.featureSavingsComparison, true),
    nfts: parseBool(rawEnv.featureNfts, true),
    compressedNfts: parseBool(rawEnv.featureCnfts, true),
    domains: parseBool(rawEnv.featureDomains, true),
    lp: parseBool(rawEnv.featureLp, true),
    pumpRewards: parseBool(rawEnv.featurePumpRewards, true),
    valueProtection: parseBool(rawEnv.featureValueProtection, true),
  };
}

function buildConfig(): AppConfig {
  const brandId = resolveBrandId();
  return Object.freeze({
    brand: getBrand(brandId),
    fees: buildFeeConfig(),
    rpc: buildRpcConfig(),
    pricing: buildPriceConfig(),
    features: buildFeatureFlags(),
  });
}

export const appConfig: AppConfig = buildConfig();

export * from './types';
