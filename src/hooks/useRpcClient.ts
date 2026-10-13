import { useMemo } from 'react';
import { appConfig } from '@/config';
import { getRpcClient } from '@/solana';
import type { RpcClient } from '@/solana';

/** Provides the shared, config-driven `RpcClient` singleton. */
export function useRpcClient(): RpcClient {
  return useMemo(() => getRpcClient(appConfig.rpc), []);
}
