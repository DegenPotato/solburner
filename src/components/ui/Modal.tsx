import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Prevent closing via backdrop/escape (e.g. while executing). */
  dismissible?: boolean;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, description, children, footer, dismissible = true, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={() => dismissible && onClose()}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm animate-fade-in-fast"
      />
      <div
        className={cn(
          'relative z-10 m-0 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-theme-lg border border-surface-border bg-bg-elevated shadow-card animate-fade-in sm:m-4 sm:rounded-theme-lg',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-border p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-content">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-content-muted">{description}</p>}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-theme-sm p-1.5 text-content-subtle transition-colors hover:bg-surface-hover hover:text-content"
              aria-label="Close"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-surface-border bg-surface/40 p-5">{footer}</div>}
      </div>
    </div>
  );
}
