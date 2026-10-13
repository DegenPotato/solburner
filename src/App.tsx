import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { appConfig } from '@/config';
import { ThemeProvider } from '@/theme';
import { WalletProviders } from '@/wallet/WalletProviders';
import { RecoveryProvider } from '@/state/RecoveryContext';
import { NotificationProvider, ToastViewport } from '@/components/notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppShell } from '@/components/layout';
import { Icon } from '@/components/ui/Icon';
import { useFeeRecipientHealth } from '@/hooks/useFeeRecipientHealth';

const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const AppPage = lazy(() => import('@/pages/AppPage').then((m) => ({ default: m.AppPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Icon name="spinner" size={28} className="animate-spin text-accent" />
    </div>
  );
}

/** Applies the brand's document title once on boot. */
function useDocumentTitle() {
  useEffect(() => {
    document.title = appConfig.brand.documentTitle ?? appConfig.brand.name;
  }, []);
}

export default function App() {
  useDocumentTitle();
  useFeeRecipientHealth();

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <WalletProviders>
            <RecoveryProvider>
              <BrowserRouter>
                <AppShell>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/app" element={<AppPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </AppShell>
                <ToastViewport />
              </BrowserRouter>
            </RecoveryProvider>
          </WalletProviders>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
