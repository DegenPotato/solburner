import { Icon } from '@/components/ui/Icon';
import { useRpcHealth } from '@/hooks/useRpcHealth';

/**
 * Surfaces a total RPC outage.
 *
 * Without this, an unreachable RPC renders as empty scan results — the app
 * looks like it works and simply reports nothing to claim. Telling the user
 * the difference between "nothing found" and "we couldn't look" is the whole
 * point; it also stops an outage from being misdiagnosed as a detection bug.
 */
export function RpcStatusBanner() {
  const health = useRpcHealth();
  if (health !== 'down') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-danger/25 bg-danger/12 px-4 py-2.5 text-center text-sm text-danger"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <Icon name="alert" size={16} className="shrink-0" />
        <span>
          Can&apos;t reach the Solana network right now — scan results may be incomplete or empty.
          This is a connection problem, not an empty wallet. Retrying automatically.
        </span>
      </span>
    </div>
  );
}
