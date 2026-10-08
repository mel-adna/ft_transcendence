import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';

function formatRelativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Presentational only: AppLayout owns the single useNotifications() instance
// and passes its state to both the desktop and mobile bells.
export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  loading = false,
  markAsRead,
  markAllAsRead,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open]);

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-xs"
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications panel"
          className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl border border-card bg-panel p-1 shadow-2xl backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-card/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {badgeText}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-hidden focus-visible:underline cursor-pointer"
              >
                <Check size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-muted/20 bg-canvas/60 text-muted">
                <Bell size={16} />
              </div>
              <p className="text-xs font-medium text-muted">No new notifications</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-card/40 [scrollbar-color:rgba(113,113,122,0.3)_transparent] [scrollbar-width:thin]">
              {notifications.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  title="Click to mark as read"
                  className="group flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-hidden focus-visible:bg-white/[0.04] cursor-pointer"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-relaxed text-white break-words">
                      {item.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-muted/80">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
