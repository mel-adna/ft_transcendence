import { useEffect, useRef } from 'react';
import { socketClient } from '../infrastructure/socket/SocketClient';
import { getToken } from './api';

export function useSocketEvent(eventName, onEvent) {
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!getToken()) return undefined;

    let socket;
    try {
      socketClient.configure(getToken);
      socket = socketClient.connect();
    } catch {
      return undefined;
    }

    const release = socketClient.retain();
    const listener = (payload) => handlerRef.current?.(payload);

    socket.on(eventName, listener);
    return () => {
      socket.off(eventName, listener);
      release();
    };
  }, [eventName]);
}

export function useDataChanged(resource, onChange) {
  useSocketEvent('data:changed', (payload) => {
    if (payload?.resource !== resource) return;
    onChange?.();
  });
}
