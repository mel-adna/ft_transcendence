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
    /** Consumers outside the chat UI keeping the connection alive. */
    this._holders = 0;
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
    if (this._socket && (this._socket.connected || this._socket.active)) {
      return this._socket;
    }

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
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this._bindLifecycleEvents();
    return this._socket;
  }

  /**
   * Disconnect and destroy the socket.
   */
  disconnect() {
    if (this._holders > 0) return;
    this._forceDisconnect();
  }

  /**
   * Keep the connection alive independently of the chat UI's lifecycle.
   * Returns a release function; the socket is torn down once the last
   * holder releases and the chat provider is also gone.
   * @returns {() => void}
   */
  retain() {
    this._holders += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._holders = Math.max(0, this._holders - 1);
    };
  }

  /**
   * Tear the connection down regardless of holders, and drop them.
   * For logout: the socket is authenticated as the outgoing user, so it must
   * not survive into the next session.
   */
  forceClose() {
    this._holders = 0;
    this._forceDisconnect();
  }

  _forceDisconnect() {
    this._stopHeartbeat();
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
      this._startHeartbeat();
    });

    s.on('disconnect', () => {
      this._stopHeartbeat();
    });

    s.on('connect_error', (err) => {
      // If auth error, don't retry indefinitely
      if (
        err.message === 'AUTH_MISSING_TOKEN' ||
        err.message === 'AUTH_TOKEN_INVALID' ||
        err.message === 'AUTH_TOKEN_EXPIRED'
      ) {
        s.disconnect();
      }
    });

    s.on('reconnect_failed', () => {
      s.disconnect();
    });
  }

  // Heartbeat every 30s to signal ONLINE presence.
  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatInterval = setInterval(() => {
      if (this._socket?.connected) this._socket.emit('presence:heartbeat');
    }, 30_000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }
}

export const socketClient = new SocketClient();
