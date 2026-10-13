import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ConnectButton } from '../wallet/ConnectButton';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-surface-border/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
