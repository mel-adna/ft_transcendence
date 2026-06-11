import { useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';

/**
 * usePresence
 * Tracks realtime presence + manual status changes.
 */
export function usePresence(initialPresence = {}) {
  const { socket, connected } = useSocket();
  const [presence, setPresence] = useState(initialPresence);

  useSocketEvent(
    'presence:update',
    useCallback(({ userId, status, lastSeen }) => {
      setPresence((prev) => ({
        ...prev,
        [userId]: { status, lastSeen },
      }));
    }, []),
  );

  const getStatus = useCallback(
    (userId) => presence[userId]?.status ?? 'OFFLINE',
    [presence],
  );

  const setStatus = useCallback(
    (status) => {
      if (!socket || !connected) return;
      socket.emit('presence:set', { status });
    },
    [socket, connected],
  );

  return { presence, getStatus, setStatus };
}
