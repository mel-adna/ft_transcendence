import { useState, useCallback, useEffect } from 'react';
import { chatApi } from '../services/chatApi';
import { useSocketEvent } from './useSocketEvent';

/**
 * useRooms
 * Fetches and manages the user's room list with realtime join updates.
 */
export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { rooms: fetched } = await chatApi.listRooms();
      setRooms(fetched);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useSocketEvent(
    'room:joined',
    useCallback((payload) => {
      if (!payload?.room) return;
      setRooms((prev) => {
        const exists = prev.some((r) => r.id === payload.room.id);
        if (exists) {
          return prev.map((r) => (r.id === payload.room.id ? payload.room : r));
        }
        return [payload.room, ...prev];
      });
    }, []),
  );

  useSocketEvent(
    'chat:rooms_joined',
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const createGroup = useCallback(async (name) => {
    const { room } = await chatApi.createGroup(name);
    setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    return room;
  }, []);

  const createDM = useCallback(async (targetUserId) => {
    const { room } = await chatApi.createDM(targetUserId);
    setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    return room;
  }, []);

  const displayName = useCallback((room) => {
    if (room.type === 'DIRECT') {
      const others = room.members?.filter((m) => m.user?.username);
      if (others?.length) return others.map((m) => m.user.username).join(', ');
      return room.name?.startsWith('dm:') ? 'Direct Message' : room.name ?? 'Direct';
    }
    return room.name ?? 'Unnamed channel';
  }, []);

  return {
    rooms,
    isLoading,
    error,
    refresh,
    createGroup,
    createDM,
    displayName,
  };
}
