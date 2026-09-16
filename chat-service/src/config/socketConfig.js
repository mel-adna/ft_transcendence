/**
 * Socket.io server configuration
 */
module.exports = {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT ?? '60000', 10),
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL ?? '25000', 10),
  maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_BUFFER ?? '1048576', 10),
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  /** Max concurrent connections per server instance */
  maxConnections: parseInt(process.env.SOCKET_MAX_CONNECTIONS ?? '1000', 10),
};
