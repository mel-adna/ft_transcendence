import { io } from 'socket.io-client';

/**
 * SocketClient (Infrastructure)
 * Singleton socket connection with auth token injection and auto-reconnect.
 * Never import socket.io-client directly — always use this module.
 */
class SocketClient {
  constructor() {
    /** @type {import('socket.io-client').Socket | null} */
    this._socket = null;
    this._tokenGetter = null;
  }

  /**
   * Initialize with a function that returns the current JWT token.
   * Call once at app bootstrap, before connect().
   * @param {() => string | null} tokenGetter
   */
  configure(tokenGetter) {
    this._tokenGetter = tokenGetter;
  }

  /**
   * Connect to the WebSocket server.
   * Safe to call multiple times — no-op if already connected.
   * @returns {import('socket.io-client').Socket}
   */
  connect() {
    if (this._socket?.connected) return this._socket;

    const token = this._tokenGetter?.();
    if (!token) throw new Error('SOCKET_NO_AUTH_TOKEN');

    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
    }

    this._socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:5005', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this._bindLifecycleEvents();
    return this._socket;
  }

  /**
   * Disconnect and destroy the socket.
   */
  disconnect() {
    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
    }
  }

  /**
   * Access the raw socket — throws if not connected.
   * Prefer hooks (useSocket, useSocketEvent) over calling this directly.
   * @returns {import('socket.io-client').Socket}
   */
  getSocket() {
    if (!this._socket) throw new Error('SOCKET_NOT_CONNECTED');
    return this._socket;
  }

  /**
   * @returns {boolean}
   */
  isConnected() {
    return this._socket?.connected ?? false;
  }

  /**
   * Refresh auth token on reconnect (e.g. after token rotation).
   * @param {string} newToken
   */
  updateToken(newToken) {
    if (this._socket) {
      this._socket.auth = { token: newToken };
    }
  }

  _bindLifecycleEvents() {
    const s = this._socket;

    s.on('connect', () => {
      console.log('[SocketClient] Connected:', s.id);
    });

    s.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected:', reason);
    });

    s.on('connect_error', (err) => {
      console.error('[SocketClient] Connection error:', err.message);
      // If auth error, don't retry indefinitely
      if (
        err.message === 'AUTH_MISSING_TOKEN' ||
        err.message === 'AUTH_TOKEN_INVALID' ||
        err.message === 'AUTH_TOKEN_EXPIRED'
      ) {
        s.disconnect();
      }
    });

    // Heartbeat every 30s to signal ONLINE presence
    s.on('connect', () => {
      if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = setInterval(() => {
        if (s.connected) s.emit('presence:heartbeat');
      }, 30_000);
    });

    s.on('disconnect', () => {
      if (this._heartbeatInterval) {
        clearInterval(this._heartbeatInterval);
        this._heartbeatInterval = null;
      }
    });
  }
}

export const socketClient = new SocketClient();
