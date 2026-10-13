import { useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { appConfig } from '@/config';
import { createLogger } from '@/utils/logger';
import { useRpcClient } from './useRpcClient';

const log = createLogger('fee-health');

/** Rent-exempt minimum for a 0-byte system account (lamports). */
const RENT_EXEMPT_MIN = 890_880n;

/**
 * Operator safety net. If a service fee is configured but the recipient wallet is
 * unfunded, the tiny per-cleanup fee transfer cannot create the account
 * (Solana rejects sub-rent-exempt transfers to a new account with
 * `InsufficientFundsForRent`) — which silently breaks *every* user's cleanup.
 *
 * This runs once at boot and logs a loud warning so a misconfigured white-label
 * deployment is caught immediately rather than by a confused user. It does not
 * bother end users with a toast — this is an operator-facing check.
 */
export function useFeeRecipientHealth(): void {
  const rpc = useRpcClient();

  useEffect(() => {
    const recipient = appConfig.fees.recipient;
    if (!recipient || appConfig.fees.rate <= 0) return;

    let cancelled = false;
    (async () => {
      try {
        const balance = await rpc.perform('getBalance:feeRecipient', (c) =>
          c.getBalance(new PublicKey(recipient)),
        );
        if (!cancelled && BigInt(balance) < RENT_EXEMPT_MIN) {
          log.warn(
            `Fee recipient ${recipient} is unfunded (${balance} lamports). ` +
              'Cleanups will fail with InsufficientFundsForRent until it holds at least ' +
              '~0.00089 SOL (rent-exempt minimum). Send a small amount of SOL to it.',
          );
        }
      } catch {
        /* non-fatal: never block the app on a health probe */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rpc]);
}
