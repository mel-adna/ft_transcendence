import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getErrorMessage, getToken } from '../../lib/api';
import { useSocketEvent } from '../../lib/useDataChanged';

function isSameNotification(liveItem, storedItem) {
  if (liveItem.notificationId) {
    return String(liveItem.notificationId) === String(storedItem.id);
  }
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

function restoreItem(current, item, index) {
  if (current.some((existing) => existing.id === item.id)) return current;
  const next = [...current];
  next.splice(Math.min(index, next.length), 0, item);
  return next;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [storedUnreadCount, setStoredUnreadCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [error, setError] = useState(null);
  const [markedCount, setMarkedCount] = useState(0);
  const currentRequestRef = useRef(null);
  const markEpochRef = useRef(0);
  const refillPendingRef = useRef(false);

  const reload = useCallback(async () => {
    if (!getToken()) return;

    const requestToken = {};
    currentRequestRef.current = requestToken;
    const markEpoch = markEpochRef.current;
    const isStale = () =>
      currentRequestRef.current !== requestToken || markEpochRef.current !== markEpoch;

    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get('/notifications/unread'),
        api.get('/notifications/unread-count'),
      ]);
      if (isStale()) return;
      const items = Array.isArray(listResponse.data) ? listResponse.data : [];
      const count =
        typeof countResponse.data === 'number'
          ? countResponse.data
          : Number(countResponse.data) || items.length;

      setNotifications((previous) => mergeWithLive(previous, items));
      setStoredUnreadCount(Math.max(0, count));
      setError(null);
    } catch (requestError) {
      if (isStale()) return;
      setError(getErrorMessage(requestError));
    } finally {
      if (currentRequestRef.current === requestToken) setLoading(false);
    }
  }, []);

  useEffect(() => {
    function sync() {
      reload();
    }
    sync();
  }, [reload]);

  useEffect(() => {
    function refill() {
      if (!refillPendingRef.current) return;
      refillPendingRef.current = false;
      if (notifications.length === 0 && storedUnreadCount > 0) reload();
    }
    refill();
  }, [markedCount, notifications.length, storedUnreadCount, reload]);

  useSocketEvent('notification:new', (event) => {
    if (!event) return;

    const message = event.payload?.message || event.message;
    if (!message) return;

    const eventId = event.eventId || event.id || `local-${Date.now()}-${Math.random()}`;

    const incoming = {
      id: eventId,
      notificationId: event.payload?.notificationId || null,
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

      const index = notifications.findIndex((item) => item.id === id);
      const target = notifications[index];
      markEpochRef.current += 1;
      setError(null);
      setNotifications((previous) => previous.filter((item) => item.id !== id));

      if (target?.live && !target.notificationId) return;

      if (!target?.live) setStoredUnreadCount((previous) => Math.max(0, previous - 1));

      try {
        await api.patch(`/notifications/${target?.live ? target.notificationId : id}/read`);
        markEpochRef.current += 1;
        refillPendingRef.current = true;
        setMarkedCount((previous) => previous + 1);
      } catch (requestError) {
        if (target) setNotifications((current) => restoreItem(current, target, index));
        if (!target?.live) setStoredUnreadCount((previous) => previous + 1);
        setError(getErrorMessage(requestError));
      }
    },
    [notifications],
  );

  const markAllAsRead = useCallback(async () => {
    const previousItems = notifications;
    const previousCount = storedUnreadCount;
    markEpochRef.current += 1;
    setError(null);
    setNotifications([]);
    setStoredUnreadCount(0);

    try {
      await api.put('/notifications/read-all');
      markEpochRef.current += 1;
      refillPendingRef.current = true;
      setMarkedCount((previous) => previous + 1);
    } catch (requestError) {
      setNotifications((current) => [
        ...current,
        ...previousItems.filter((item) => !current.some((existing) => existing.id === item.id)),
      ]);
      setStoredUnreadCount((previous) => previous + previousCount);
      setError(getErrorMessage(requestError));
    }
  }, [notifications, storedUnreadCount]);

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
