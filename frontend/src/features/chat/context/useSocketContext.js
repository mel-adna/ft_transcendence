import { createContext, useContext } from 'react';

/**
 * @typedef {object} SocketContextValue
 * @property {import('socket.io-client').Socket | null} socket
 * @property {boolean} connected
 * @property {string} status - 'idle' | 'connecting' | 'connected' | 'error'
 * @property {(event: string, payload?: any) => void} emit
 */

export const SocketContext = createContext(null);

/**
 * @returns {SocketContextValue}
 */
export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within <SocketProvider>');
  return ctx;
}
