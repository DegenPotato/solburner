/**
 * SNS (.sol) domain discovery — fully on-chain via the Bonfida name service.
 *
 * `getAllDomains` performs a `getProgramAccounts` filtered by owner; a batched
 * reverse-lookup resolves human names. Domains are displayed for awareness but
 * marked `unsupported` for cleanup: deleting a domain is destructive and belongs
 * in a deliberate, separate flow — not a bulk burn.
 */

import { PublicKey } from '@solana/web3.js';
import type { Connection } from '@solana/web3.js';
import { getAllDomains, reverseLookupBatch } from '@bonfida/spl-name-service';
import type { DiscoveredAccount } from '@/core/types';
import { createLogger } from '@/utils/logger';
import type { RpcClient } from '../rpc/connection';

const log = createLogger('domain-scan');

/** Discover .sol domains owned by `owner`. Best-effort; returns [] on failure. */
export async function scanDomains(rpc: RpcClient, owner: string): Promise<DiscoveredAccount[]> {
  try {
    const ownerKey = new PublicKey(owner);
    const domainKeys = await rpc.perform('getAllDomains', (connection: Connection) =>
      getAllDomains(connection, ownerKey),
    );
    if (domainKeys.length === 0) return [];

    const names = await rpc.perform('reverseLookupBatch', (connection: Connection) =>
      reverseLookupBatch(connection, domainKeys),
    );

    log.info('domains found', { count: domainKeys.length });

    return domainKeys.map((key, i) => {
      const name = names[i];
      return {
        id: key.toBase58(),
        address: key.toBase58(),
        mint: '',
        program: 'token' as const,
        kind: 'domain' as const,
        action: 'unsupported' as const,
        rawAmount: 0n,
        decimals: 0,
        uiAmount: 0,
        rentLamports: 0n,
        isFrozen: false,
        metadata: { name: name ? `${name}.sol` : undefined, symbol: 'SNS' },
        value: { pricePerToken: null, usdValue: null, source: 'none' as const },
      };
    });
  } catch (error) {
    log.warn('domain scan failed', { error: String(error) });
    return [];
  }
}
