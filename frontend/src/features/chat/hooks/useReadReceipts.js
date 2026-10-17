import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';

export function useReadReceipts(roomId, currentUserId, messages, active = true) {
  const { socket, connected } = useSocket();

  const [receipts, setReceipts] = useState({});

  const applyReceipt = useCallback((userId, lastReadMessageId, readAt) => {
    const ts = readAt ? new Date(readAt).getTime() : 0;
    setReceipts((prev) => {
      const existing = prev[userId];
      if (existing && existing.readAt >= ts) return prev;
      return { ...prev, [userId]: { lastReadMessageId, readAt: ts } };
    });
  }, []);

  useEffect(() => {
    function sync() {
      setReceipts({});
      if (!socket || !connected || !roomId) return undefined;
      let cancelled = false;
      socket.emit('read:sync', { roomId }, (res) => {
        if (cancelled || !res?.ok) return;
        const next = {};
        for (const r of res.receipts ?? []) {
          next[r.userId] = {
            lastReadMessageId: r.lastReadMessageId,
            readAt: r.readAt ? new Date(r.readAt).getTime() : 0,
          };
        }
        setReceipts(next);
      });
      return () => {
        cancelled = true;
      };
    }
    return sync();
  }, [socket, connected, roomId]);

  useSocketEvent(
    'message:read',
    useCallback(
      ({ roomId: r, userId, lastReadMessageId, readAt }) => {
        if (r !== roomId) return;
        applyReceipt(userId, lastReadMessageId, readAt);
      },
      [roomId, applyReceipt],
    ),
    !!roomId,
  );

  const lastReportedRef = useRef(null);
  useEffect(() => {
    if (!active || !socket || !connected || !roomId || messages.length === 0) return;

    let newest = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m._optimistic && !m._failed) {
        newest = m;
        break;
      }
    }
    if (!newest || newest.id === lastReportedRef.current) return;
    lastReportedRef.current = newest.id;
    socket.emit('message:read', { roomId, lastReadMessageId: newest.id }, () => {});
  }, [messages, active, socket, connected, roomId]);

  useEffect(() => {
    lastReportedRef.current = null;
  }, [roomId]);

  const readersOf = useCallback(
    (message) => {
      if (!message?.createdAt) return [];
      const msgTs = new Date(message.createdAt).getTime();
      const out = [];
      for (const [userId, r] of Object.entries(receipts)) {
        if (userId === currentUserId) continue;
        if (r.readAt >= msgTs) out.push(userId);
      }
      return out;
    },
    [receipts, currentUserId],
  );

  const isReadByOthers = useCallback(
    (message) => readersOf(message).length > 0,
    [readersOf],
  );

  return useMemo(() => ({ isReadByOthers, readersOf }), [isReadByOthers, readersOf]);
}
