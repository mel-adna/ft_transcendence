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
    // .active stays true once the socket exists and hasn't been destroyed,
    // even mid-reconnect, so this also covers "still reconnecting" without
    // tearing down and recreating the socket on every call.
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
      auth: (cb) => cb({ token: this._tokenGetter?.() }),
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
   * No-op: auth is a function (see connect()), so it already reads the
   * current token via _tokenGetter on every (re)connect. Kept so existing
   * callers after a token refresh don't need to change.
   */
  updateToken() {}

  _bindLifecycleEvents() {
    const s = this._socket;

    s.on('connect', () => {
      this._startHeartbeat();
    });

    s.on('disconnect', () => {
      this._stopHeartbeat();
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
