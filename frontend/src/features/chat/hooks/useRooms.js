import { useState, useCallback, useEffect, useRef } from 'react';
import { chatApi } from '../services/chatApi';
import { useSocketEvent } from './useSocketEvent';

/**
 * useRooms
 * Fetches and manages the user's room list with realtime join updates.
 * @param {string} [currentUserId] - used to exclude yourself from a DM's
 *   displayed name; a DIRECT room's `members` includes both sides, and
 *   without this a DM shows as "You, TheirName" instead of just their name.
 */
export function useRooms(currentUserId) {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { rooms: fetched } = await chatApi.listRooms();
      setRooms(fetched ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPendingRequests = useCallback(async () => {
    try {
      const { requests } = await chatApi.listPendingDMRequests();
      setPendingRequests(requests ?? []);
    } catch {
      // Non-critical — the badge just won't update until the next refresh.
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshPendingRequests();
  }, [refresh, refreshPendingRequests]);

  // Someone sent us a DM request — surface it in the pending list.
  useSocketEvent(
    'dm:requested',
    useCallback(() => {
      refreshPendingRequests();
    }, [refreshPendingRequests]),
  );

  // The other side responded to a request WE sent.
  useSocketEvent(
    'dm:responded',
    useCallback(
      ({ roomId, action, room }) => {
        if (action === 'ACCEPT' && room) {
          setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
        }
        setPendingRequests((prev) => prev.filter((r) => r.id !== roomId));
      },
      [],
    ),
  );

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

  useSocketEvent(
    'room:deleted',
    useCallback(({ roomId }) => {
      if (!roomId) return;
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    }, []),
  );

  // Fired to the leaver's own sockets (e.g. left from another tab).
  useSocketEvent(
    'room:left',
    useCallback(({ roomId }) => {
      if (!roomId) return;
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    }, []),
  );

  // Which room the user is actively viewing — messages here don't count as
  // unread. Kept in a ref so the message:new handler stays stable.
  const activeRoomIdRef = useRef(null);
  const setActiveRoom = useCallback((roomId) => {
    activeRoomIdRef.current = roomId;
    if (!roomId) return;
    // Opening a room clears its badge.
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId && r.unreadCount ? { ...r, unreadCount: 0 } : r)),
    );
  }, []);

  // Bump unread badges for rooms the user isn't currently looking at, and lift
  // the room to the top of the list (most-recent-activity ordering).
  useSocketEvent(
    'message:new',
    useCallback((msg) => {
      if (!msg?.roomId) return;
      const isActive = msg.roomId === activeRoomIdRef.current;
      setRooms((prev) => {
        const idx = prev.findIndex((r) => r.id === msg.roomId);
        if (idx === -1) return prev;
        const room = prev[idx];
        const updated = {
          ...room,
          unreadCount: isActive ? 0 : (room.unreadCount ?? 0) + 1,
        };
        const next = [...prev];
        next.splice(idx, 1);
        return [updated, ...next];
      });
    }, []),
  );

  const createGroup = useCallback(async (name, memberIds = []) => {
    const { room } = await chatApi.createGroup(name, memberIds);
    setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    return room;
  }, []);

  const inviteToRoom = useCallback(async (roomId, userIds) => {
    const { room } = await chatApi.inviteToRoom(roomId, userIds);
    setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
    return room;
  }, []);

  const createDM = useCallback(async (targetUserId) => {
    const { room } = await chatApi.createDM(targetUserId);
    setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    return room;
  }, []);

  const respondToDM = useCallback(async (roomId, action) => {
    const { room } = await chatApi.respondToDM(roomId, action);
    setPendingRequests((prev) => prev.filter((r) => r.id !== roomId));
    if (action === 'ACCEPT' && room) {
      setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    }
    return room;
  }, []);

  const deleteRoom = useCallback(async (roomId) => {
    await chatApi.deleteRoom(roomId);
    // Optimistically drop it; the room:deleted broadcast will also arrive but
    // the filter is idempotent.
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const leaveRoom = useCallback(async (roomId) => {
    await chatApi.leaveRoom(roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const displayName = useCallback(
    (room) => {
      if (room.type === 'DIRECT') {
        const others = room.members?.filter(
          (m) => m.user?.username && m.userId !== currentUserId,
        );
        if (others?.length) return others.map((m) => m.user.username).join(', ');
        return room.name?.startsWith('dm:') ? 'Direct Message' : room.name ?? 'Direct';
      }
      return room.name ?? 'Unnamed channel';
    },
    [currentUserId],
  );

  return {
    rooms,
    isLoading,
    error,
    refresh,
    createGroup,
    createDM,
    inviteToRoom,
    deleteRoom,
    leaveRoom,
    setActiveRoom,
    displayName,
    pendingRequests,
    respondToDM,
  };
}
