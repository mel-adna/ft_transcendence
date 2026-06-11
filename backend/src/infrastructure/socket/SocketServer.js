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

/**
 * SocketServer
 * Bootstraps Socket.io, optional Redis adapter, auth, and handlers.
 */
class SocketServer {
  constructor() {
    /** @type {import('socket.io').Server | null} */
    this.io = null;
    /** @type {{ pubClient: import('redis').RedisClientType, subClient: import('redis').RedisClientType } | null} */
    this._redis = null;
    this._connectionCount = 0;
  }

  /**
   * @param {import('http').Server} httpServer
   * @returns {Promise<import('socket.io').Server>}
   */
  async init(httpServer) {
    const { maxConnections, ...ioOptions } = socketConfig;

    this.io = new Server(httpServer, ioOptions);

    this._redis = await createRedisClients();
    if (this._redis) {
      this.io.adapter(createAdapter(this._redis.pubClient, this._redis.subClient));
      console.log('[SocketServer] Redis adapter attached');
    } else {
      console.log('[SocketServer] Running in single-instance mode (no REDIS_URL)');
    }

    this._applyConnectionLimit(maxConnections);
    this._applyAuthMiddleware();
    this._registerConnectionHandler();

    console.log('[SocketServer] Initialized');
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
    this.io.use((socket, next) => {
      try {
        const user = socketAuthUseCase.execute(socket.handshake.auth);
        socket.user = user;
        next();
      } catch (err) {
        console.warn(`[SocketServer] Auth rejected: ${err.message} | socketId=${socket.id}`);
        next(new Error(err.message));
      }
    });
  }

  _registerConnectionHandler() {
    this.io.on('connection', (socket) => {
      this._connectionCount += 1;
      const { id: userId } = socket.user;

      registry.register(userId, socket.id);
      console.log(
        `[SocketServer] Connected: userId=${userId} socketId=${socket.id} | online=${registry.stats().totalSockets}`,
      );

      registerChatHandlers(this.io, socket);
      registerMessageHandlers(this.io, socket);
      registerPresenceHandlers(this.io, socket);
      registerRoomHandlers(this.io, socket);

      socket.on('disconnect', (reason) => {
        this._connectionCount = Math.max(0, this._connectionCount - 1);
        const result = registry.unregister(socket.id);
        console.log(
          `[SocketServer] Disconnected: userId=${userId} reason=${reason} lastSocket=${result?.isLastSocket}`,
        );
      });

      socket.on('error', (err) => {
        console.error(`[SocketServer] Socket error: userId=${userId}`, err.message);
      });
    });
  }

  emitToUser(userId, event, payload) {
    const socketIds = registry.getSocketIds(userId);
    for (const socketId of socketIds) {
      this.io.to(socketId).emit(event, payload);
    }
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
    console.log('[SocketServer] Shutdown complete');
  }
}

const socketServer = new SocketServer();
module.exports = socketServer;
