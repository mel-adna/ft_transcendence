import { useState, useCallback } from 'react';
import { useSocketEvent } from './useSocketEvent';

/**
 * usePresence
 * Tracks realtime presence updates for any user visible in current context.
 * Feed it an initial presence map from your user store.
 *
 * @param {Record<string, { status: string, lastSeen: string|null }>} initialPresence
 * @returns {{
 *   presence: Record<string, { status: string, lastSeen: string|null }>,
 *   getStatus: (userId: string) => string,
 * }}
 *
 * @example
 * const { presence, getStatus } = usePresence({});
 * getStatus('user-123') // → 'ONLINE' | 'OFFLINE' | 'AWAY'
 */
export function usePresence(initialPresence = {}) {
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

  return { presence, getStatus };
}
