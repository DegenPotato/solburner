import { RecoveryDashboard } from '@/components/recovery';

/** The main application surface: the wallet cleanup dashboard. */
export function AppPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <RecoveryDashboard />
    </div>
  );
}
