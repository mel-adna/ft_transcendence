const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const socketAuthUseCase = require('../../application/socket/SocketAuthUseCase');
const socketConfig = require('../../config/socketConfig');
const { createRedisClients } = require('../redis/redisClient');
const registry = require('./SocketRegistry');
const IdentityReconciler = require('./IdentityReconciler');
const registerChatHandlers = require('../../interfaces/sockets/chatSocket');
const registerMessageHandlers = require('../../interfaces/sockets/messageHandler');
const registerPresenceHandlers = require('../../interfaces/sockets/presenceHandler');
const registerRoomHandlers = require('../../interfaces/sockets/roomHandler');
const registerTypingHandlers = require('../../interfaces/sockets/typingHandler');
const applySocketRateLimit = require('../../interfaces/sockets/socketRateLimit');
const {
  socketConnectionsGauge,
  onlineUsersGauge,
  socketAuthFailuresCounter,
  redisConnectedGauge,
} = require('../metrics/metrics');

const userRoom = (userId) => `user:${userId}`;
const clientIpOf = (socket) => socket.handshake?.headers?.['x-real-ip'] ?? socket.handshake?.address ?? null;

class SocketServer {
  constructor() {
    this.io = null;
    this._redis = null;
    this._connectionCount = 0;
    this._identities = new IdentityReconciler();
  }

  async init(httpServer) {
    const { maxConnections, ...ioOptions } = socketConfig;

    this.io = new Server(httpServer, ioOptions);

    this._redis = await createRedisClients();
    if (this._redis) {
      this.io.adapter(createAdapter(this._redis.pubClient, this._redis.subClient));
    }
    redisConnectedGauge.set(this._redis ? 1 : 0);

    this._applyConnectionLimit(maxConnections);
    this._applyAuthMiddleware();
    this._registerConnectionHandler();
    this._identities.start();

    return this.io;
  }

  _applyConnectionLimit(maxConnections) {
    this.io.use((socket, next) => {
      if (this._connectionCount >= maxConnections) {
        return next(new Error('SERVER_AT_CAPACITY'));
      }
      next();
    });
  }

  _applyAuthMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const user = await socketAuthUseCase.execute(socket.handshake.auth, { clientIp: clientIpOf(socket) });
        if (user.svRaised) this.disconnectStaleSessions(user.id, user.sv);
        socket.user = user;
        socket.data.sv = user.sv;
        next();
      } catch (err) {
        const reason = err.message?.startsWith('AUTH_') ? err.message : 'INTERNAL_ERROR';
        console.warn(`[SocketServer] Auth rejected: ${err.message} | socketId=${socket.id}`);
        socketAuthFailuresCounter.inc({ reason });
        next(new Error(reason));
      }
    });
  }

  _registerConnectionHandler() {
    this.io.on('connection', (socket) => {
      this._connectionCount += 1;
      const { id: userId } = socket.user;
      this._identities.track(socket, socket.handshake?.auth?.token, clientIpOf(socket));

      // Established connections must not outlive the access token used to open them.
      // Closing the transport lets existing clients reconnect with their refreshed token.
      const expiryTimer = setTimeout(() => socket.conn.close(),
        Math.max(0, Math.min(socket.user.expiresAt - Date.now(), 2_147_483_647)));
      expiryTimer.unref?.();
      socket.use((_packet, next) => {
        if (Date.now() >= socket.user.expiresAt) {
          socket.conn.close();
          return next(new Error('AUTH_TOKEN_EXPIRED'));
        }
        next();
      });
      socket.on('disconnect', () => clearTimeout(expiryTimer));

      socket.join(userRoom(userId));
      registry.register(userId, socket.id);
      const stats = registry.stats();
      socketConnectionsGauge.set(stats.totalSockets);
      onlineUsersGauge.set(stats.onlineUsers);

      applySocketRateLimit(socket);
      registerChatHandlers(this.io, socket);
      registerMessageHandlers(this.io, socket);
      registerPresenceHandlers(this.io, socket);
      registerRoomHandlers(this.io, socket);
      registerTypingHandlers(this.io, socket);

      socket.on('disconnect', () => {
        this._connectionCount = Math.max(0, this._connectionCount - 1);
        const afterStats = registry.stats();
        socketConnectionsGauge.set(afterStats.totalSockets);
        onlineUsersGauge.set(afterStats.onlineUsers);
      });

      socket.on('error', (err) => {
        console.error(`[SocketServer] Socket error: userId=${userId}`, err.message);
      });
    });
  }

  emitToUser(userId, event, payload, { local = false, exceptSocketId = null } = {}) {
    if (!this.io) return;
    let target = (local ? this.io.local : this.io).to(userRoom(userId));
    // only skips the socket if it sits in this user's room, so a foreign id is a no-op
    if (exceptSocketId) target = target.except(exceptSocketId);
    target.emit(event, payload);
  }

  disconnectUser(userId) {
    if (!this.io) return;
    this.io.in(userRoom(userId)).disconnectSockets(true);
  }

  disconnectStaleSessions(userId, sv) {
    if (!this.io) return;
    this.io.in(userRoom(userId)).fetchSockets()
      .then((sockets) => {
        for (const s of sockets) if ((s.data?.sv ?? 0) < sv) s.disconnect(true);
      })
      .catch((err) => console.error('[SocketServer] stale session check failed:', err.message));
  }

  joinUserToRoom(userId, roomId) {
    if (!this.io) return;
    this.io.in(userRoom(userId)).socketsJoin(roomId);
  }

  leaveUserFromRoom(userId, roomId) {
    if (!this.io) return;
    this.io.in(userRoom(userId)).socketsLeave(roomId);
  }

  getStats() {
    if (!this.io) {
      return { status: 'initializing', connections: 0, redisEnabled: false };
    }
    return {
      ...registry.stats(),
      connections: this._connectionCount,
      redisEnabled: !!this._redis,
    };
  }

  getIO() {
    if (!this.io) throw new Error('SocketServer not initialized. Call init(httpServer) first.');
    return this.io;
  }

  async shutdown() {
    this._identities.stop();
    if (this.io) {
      const io = this.io;
      await new Promise((resolve) => io.close(resolve));
      this.io = null;
    }
    if (this._redis) {
      const results = await Promise.allSettled([
        this._redis.pubClient.quit(),
        this._redis.subClient.quit(),
      ]);
      if (results.some((result) => result.status === 'rejected')) {
        this._redis.pubClient.disconnect?.();
        this._redis.subClient.disconnect?.();
      }
      this._redis = null;
    }
  }
}

const socketServer = new SocketServer();
module.exports = socketServer;
