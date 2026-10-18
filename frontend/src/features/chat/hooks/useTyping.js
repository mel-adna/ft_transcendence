import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';

const IDLE_STOP_MS = 3000;
const PEER_EXPIRY_MS = 7000;

export function useTyping(roomId) {
  const { socket, connected } = useSocket();

  const [typers, setTypers] = useState({});

  const isTypingRef = useRef(false);
  const idleTimerRef = useRef(null);

  const emitStart = useCallback(() => {
    if (socket && connected && roomId) socket.emit('typing:start', { roomId });
  }, [socket, connected, roomId]);

  const emitStop = useCallback(() => {
    if (socket && connected && roomId) socket.emit('typing:stop', { roomId });
  }, [socket, connected, roomId]);

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitStop();
    }
  }, [emitStop]);

  const notifyTyping = useCallback(() => {
    if (!roomId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitStart();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, IDLE_STOP_MS);
  }, [roomId, emitStart, stopTyping]);

  useEffect(() => {
    function reset() {
      isTypingRef.current = false;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      setTypers({});
    }
    reset();
  }, [roomId, connected]);

  useEffect(() => stopTyping, [stopTyping]);

  useSocketEvent(
    'typing:update',
    useCallback(
      ({ roomId: r, userId, username, isTyping }) => {
        if (r !== roomId) return;
        setTypers((prev) => {
          if (!isTyping) {
            if (!prev[userId]) return prev;
            const next = { ...prev };
            delete next[userId];
            return next;
          }
          return { ...prev, [userId]: { username, expiresAt: Date.now() + PEER_EXPIRY_MS } };
        });
      },
      [roomId],
    ),
    !!roomId,
  );

  useEffect(() => {
    if (Object.keys(typers).length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTypers((prev) => {
        let changed = false;
        const next = {};
        for (const [id, v] of Object.entries(prev)) {
          if (v.expiresAt > now) next[id] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [typers]);

  const typingUsers = Object.entries(typers).map(([userId, v]) => ({
    userId,
    username: v.username,
  }));

  return { typingUsers, notifyTyping, stopTyping };
}
