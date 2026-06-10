const { Server } = require('socket.io');
const socketAuthUseCase = require('../../application/socket/SocketAuthUseCase');
const registry = require('./SocketRegistry');
const registerChatHandlers = require('../../interfaces/sockets/chatSocket');
const registerMessageHandlers = require('../../interfaces/sockets/messageHandler');
const registerPresenceHandlers = require('../../interfaces/sockets/presenceHandler');

/**
 * SocketServer
 * Bootstraps Socket.io, attaches auth middleware, registers all handlers.
 */
class SocketServer {
  constructor() {
    /** @type {import('socket.io').Server | null} */
    this.io = null;
  }

  /**
   * @param {import('http').Server} httpServer
   * @returns {import('socket.io').Server}
   */
  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Tune transport for production
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this._applyAuthMiddleware();
    this._registerConnectionHandler();

    console.log('[SocketServer] Initialized');
    return this.io;
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
      const { id: userId, username } = socket.user;

      // Register in registry
      registry.register(userId, socket.id);
      console.log(`[SocketServer] Connected: userId=${userId} socketId=${socket.id} | online=${registry.stats().totalSockets}`);

      // Register domain handlers
      registerChatHandlers(this.io, socket);
      registerMessageHandlers(this.io, socket);
      registerPresenceHandlers(this.io, socket);

      // Cleanup on disconnect
      socket.on('disconnect', (reason) => {
        const result = registry.unregister(socket.id);
        console.log(`[SocketServer] Disconnected: userId=${userId} reason=${reason} lastSocket=${result?.isLastSocket}`);
      });

      socket.on('error', (err) => {
        console.error(`[SocketServer] Socket error: userId=${userId}`, err.message);
      });
    });
  }

  /**
   * Emit to all active sockets of a user
   * @param {string} userId
   * @param {string} event
   * @param {*} payload
   */
  emitToUser(userId, event, payload) {
    const socketIds = registry.getSocketIds(userId);
    for (const socketId of socketIds) {
      this.io.to(socketId).emit(event, payload);
    }
  }

  getIO() {
    if (!this.io) throw new Error('SocketServer not initialized. Call init(httpServer) first.');
    return this.io;
  }
}

const socketServer = new SocketServer();
module.exports = socketServer;
