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
 * @returns {{
 *   messages: object[],
 *   isLoading: boolean,
 *   hasMore: boolean,
 *   sendMessage: (content: string, opts?: { type?: string, parentId?: string }) => void,
 *   editMessage: (messageId: string, newContent: string) => void,
 *   deleteMessage: (messageId: string) => void,
 *   loadMore: () => void,
 * }}
 */
export function useChat(roomId) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef(null);
  const optimisticIds = useRef(new Set());

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
        // Drop if already added optimistically
        if (optimisticIds.current.has(msg.id)) {
          optimisticIds.current.delete(msg.id);
          return;
        }
        setMessages((prev) => [...prev, msg]);
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
  const sendMessage = useCallback(
    (content, { type = 'TEXT', parentId = null } = {}) => {
      if (!socket || !connected || !roomId || !content.trim()) return;

      // Optimistic: immediate local append with a temp id
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        roomId,
        content: content.trim(),
        type,
        parentId,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: socket.user ?? { id: 'me', username: 'You' },
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      socket.emit(
        'message:send',
        { roomId, content: content.trim(), type, parentId },
        ({ ok, messageId, error }) => {
          if (ok) {
            optimisticIds.current.add(messageId);
            // Replace temp with real id
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...m, id: messageId, _optimistic: false } : m,
              ),
            );
          } else {
            // Rollback
            console.error('[useChat] Send failed:', error);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
        },
      );
    },
    [socket, connected, roomId],
  );

  // ─── EDIT ─────────────────────────────────────────────────────────────────
  const editMessage = useCallback(
    (messageId, newContent) => {
      if (!socket || !connected || !newContent.trim()) return;
      socket.emit('message:edit', { messageId, newContent: newContent.trim() }, ({ ok, error }) => {
        if (!ok) console.error('[useChat] Edit failed:', error);
      });
    },
    [socket, connected],
  );

  // ─── DELETE ───────────────────────────────────────────────────────────────
  const deleteMessage = useCallback(
    (messageId) => {
      if (!socket || !connected) return;
      socket.emit('message:delete', { messageId }, ({ ok, error }) => {
        if (!ok) console.error('[useChat] Delete failed:', error);
      });
    },
    [socket, connected],
  );

  return {
    messages,
    isLoading,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMore,
  };
}
