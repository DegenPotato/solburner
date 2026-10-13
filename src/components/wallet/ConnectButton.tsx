import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { shortenAddress } from '@/utils/format';
import { cn } from '@/utils/cn';
import { phantomBrowseUrl, shouldUsePhantomDeeplink } from '@/wallet/mobile';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useNotifications } from '../notifications';

/** Wallet connect / account control. Wraps the adapter modal with our styling. */
export function ConnectButton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { notify } = useNotifications();
  const [open, setOpen] = useState(false);

  const address = publicKey?.toBase58() ?? null;

  const copy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      notify({ kind: 'success', title: 'Address copied', duration: 2000 });
    } catch {
      notify({ kind: 'error', title: 'Copy failed', duration: 2000 });
    }
    setOpen(false);
  }, [address, notify]);

  if (!address) {
    // Mobile browser with no injected wallet: the wallet-selection modal would
    // be empty (no extension on a phone). Reopen inside Phantom's in-app browser
    // instead, where the provider is injected and the normal flow works. This
    // MUST be a real anchor the user taps — iOS/Android only hand a universal
    // link off to the native app on a genuine link click, not a JS navigation.
    if (shouldUsePhantomDeeplink()) {
      return (
        <a
          href={phantomBrowseUrl()}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-theme font-semibold transition-all',
            'bg-accent text-accent-contrast shadow-glow hover:bg-accent-strong active:scale-[0.98]',
            size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-5 text-sm',
          )}
        >
          <Icon name="wallet" size={16} />
          Open in Phantom
          <Icon name="external" size={16} />
        </a>
      );
    }
    return (
      <Button size={size} onClick={() => setVisible(true)} loading={connecting} iconLeft="wallet">
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={cn(
          'inline-flex items-center gap-2 rounded-theme border border-surface-border bg-surface px-3 font-medium text-content transition-colors hover:bg-surface-hover',
          size === 'sm' ? 'h-9 text-sm' : 'h-11 text-sm',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="h-2 w-2 rounded-full bg-positive" />
        <span className="font-mono">{shortenAddress(address)}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-theme border border-surface-border bg-bg-elevated p-1 shadow-card animate-fade-in-fast" role="menu">
          <button
            type="button"
            onMouseDown={copy}
            className="flex w-full items-center gap-2 rounded-theme-sm px-3 py-2 text-sm text-content-muted transition-colors hover:bg-surface-hover hover:text-content"
          >
            <Icon name="copy" size={15} /> Copy address
          </button>
          <button
            type="button"
            onMouseDown={() => {
              void disconnect();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-theme-sm px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
          >
            <Icon name="close" size={15} /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
