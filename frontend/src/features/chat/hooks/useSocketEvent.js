import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * useSocketEvent
 * Subscribes to a socket event for the lifetime of the component.
 * Automatically cleans up on unmount or when dependencies change.
 *
 * @param {string} event - Socket event name
 * @param {(payload: any) => void} handler - Event handler (stable ref via useCallback preferred)
 * @param {boolean} [enabled=true] - Gate: only subscribe when true
 *
 * @example
 * useSocketEvent('message:new', (msg) => dispatch(addMessage(msg)));
 */
export function useSocketEvent(event, handler, enabled = true) {
  const { socket } = useSocket();
  // Keep handler ref stable so we don't re-register on every render
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket || !enabled) return;

    const stableHandler = (...args) => handlerRef.current(...args);
    socket.on(event, stableHandler);

    return () => {
      socket.off(event, stableHandler);
    };
  }, [socket, event, enabled]);
}
