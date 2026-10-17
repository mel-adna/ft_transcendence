import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this._socket = null;
    this._tokenGetter = null;
    this._holders = 0;
  }

  configure(tokenGetter) {
    this._tokenGetter = tokenGetter;
  }

  connect() {
    // Reuse a socket that is connected OR still completing its handshake.
    // Checking only `.connected` meant a second caller during the async
    // handshake would tear the in-flight socket down and start over — an
    // endless reconnect loop that also orphaned every listener already
    // attached to the discarded instance.
    if (this._socket && (this._socket.connected || this._socket.active)) {
      return this._socket;
    }

    const token = this._tokenGetter?.();
    if (!token) throw new Error('SOCKET_NO_AUTH_TOKEN');

    if (this._socket) {
      this._socket.connect();
      return this._socket;
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
    this._bindGiveUpRecovery();
    return this._socket;
  }

  disconnect() {
    if (this._holders > 0) return;
    this._forceDisconnect();
  }

  retain() {
    this._holders += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._holders = Math.max(0, this._holders - 1);
    };
  }

  forceClose() {
    this._holders = 0;
    this._forceDisconnect();
  }

  _forceDisconnect() {
    this._stopHeartbeat();
    this._stopGiveUpRecovery();
    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
    }
  }

  getSocket() {
    if (!this._socket) throw new Error('SOCKET_NOT_CONNECTED');
    return this._socket;
  }

  isConnected() {
    return this._socket?.connected ?? false;
  }

  updateToken() {
    if (this._socket && !this._socket.active) this._socket.connect();
  }

  _bindLifecycleEvents() {
    const s = this._socket;

    s.on('connect', () => {
      this._startHeartbeat();
    });

    s.on('disconnect', () => {
      this._stopHeartbeat();
    });
  }

  _bindGiveUpRecovery() {
    const s = this._socket;
    this._giveUpManager = s.io;
    this._onGiveUp = () => {
      this._giveUpTimer = setTimeout(() => {
        this._giveUpTimer = null;
        if (this._socket === s) {
          s.connect();
        }
      }, 15_000);
    };
    this._giveUpManager.on('reconnect_failed', this._onGiveUp);
  }

  _stopGiveUpRecovery() {
    if (this._giveUpManager && this._onGiveUp) {
      this._giveUpManager.off('reconnect_failed', this._onGiveUp);
    }
    this._giveUpManager = null;
    this._onGiveUp = null;
    if (this._giveUpTimer) {
      clearTimeout(this._giveUpTimer);
      this._giveUpTimer = null;
    }
  }

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
