import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage, getToken } from '../../lib/api';
import { useSocketEvent } from '../../lib/useDataChanged';

function isSameNotification(liveItem, storedItem) {
  return (
    liveItem.message === storedItem.message &&
    String(liveItem.entityId ?? '') === String(storedItem.entityId ?? '')
  );
}

function mergeWithLive(previous, storedItems) {
  const unmatchedLive = previous.filter(
    (item) => item.live && !storedItems.some((stored) => isSameNotification(item, stored)),
  );
  return [...unmatchedLive, ...storedItems];
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [storedUnreadCount, setStoredUnreadCount] = useState(0);
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
      const count =
        typeof countResponse.data === 'number'
          ? countResponse.data
          : Number(countResponse.data) || items.length;

      setNotifications((previous) => mergeWithLive(previous, items));
      setStoredUnreadCount(Math.max(0, count));
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function sync() {
      reload();
    }
    sync();
  }, [reload]);

  useSocketEvent('notification:new', (event) => {
    if (!event) return;

    const message = event.payload?.message || event.message;
    if (!message) return;

    const eventId = event.eventId || event.id || `local-${Date.now()}-${Math.random()}`;

    const incoming = {
      id: eventId,
      live: true,
      message,
      type: event.type || 'TASK',
      entityType: event.entityType || null,
      entityId: event.entityId || null,
      isRead: false,
      createdAt: event.timestamp || event.createdAt || new Date().toISOString(),
    };

    setNotifications((previous) => {
      if (previous.some((item) => item.id === eventId)) return previous;
      return [incoming, ...previous];
    });

    reload();
  });

  const markAsRead = useCallback(
    async (id) => {
      if (!id) return;

      const target = notifications.find((item) => item.id === id);
      setNotifications((previous) => previous.filter((item) => item.id !== id));

      if (target?.live) return;

      setStoredUnreadCount((previous) => Math.max(0, previous - 1));

      try {
        await api.patch(`/notifications/${id}/read`);
      } catch {
        reload();
      }
    },
    [notifications, reload],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications([]);
    setStoredUnreadCount(0);

    try {
      await api.put('/notifications/read-all');
    } catch {
      reload();
    }
  }, [reload]);

  const liveCount = notifications.filter((item) => item.live).length;
  const unreadCount = storedUnreadCount + liveCount;

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
