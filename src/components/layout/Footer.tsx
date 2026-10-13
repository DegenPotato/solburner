import { appConfig } from '@/config';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import { Logo } from './Logo';

const SOCIAL_ICON: Record<string, IconName> = {
  twitter: 'twitter',
  discord: 'discord',
  github: 'github',
  docs: 'docs',
  web: 'web',
};

export function Footer() {
  const { brand } = appConfig;
  return (
    <footer className="border-t border-surface-border/70 bg-bg-inset/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md space-y-3">
          <Logo />
          <p className="text-sm text-content-muted">{brand.footerNote}</p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <nav className="flex flex-wrap gap-4">
            {brand.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-accent"
              >
                <Icon name={SOCIAL_ICON[social.icon] ?? 'web'} size={16} />
                {social.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-content-subtle">
            © {new Date().getFullYear()} {brand.name}. Not affiliated with Solana Foundation.
          </p>
        </div>
      </div>
    </footer>
  );
}
