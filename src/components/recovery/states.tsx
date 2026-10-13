import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { ConnectButton } from '../wallet/ConnectButton';

/** Skeleton shown while a scan is in flight. */
export function ScanningState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Scanning wallet">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Card flush className="p-4">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </Card>
    </div>
  );
}

interface CenteredProps {
  icon: ReactNode;
  title: string;
  message: string;
  children?: ReactNode;
}

function Centered({ icon, title, message, children }: CenteredProps) {
  return (
    <Card className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">{icon}</div>
      <h2 className="font-display text-xl font-semibold text-content">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-content-muted">{message}</p>
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </Card>
  );
}

/** Shown before a wallet is connected. */
export function ConnectGate() {
  return (
    <Centered
      icon={<Icon name="wallet" size={26} />}
      title="Connect your wallet"
      message="Connect to scan for token accounts holding reclaimable rent. Read-only — nothing happens until you sign."
    >
      <ConnectButton size="md" />
    </Centered>
  );
}

/** Shown when a scan finds nothing to recover. */
export function NothingToRecover({ onRescan }: { onRescan: () => void }) {
  return (
    <Centered
      icon={<Icon name="check-circle" size={26} />}
      title="Wallet is clean"
      message="No closeable token accounts were found. There's no rent to reclaim right now."
    >
      <Button variant="secondary" iconLeft="refresh" onClick={onRescan}>
        Scan again
      </Button>
    </Centered>
  );
}

/** Prompt to start the first scan after connecting. */
export function ReadyToScan({ onScan, scanning }: { onScan: () => void; scanning: boolean }) {
  return (
    <Centered
      icon={<Icon name="flame" size={26} />}
      title="Ready to scan"
      message="We'll look across both SPL token programs for accounts you can close to reclaim their rent deposit."
    >
      <Button onClick={onScan} loading={scanning} iconLeft="refresh">
        Scan my wallet
      </Button>
    </Centered>
  );
}
