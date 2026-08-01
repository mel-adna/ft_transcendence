import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import { useSocketEvent } from './useSocketEvent';

/**
 * useTyping
 * Two responsibilities for a single room:
 *   1. Outbound — `notifyTyping()` emits `typing:start` (throttled) on keystroke
 *      and auto-emits `typing:stop` after an idle gap or on send/unmount.
 *   2. Inbound — tracks the set of *other* users currently typing, with a
 *      per-user expiry so a dropped `typing:stop` can't leave a stuck indicator.
 *
 * @param {string | null} roomId
 * @returns {{ typingUsers: {userId: string, username: string}[], notifyTyping: () => void, stopTyping: () => void }}
 */
const IDLE_STOP_MS = 3000; // emit stop after this much keystroke silence
const PEER_EXPIRY_MS = 7000; // drop a peer if no update within this window

export function useTyping(roomId) {
  const { socket, connected } = useSocket();

  // Inbound: userId -> { username, expiresAt }
  const [typers, setTypers] = useState({});

  // Outbound state
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
    // Only emit start on the leading edge; subsequent keystrokes just push the
    // idle timer out. This keeps us to one start per typing burst.
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitStart();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, IDLE_STOP_MS);
  }, [roomId, emitStart, stopTyping]);

  // Reset everything when the room changes or socket drops.
  useEffect(() => {
    isTypingRef.current = false;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setTypers({});
  }, [roomId, connected]);

  // Tell peers we stopped if we navigate away mid-type.
  useEffect(() => stopTyping, [stopTyping]);

  // Inbound updates.
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

  // Sweep expired peers so a missed stop can't pin an indicator forever.
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
