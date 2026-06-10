import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socketClient } from '../../../infrastructure/socket/SocketClient';

/**
 * @typedef {object} SocketContextValue
 * @property {import('socket.io-client').Socket | null} socket
 * @property {boolean} connected
 * @property {string} status - 'idle' | 'connecting' | 'connected' | 'error'
 * @property {(event: string, payload?: any) => void} emit
 */

const SocketContext = createContext(null);

/**
 * SocketProvider
 * Wraps app (or protected routes). Manages socket lifecycle tied to auth.
 *
 * @param {{ children: React.ReactNode, getToken: () => string | null }} props
 * getToken — function returning current JWT (from your auth store)
 */
export function SocketProvider({ children, getToken }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    setStatus('connecting');
    socketClient.configure(getToken);

    let s;
    try {
      s = socketClient.connect();
      setSocket(s);
    } catch (err) {
      console.error('[SocketProvider] Failed to connect:', err.message);
      setStatus('error');
      return;
    }

    const onConnect = () => {
      setConnected(true);
      setStatus('connected');
    };

    const onDisconnect = () => {
      setConnected(false);
      setStatus('idle');
    };

    const onConnectError = () => {
      setStatus('error');
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    // Sync initial state
    if (s.connected) {
      setConnected(true);
      setStatus('connected');
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      socketClient.disconnect();
      setSocket(null);
      setConnected(false);
      setStatus('idle');
    };
  }, [getToken]);

  const emit = useCallback(
    (event, payload) => {
      if (!socket?.connected) {
        console.warn(`[SocketProvider] Attempted emit '${event}' while disconnected`);
        return;
      }
      socket.emit(event, payload);
    },
    [socket],
  );

  return (
    <SocketContext.Provider value={{ socket, connected, status, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * @returns {SocketContextValue}
 */
export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within <SocketProvider>');
  return ctx;
}
