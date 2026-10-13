import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { RpcStatusBanner } from './RpcStatusBanner';

/** Page chrome: themed background, sticky header, content, footer. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--app-bg)' }}>
      <Header />
      <RpcStatusBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
