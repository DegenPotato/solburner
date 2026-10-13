/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BRAND?: string;
  readonly VITE_RPC_PRIMARY?: string;
  readonly VITE_RPC_FALLBACKS?: string;
  readonly VITE_SOLANA_NETWORK?: string;
  readonly VITE_FEE_RATE?: string;
  readonly VITE_FEE_MIN_SOL?: string;
  readonly VITE_FEE_MAX_SOL?: string;
  readonly VITE_FEE_RECIPIENT?: string;
  readonly VITE_BENCHMARK_FEE_RATE?: string;
  readonly VITE_REFERRAL_SHARE?: string;
  readonly VITE_REFERRAL_RECIPIENT?: string;
  readonly VITE_FEATURE_BURN_TOKENS?: string;
  readonly VITE_FEATURE_CLOSE_EMPTY?: string;
  readonly VITE_FEATURE_SIMULATE?: string;
  readonly VITE_FEATURE_SAVINGS_COMPARISON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
