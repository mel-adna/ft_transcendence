import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';

/**
 * useReadReceipts
 * Tracks every member's last-read position in a room and auto-reports the
 * current user's own read position as they view incoming messages.
 *
 * "Read" is computed by timestamp: a member has read a message if their
 * `readAt` is at or after the message's `createdAt`. This works for both live
 * messages and REST-loaded history without needing message ordering.
 *
 * @param {string | null} roomId
 * @param {string} currentUserId
 * @param {object[]} messages - current room messages (from useChat)
 * @param {boolean} active - whether this room is currently visible/focused
 * @returns {{
 *   isReadByOthers: (message: object) => boolean,
 *   readersOf: (message: object) => string[],   // other userIds who've read it
 * }}
 */
export function useReadReceipts(roomId, currentUserId, messages, active = true) {
  const { socket, connected } = useSocket();

  // userId -> { lastReadMessageId, readAt }  (readAt as epoch ms)
  const [receipts, setReceipts] = useState({});

  const applyReceipt = useCallback((userId, lastReadMessageId, readAt) => {
    const ts = readAt ? new Date(readAt).getTime() : 0;
    setReceipts((prev) => {
      const existing = prev[userId];
      // Never move a read position backwards (out-of-order events).
      if (existing && existing.readAt >= ts) return prev;
      return { ...prev, [userId]: { lastReadMessageId, readAt: ts } };
    });
  }, []);

  // Reset + bootstrap when the room changes. The read:sync ack below replaces
  // state with the fresh server snapshot.
  useEffect(() => {
    setReceipts({});
    if (!socket || !connected || !roomId) return;
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
  }, [socket, connected, roomId]);

  // Live updates from other members (and our own echo).
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

  // Report our own read position when we're viewing the room and new content
  // arrives. We mark up to the newest message authored by someone else.
  const lastReportedRef = useRef(null);
  useEffect(() => {
    if (!active || !socket || !connected || !roomId || messages.length === 0) return;

    // Find the newest non-optimistic message we could mark as read.
    let newest = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m._optimistic && !m._failed) {
        newest = m;
        break;
      }
    }
    if (!newest || newest.id === lastReportedRef.current) return;
    // Avoid emitting for our own just-sent message with nothing else new.
    lastReportedRef.current = newest.id;
    socket.emit('message:read', { roomId, lastReadMessageId: newest.id }, () => {});
  }, [messages, active, socket, connected, roomId]);

  // Reset the report guard when switching rooms.
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
