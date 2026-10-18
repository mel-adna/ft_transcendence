import { useEffect, useRef } from 'react';
import { socketClient } from '../infrastructure/socket/SocketClient';
import { getToken } from './api';

const BURST_DELAY_MS = 400;

const attemptedSockets = new WeakSet();

function openSocket() {
  if (!getToken()) return null;
  try {
    socketClient.configure(getToken);
    return socketClient.connect();
  } catch {
    return null;
  }
}

function watchReconnect(socket, onReconnect) {
  let skipConnect = !socket.connected && !attemptedSockets.has(socket);
  if (socket.connected) attemptedSockets.add(socket);

  const onConnect = () => {
    attemptedSockets.add(socket);
    if (skipConnect) {
      skipConnect = false;
      return;
    }
    onReconnect();
  };
  const onConnectError = () => {
    attemptedSockets.add(socket);
    skipConnect = false;
  };

  socket.on('connect', onConnect);
  socket.on('connect_error', onConnectError);
  return () => {
    socket.off('connect', onConnect);
    socket.off('connect_error', onConnectError);
  };
}

export function useSocketEvent(eventName, onEvent) {
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return undefined;

    const release = socketClient.retain();
    const listener = (payload) => handlerRef.current?.(payload);

    socket.on(eventName, listener);
    return () => {
      socket.off(eventName, listener);
      release();
    };
  }, [eventName]);
}

export function useSocketReconnect(onReconnect) {
  const handlerRef = useRef(onReconnect);

  useEffect(() => {
    handlerRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return undefined;

    const release = socketClient.retain();
    const unwatch = watchReconnect(socket, () => handlerRef.current?.());

    return () => {
      unwatch();
      release();
    };
  }, []);
}

export function useDataChanged(resource, onChange, workspaceId) {
  const handlerRef = useRef(onChange);

  useEffect(() => {
    handlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return undefined;

    const release = socketClient.retain();
    let timer = null;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => handlerRef.current?.(), BURST_DELAY_MS);
    };
    const onData = (payload) => {
      if (payload?.resource !== resource) return;
      if (workspaceId && payload.workspaceId && payload.workspaceId !== workspaceId) return;
      schedule();
    };

    socket.on('data:changed', onData);
    const unwatch = watchReconnect(socket, schedule);
    return () => {
      clearTimeout(timer);
      socket.off('data:changed', onData);
      unwatch();
      release();
    };
  }, [resource, workspaceId]);
}
