/**
 * RPC abstraction with endpoint failover + retry.
 *
 * Wraps one or more `Connection`s (primary + fallbacks). Read operations are
 * executed through `perform`, which retries with backoff and rotates to the next
 * endpoint on failure — so a single flaky RPC node never breaks a scan.
 */

import { Connection } from '@solana/web3.js';
import type { Commitment } from '@solana/web3.js';
import type { RpcConfig } from '@/config/types';
import { retry } from '@/utils/async';
import { createLogger } from '@/utils/logger';

const log = createLogger('rpc');

export class RpcClient {
  private readonly connections: Connection[];
  private activeIndex = 0;
  readonly commitment: Commitment;
  readonly config: RpcConfig;

  constructor(config: RpcConfig) {
    this.config = config;
    this.commitment = config.commitment;
    const endpoints = [config.primary, ...config.fallbacks].filter(Boolean);
    this.connections = endpoints.map(
      (endpoint) =>
        new Connection(endpoint, {
          commitment: config.commitment,
          disableRetryOnRateLimit: false,
        }),
    );
    if (this.connections.length === 0) {
      throw new Error('RpcClient requires at least one endpoint');
    }
  }

  /** The currently active connection (used for sending wallet transactions). */
  get active(): Connection {
    return this.connections[this.activeIndex] as Connection;
  }

  get endpointCount(): number {
    return this.connections.length;
  }

  private rotate(): void {
    this.activeIndex = (this.activeIndex + 1) % this.connections.length;
  }

  /**
   * Execute an RPC operation with retry + endpoint failover. The operation
   * receives the connection to use for the current attempt.
   */
  async perform<T>(label: string, fn: (connection: Connection) => Promise<T>): Promise<T> {
    return retry(
      async (attempt) => {
        if (attempt > 0) this.rotate();
        const connection = this.active;
        try {
          return await fn(connection);
        } catch (error) {
          log.warn(`RPC '${label}' failed`, {
            attempt,
            endpoint: connection.rpcEndpoint,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      {
        label,
        retries: Math.max(2, this.connections.length),
        baseDelayMs: 300,
        maxDelayMs: 3_000,
      },
    );
  }
}

let singleton: RpcClient | null = null;
let singletonKey = '';

/** Lazily create/reuse a process-wide `RpcClient` for the given config. */
export function getRpcClient(config: RpcConfig): RpcClient {
  const key = `${config.primary}|${config.fallbacks.join(',')}|${config.commitment}`;
  if (!singleton || singletonKey !== key) {
    singleton = new RpcClient(config);
    singletonKey = key;
  }
  return singleton;
}
