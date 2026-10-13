import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createLogger } from '@/utils/logger';

const log = createLogger('error-boundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Top-level boundary so a render error never blanks the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('render error', { message: error.message, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-content">Something went wrong</h1>
        <p className="max-w-md text-sm text-content-muted">{this.state.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-theme bg-accent px-5 py-2.5 font-semibold text-accent-contrast"
        >
          Reload
        </button>
      </div>
    );
  }
}
