const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const socketAuthUseCase = require('../../application/socket/SocketAuthUseCase');
const socketConfig = require('../../config/socketConfig');
const { createRedisClients } = require('../redis/redisClient');
const registry = require('./SocketRegistry');
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

class SocketServer {
  constructor() {
    this.io = null;
    this._redis = null;
    this._connectionCount = 0;
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
        const user = await socketAuthUseCase.execute(socket.handshake.auth);
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
        registry.unregister(socket.id);
        const afterStats = registry.stats();
        socketConnectionsGauge.set(afterStats.totalSockets);
        onlineUsersGauge.set(afterStats.onlineUsers);
      });

      socket.on('error', (err) => {
        console.error(`[SocketServer] Socket error: userId=${userId}`, err.message);
      });
    });
  }

  emitToUser(userId, event, payload, { local = false } = {}) {
    if (!this.io) return;
    (local ? this.io.local : this.io).to(userRoom(userId)).emit(event, payload);
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
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    if (this._redis) {
      await Promise.all([
        this._redis.pubClient.quit(),
        this._redis.subClient.quit(),
      ]);
      this._redis = null;
    }
  }
}

const socketServer = new SocketServer();
module.exports = socketServer;
