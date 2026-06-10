import { useSocketContext } from '../context/SocketContext';

/**
 * useSocket
 * Returns socket instance + connection helpers.
 * Throws if used outside <SocketProvider>.
 *
 * @returns {{
 *   socket: import('socket.io-client').Socket | null,
 *   connected: boolean,
 *   status: string,
 *   emit: (event: string, payload?: any) => void
 * }}
 */
export function useSocket() {
  return useSocketContext();
}
