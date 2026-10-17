import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';

const HISTORY_API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5005/api';

export function useChat(roomId, currentUserId) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef(null);
  const loadingRef = useRef(false);
  const requestRef = useRef(0);

  const fetchHistory = useCallback(
    async (cursor = null, replace = false) => {
      if (!roomId || (loadingRef.current && !replace)) return;
      const requestId = ++requestRef.current;
      loadingRef.current = true;
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
        if (requestId !== requestRef.current) return;
        cursorRef.current = nextCursor;
        setHasMore(!!nextCursor);

        setMessages((prev) =>
          replace ? [...fetched].reverse() : [...fetched].reverse().concat(prev),
        );
      } catch {
        // ignore, isLoading already reflects the failure
      } finally {
        if (requestId === requestRef.current) {
          loadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [roomId],
  );

  useEffect(() => {
    function load() {
      if (!roomId) return;
      cursorRef.current = null;
      setMessages([]);
      setHasMore(true);
      fetchHistory(null, true);
    }
    load();
  }, [roomId, fetchHistory]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && cursorRef.current) {
      fetchHistory(cursorRef.current);
    }
  }, [hasMore, isLoading, fetchHistory]);

  useSocketEvent(
    'message:new',
    useCallback(
      (msg) => {
        if (msg.roomId !== roomId) return;
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
        ({ ok, messageId }) => {
          if (ok) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...m, id: messageId, _optimistic: false, _failed: false }
                  : m,
              ),
            );
          } else {
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
        return prev.map((m) =>
          m.id === tempId ? { ...m, _optimistic: true, _failed: false } : m,
        );
      });
    },
    [emitMessage],
  );

  const discardMessage = useCallback((tempId) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

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
