import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type { Adapter } from '@solana/wallet-adapter-base';
import { appConfig } from '@/config';
import { createLogger } from '@/utils/logger';

import '@solana/wallet-adapter-react-ui/styles.css';

const log = createLogger('wallet');

/**
 * Wallet stack. Modern wallets (Phantom, Solflare, Backpack, …) register via the
 * Wallet Standard and are detected automatically, so we ship no per-wallet
 * adapters by default — keeping the bundle lean. The connection endpoint is the
 * config-driven primary RPC.
 */
export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = appConfig.rpc.primary;
  const wallets = useMemo<Adapter[]>(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: appConfig.rpc.commitment }}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={(error) => log.warn('wallet error', { message: error.message })}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
