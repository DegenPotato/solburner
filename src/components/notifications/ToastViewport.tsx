import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import { useNotifications } from './NotificationProvider';
import type { NotificationKind } from './NotificationProvider';

const KIND_ICON: Record<NotificationKind, IconName> = {
  success: 'check-circle',
  error: 'alert',
  info: 'info',
  warning: 'alert',
};

const KIND_ACCENT: Record<NotificationKind, string> = {
  success: 'text-positive',
  error: 'text-danger',
  info: 'text-info',
  warning: 'text-warning',
};

/** Fixed, accessible toast stack rendered above all content. */
export function ToastViewport() {
  const { notifications, dismiss } = useNotifications();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto w-full max-w-sm animate-fade-in rounded-theme border border-surface-border bg-bg-elevated/95 p-4 shadow-card backdrop-blur"
          role="status"
        >
          <div className="flex gap-3">
            <Icon name={KIND_ICON[n.kind]} className={`mt-0.5 shrink-0 ${KIND_ACCENT[n.kind]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-content">{n.title}</p>
              {n.message && <p className="mt-0.5 break-words text-sm text-content-muted">{n.message}</p>}
              {n.action && (
                <a
                  href={n.action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  {n.action.label}
                  <Icon name="external" size={14} />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              className="shrink-0 rounded-theme-sm p-1 text-content-subtle transition-colors hover:bg-surface-hover hover:text-content"
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
