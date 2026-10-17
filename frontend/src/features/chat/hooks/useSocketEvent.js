import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

export function useSocketEvent(event, handler, enabled = true) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || !enabled) return;

    const stableHandler = (...args) => handlerRef.current(...args);
    socket.on(event, stableHandler);

    return () => {
      socket.off(event, stableHandler);
    };
  }, [socket, event, enabled]);
}
