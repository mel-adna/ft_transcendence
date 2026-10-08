import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';

const HISTORY_API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5005/api';

/**
 * useChat
 * Manages message state, send/edit/delete, optimistic updates, and history
 * for a single room.
 *
 * @param {string | null} roomId
 * @param {string} currentUserId - id of the logged-in user (for optimistic attribution)
 * @returns {{
 *   messages: object[],
 *   isLoading: boolean,
 *   hasMore: boolean,
 *   sendMessage: (content: string, opts?: { type?: string, parentId?: string }) => void,
 *   retryMessage: (tempId: string) => void,
 *   discardMessage: (tempId: string) => void,
 *   loadMore: () => void,
 * }}
 */
export function useChat(roomId, currentUserId) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef(null);

  // ─── FETCH HISTORY (REST) ─────────────────────────────────────────────────
  const fetchHistory = useCallback(
    async (cursor = null, replace = false) => {
      if (!roomId || isLoading) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (cursor) params.set('cursor', cursor);

        const res = await fetch(
          `${HISTORY_API_BASE}/chat/rooms/${roomId}/messages?${params}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);

        const { messages: fetched, nextCursor } = await res.json();
        cursorRef.current = nextCursor;
        setHasMore(!!nextCursor);

        setMessages((prev) =>
          replace ? [...fetched].reverse() : [...fetched].reverse().concat(prev),
        );
      } catch (err) {
        console.error('[useChat] fetchHistory error:', err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [roomId],
  );

  // Load history when roomId changes
  useEffect(() => {
    if (!roomId) return;
    cursorRef.current = null;
    setMessages([]);
    setHasMore(true);
    fetchHistory(null, true);
  }, [roomId]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && cursorRef.current) {
      fetchHistory(cursorRef.current);
    }
  }, [hasMore, isLoading, fetchHistory]);

  // ─── REALTIME EVENTS ──────────────────────────────────────────────────────
  useSocketEvent(
    'message:new',
    useCallback(
      (msg) => {
        if (msg.roomId !== roomId) return;
        // The server excludes the sender from this broadcast, so our own
        // messages never arrive here (they're handled optimistically on send).
        // Guard against duplicate ids from reconnect replays / StrictMode.
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
      },
      [roomId],
    ),
    !!roomId,
  );

  useSocketEvent(
    'message:updated',
    useCallback(
      (updated) => {
        if (updated.roomId !== roomId) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
        );
      },
      [roomId],
    ),
    !!roomId,
  );

  useSocketEvent(
    'message:deleted',
    useCallback(
      ({ messageId, roomId: deletedRoomId }) => {
        if (deletedRoomId !== roomId) return;
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
      [roomId],
    ),
    !!roomId,
  );

  // ─── SEND ─────────────────────────────────────────────────────────────────
  // Emits an already-optimistic message (identified by tempId) and reconciles
  // the ack. Shared by sendMessage (first attempt) and retryMessage.
  const emitMessage = useCallback(
    (tempId, { content, type, parentId }) => {
      if (!socket || !connected) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, _optimistic: false, _failed: true } : m,
          ),
        );
        return;
      }

      socket.emit(
        'message:send',
        { roomId, content, type, parentId },
        ({ ok, messageId, error }) => {
          if (ok) {
            // Replace temp id with the real DB id so edit/delete target it.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...m, id: messageId, _optimistic: false, _failed: false }
                  : m,
              ),
            );
          } else {
            // Keep the message visible and flag it so the user can retry.
            console.error('[useChat] Send failed:', error);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...m, _optimistic: false, _failed: true } : m,
              ),
            );
          }
        },
      );
    },
    [socket, connected, roomId],
  );

  const sendMessage = useCallback(
    (content, { type = 'TEXT', parentId = null } = {}) => {
      if (!roomId || !content.trim()) return;
      const trimmed = content.trim();

      // Optimistic: immediate local append with a temp id.
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMsg = {
        id: tempId,
        roomId,
        content: trimmed,
        type,
        parentId,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: { id: currentUserId, username: 'You' },
        _optimistic: true,
        _failed: false,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      emitMessage(tempId, { content: trimmed, type, parentId });
    },
    [roomId, currentUserId, emitMessage],
  );

  // ─── RETRY ────────────────────────────────────────────────────────────────
  const retryMessage = useCallback(
    (tempId) => {
      setMessages((prev) => {
        const target = prev.find((m) => m.id === tempId);
        if (target) {
          emitMessage(tempId, {
            content: target.content,
            type: target.type,
            parentId: target.parentId,
          });
        }
        // Flip back to "sending" state immediately for feedback.
        return prev.map((m) =>
          m.id === tempId ? { ...m, _optimistic: true, _failed: false } : m,
        );
      });
    },
    [emitMessage],
  );

  // ─── DISCARD (drop a failed optimistic message) ─────────────────────────────
  const discardMessage = useCallback((tempId) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  // Inbound message:updated / message:deleted are still handled above so the
  // list stays in sync if another client (or a moderator tool) changes a
  // message — this UI just no longer exposes edit/delete actions itself.

  return {
    messages,
    isLoading,
    hasMore,
    sendMessage,
    retryMessage,
    discardMessage,
    loadMore,
  };
}
