import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '@/utils/logger';
import { useRpcClient } from './useRpcClient';

const log = createLogger('rpc-health');

/** Probe cadence while healthy vs. while degraded (ms). */
const POLL_OK_MS = 60_000;
const POLL_DOWN_MS = 20_000;

export type RpcHealth = 'checking' | 'ok' | 'down';

/**
 * Tracks whether the RPC layer can answer at all.
 *
 * Sol Burner reads *everything* — token accounts, PumpSwap reclaims, NFTs,
 * cNFTs — through one RPC endpoint. When that endpoint is unavailable (an
 * exhausted provider quota being the usual cause), every scan legitimately
 * returns nothing, and the UI is indistinguishable from "this wallet has
 * nothing to claim". That failure mode is silent and actively misleading, so
 * we probe explicitly and let the shell surface it.
 *
 * The probe goes through `RpcClient.perform`, so it only reports `down` after
 * retries across *every* configured endpoint have failed — a single flaky
 * provider never trips the banner.
 */
export function useRpcHealth(): RpcHealth {
  const rpc = useRpcClient();
  const [health, setHealth] = useState<RpcHealth>('checking');
  // Held in a ref so the polling effect doesn't resubscribe on every change.
  const healthRef = useRef<RpcHealth>('checking');

  const check = useCallback(async () => {
    try {
      await rpc.perform('getSlot:health', (c) => c.getSlot());
      if (healthRef.current !== 'ok') log.info('RPC reachable');
      healthRef.current = 'ok';
      setHealth('ok');
    } catch (error) {
      log.warn('All RPC endpoints unreachable', {
        error: error instanceof Error ? error.message : String(error),
      });
      healthRef.current = 'down';
      setHealth('down');
    }
  }, [rpc]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled) return;
      await check();
      if (cancelled) return;
      timer = setTimeout(tick, healthRef.current === 'ok' ? POLL_OK_MS : POLL_DOWN_MS);
    };

    void tick();

    // Re-probe immediately when the user comes back to the tab or regains
    // connectivity, so a recovered outage clears without waiting out the poll.
    const onWake = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [check]);

  return health;
}
