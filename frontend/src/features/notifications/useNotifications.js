import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage, getToken } from '../../lib/api';
import { useSocketEvent } from '../../lib/useDataChanged';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!getToken()) return;

    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get('/notifications/unread'),
        api.get('/notifications/unread-count'),
      ]);

      const items = Array.isArray(listResponse.data) ? listResponse.data : [];
      setNotifications(items);

      const count =
        typeof countResponse.data === 'number'
          ? countResponse.data
          : Number(countResponse.data) || items.length;
      setUnreadCount(Math.max(0, count));
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!getToken()) return;

      try {
        const [listResponse, countResponse] = await Promise.all([
          api.get('/notifications/unread'),
          api.get('/notifications/unread-count'),
        ]);

        if (cancelled) return;

        const items = Array.isArray(listResponse.data) ? listResponse.data : [];
        setNotifications(items);

        const count =
          typeof countResponse.data === 'number'
            ? countResponse.data
            : Number(countResponse.data) || items.length;
        setUnreadCount(Math.max(0, count));
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        setError(getErrorMessage(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time socket event subscription
  useSocketEvent('notification:new', (event) => {
    if (!event) return;

    const eventId = event.eventId || event.id;
    const message = event.payload?.message || event.message;
    if (!message) return;

    const incoming = {
      id: eventId || `local-${Date.now()}-${Math.random()}`,
      message,
      type: event.type || 'TASK',
      entityType: event.entityType || null,
      entityId: event.entityId || null,
      isRead: false,
      createdAt: event.timestamp || event.createdAt || new Date().toISOString(),
    };

    setNotifications((previous) => {
      // Avoid duplicate notifications by ID
      if (eventId && previous.some((item) => item.id === eventId)) {
        return previous;
      }
      return [incoming, ...previous];
    });

    setUnreadCount((previous) => previous + 1);

    // Reconcile with database in background so real entity IDs are synchronized
    reload();
  });

  const markAsRead = useCallback(
    async (id) => {
      if (!id) return;

      // Optimistic update
      setNotifications((previous) => previous.filter((item) => item.id !== id));
      setUnreadCount((previous) => Math.max(0, previous - 1));

      try {
        await api.patch(`/notifications/${id}/read`);
      } catch (requestError) {
        console.error('Failed to mark notification as read:', getErrorMessage(requestError));
        reload();
      }
    },
    [reload],
  );

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications([]);
    setUnreadCount(0);

    try {
      await api.put('/notifications/read-all');
    } catch (requestError) {
      console.error('Failed to mark all notifications as read:', getErrorMessage(requestError));
      reload();
    }
  }, [reload]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    reload,
    markAsRead,
    markAllAsRead,
  };
}
