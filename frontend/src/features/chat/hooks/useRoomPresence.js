import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';
import { chatApi } from '../services/chatApi';

/**
 * useRoomPresence
 * Subscribes to room presence via socket + REST bootstrap.
 *
 * @param {string | null} roomId
 */
export function useRoomPresence(roomId) {
  const { socket, connected } = useSocket();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!roomId) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    chatApi
      .getPresence(roomId)
      .then(({ members: fetched }) => {
        if (!cancelled) setMembers(fetched);
      })
      .catch((err) => console.error('[useRoomPresence] fetch error:', err.message));

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    socket.emit('presence:subscribe', { roomId });

    return () => {
      socket.emit('presence:unsubscribe', { roomId });
    };
  }, [socket, connected, roomId]);

  useSocketEvent(
    'presence:snapshot',
    useCallback(
      (payload) => {
        if (payload.roomId !== roomId) return;
        setMembers(payload.members ?? []);
      },
      [roomId],
    ),
    !!roomId,
  );

  useSocketEvent(
    'presence:update',
    useCallback(
      (payload) => {
        if (!roomId) return;
        setMembers((prev) => {
          const idx = prev.findIndex((m) => m.userId === payload.userId);
          if (idx === -1) return prev;
          return prev.map((m) =>
            m.userId === payload.userId
              ? { ...m, status: payload.status, lastSeen: payload.lastSeen }
              : m,
          );
        });
      },
      [roomId],
    ),
    !!roomId,
  );

  const onlineCount = members.filter((m) => m.status === 'ONLINE').length;

  return { members, onlineCount };
}
