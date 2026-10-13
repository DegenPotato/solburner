import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-5xl font-bold text-accent">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-content">Page not found</h1>
      <p className="mt-2 text-content-muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6">
        <Button iconLeft="arrow-right">Back home</Button>
      </Link>
    </div>
  );
}
