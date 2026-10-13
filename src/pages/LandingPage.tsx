import { Link } from 'react-router-dom';
import { appConfig } from '@/config';
import { formatPercent } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'bolt',
    title: 'Transparent fees',
    body: 'Every figure — gross, fee, and net — comes from one calculation engine. What you preview is exactly what you sign.',
  },
  {
    icon: 'flame',
    title: 'Fast scanning',
    body: 'Parallel reads across both SPL token programs with automatic RPC failover, so a flaky node never stalls your scan.',
  },
  {
    icon: 'shield',
    title: 'Non-custodial',
    body: 'You hold your keys and sign every transaction. Recovered SOL goes straight back to your wallet — never through us.',
  },
];

const STEPS = [
  { title: 'Connect', body: 'Link any Solana wallet. The scan is read-only.' },
  { title: 'Scan', body: 'We find token accounts holding reclaimable rent.' },
  { title: 'Select', body: 'Choose what to close. Empty accounts are pre-selected.' },
  { title: 'Recover', body: 'Sign once. SOL lands back in your wallet.' },
];

export function LandingPage() {
  const { brand, fees } = appConfig;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'var(--hero-bg)' }}>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge tone="accent" className="mb-5">
            <Icon name="sparkle" size={13} />
            Service fee {formatPercent(fees.rate)}
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-content sm:text-6xl">
            {brand.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-content-muted">{brand.description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/app">
              <Button size="lg" iconRight="arrow-right">
                Launch app
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline">
                How it works
              </Button>
            </a>
          </div>
          <p className="mt-5 text-xs text-content-subtle">Non-custodial · You sign every transaction · No account required</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-theme bg-accent/12 text-accent">
                <Icon name={f.icon} size={22} />
              </div>
              <h3 className="font-display text-lg font-semibold text-content">{f.title}</h3>
              <p className="mt-1.5 text-sm text-content-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold text-content">Four steps to your SOL</h2>
          <p className="mt-2 text-content-muted">No sign-up. No custody. No surprises.</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-theme-lg border border-surface-border bg-surface/60 p-5">
              <span className="font-mono text-sm font-bold text-accent">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-display text-lg font-semibold text-content">{step.title}</h3>
              <p className="mt-1 text-sm text-content-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <Link to="/app">
            <Button size="lg" iconRight="arrow-right">
              Get started
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
