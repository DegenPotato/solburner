/**
 * Normalizes the heterogeneous errors thrown by wallets, RPC, and the runtime
 * into a small, typed set the UI can render consistently.
 */

export type AppErrorCode =
  | 'user-rejected'
  | 'wallet-not-connected'
  | 'wallet-sign-failed'
  | 'insufficient-funds'
  | 'blockhash-expired'
  | 'simulation-failed'
  | 'rpc-unavailable'
  | 'account-frozen'
  | 'unknown';

export interface NormalizedError {
  code: AppErrorCode;
  /** Short, user-facing message safe to display. */
  message: string;
  /** Original error for logging/debugging. */
  cause?: unknown;
  /** Whether retrying the same action could plausibly succeed. */
  retryable: boolean;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

export function normalizeError(error: unknown): NormalizedError {
  const raw = messageOf(error).toLowerCase();

  // Wallet user-rejection (Phantom/Solflare/Backpack variants).
  if (
    raw.includes('user rejected') ||
    raw.includes('rejected the request') ||
    raw.includes('user denied') ||
    (error as { code?: number })?.code === 4001
  ) {
    return { code: 'user-rejected', message: 'You declined the request in your wallet.', cause: error, retryable: true };
  }

  // The wallet returned/submitted a transaction whose required signature is
  // missing or invalid (extension conflicts, hardware/seedless accounts).
  if (raw.includes('missing signature') || raw.includes('signature verification fail') || raw.includes('without signing')) {
    return {
      code: 'wallet-sign-failed',
      message:
        'Your wallet did not sign the transaction. Disable other wallet/crypto browser extensions and retry; if you use a Ledger, enable blind signing.',
      cause: error,
      retryable: true,
    };
  }

  if (raw.includes('wallet not connected') || raw.includes('no wallet')) {
    return { code: 'wallet-not-connected', message: 'Connect a wallet to continue.', cause: error, retryable: false };
  }

  if (raw.includes('insufficient') && raw.includes('lamports')) {
    return {
      code: 'insufficient-funds',
      message: 'Not enough SOL to cover the network fee. Add a little SOL and retry.',
      cause: error,
      retryable: false,
    };
  }

  if (raw.includes('blockhash not found') || raw.includes('block height exceeded') || raw.includes('expired')) {
    return {
      code: 'blockhash-expired',
      message: 'The transaction expired before confirming. Please retry.',
      cause: error,
      retryable: true,
    };
  }

  if (raw.includes('frozen')) {
    return {
      code: 'account-frozen',
      message: 'One or more accounts are frozen and cannot be closed.',
      cause: error,
      retryable: false,
    };
  }

  if (raw.includes('simulation failed') || raw.includes('transaction simulation')) {
    return {
      code: 'simulation-failed',
      message: 'The transaction failed pre-flight simulation and was not sent.',
      cause: error,
      retryable: false,
    };
  }

  if (raw.includes('failed to fetch') || raw.includes('429') || raw.includes('timed out') || raw.includes('econn')) {
    return {
      code: 'rpc-unavailable',
      message: 'The network is busy or unreachable. Please retry in a moment.',
      cause: error,
      retryable: true,
    };
  }

  return { code: 'unknown', message: messageOf(error), cause: error, retryable: true };
}
