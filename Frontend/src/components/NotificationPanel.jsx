import { useState, useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { api } from '../services/api.js';

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function categoryIcon(category) {
  switch (category) {
    case 'exam': return 'assignment';
    case 'system': return 'settings';
    case 'alert': return 'warning';
    case 'ai': return 'auto_awesome';
    default: return 'notifications';
  }
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/notifications')
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function markRead(id) {
    api.patch(`/notifications/${id}/read`).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }).catch(() => {});
  }

  function markAllRead() {
    api.post('/notifications/read-all').then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }).catch(() => {});
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-1 rounded-lg hover:bg-surface-container-higher transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Icon name="notifications" className="text-on-surface-variant" ariaHidden={false} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-error text-on-error text-label-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 mt-xs w-80 max-h-[480px] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant bg-surface-container-low">
            <span className="text-label-md font-bold text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-label-sm text-secondary font-bold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="p-md text-center text-label-sm text-on-surface-variant">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-md text-center">
                <Icon name="notifications_off" className="text-2xl text-on-surface-variant opacity-50 mb-xs" />
                <p className="text-label-sm text-on-surface-variant">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`w-full text-left px-md py-sm border-b border-outline-variant last:border-b-0 transition-colors hover:bg-surface-container ${
                    n.is_read ? 'opacity-70' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-start gap-sm">
                    <Icon
                      name={categoryIcon(n.category)}
                      className={`mt-0.5 ${n.is_read ? 'text-on-surface-variant' : 'text-secondary'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-label-md truncate ${n.is_read ? '' : 'font-bold'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-label-sm text-on-surface-variant line-clamp-2 mt-xs">
                          {n.message}
                        </p>
                      )}
                      <p className="text-label-xs text-on-surface-variant mt-xs">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-secondary mt-sm shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
