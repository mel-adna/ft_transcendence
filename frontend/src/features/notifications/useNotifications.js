import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage, getToken } from '../../lib/api';
import { useSocketEvent } from '../../lib/useDataChanged';

// Socket events carry a random eventId, not the database notification id, so a
// live item and its stored copy are matched by message + entity instead.
function isSameNotification(liveItem, storedItem) {
  return (
    liveItem.message === storedItem.message &&
    String(liveItem.entityId ?? '') === String(storedItem.entityId ?? '')
  );
}

// Merges a fresh backend list with the current one. Live items the backend
// does not return (yet, or ever — some events are never stored) stay visible.
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

  // Real-time socket event subscription
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
      // Ignore the same socket event delivered twice
      if (previous.some((item) => item.id === eventId)) return previous;
      return [incoming, ...previous];
    });

    // Fetch stored notifications so persisted events get their real ids;
    // mergeWithLive keeps this event if the backend does not return it.
    reload();
  });

  const markAsRead = useCallback(
    async (id) => {
      if (!id) return;

      const target = notifications.find((item) => item.id === id);
      setNotifications((previous) => previous.filter((item) => item.id !== id));

      // Live-only items have no database row, so there is nothing to PATCH.
      if (target?.live) return;

      setStoredUnreadCount((previous) => Math.max(0, previous - 1));

      try {
        await api.patch(`/notifications/${id}/read`);
      } catch (requestError) {
        console.error('Failed to mark notification as read:', getErrorMessage(requestError));
        reload();
      }
    },
    [notifications, reload],
  );

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications([]);
    setStoredUnreadCount(0);

    try {
      await api.put('/notifications/read-all');
    } catch (requestError) {
      console.error('Failed to mark all notifications as read:', getErrorMessage(requestError));
      reload();
    }
  }, [reload]);

  // Badge = unread rows in the database + live events not stored (yet).
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
