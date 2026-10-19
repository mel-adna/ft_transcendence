const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const chatRoutes = require('./interfaces/routes/chatRoutes');
const roomRoutes = require('./interfaces/routes/roomRoutes');
const socketServer = require('./infrastructure/socket/SocketServer');
const notificationSubscriber = require('./infrastructure/redis/NotificationSubscriber');
const { startPresenceCleanup, gracefulShutdown } = require('./infrastructure/lifecycle/serverLifecycle');
const { register, httpMetricsMiddleware } = require('./infrastructure/metrics/metrics');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const chatApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpMetricsMiddleware);

app.use('/api/chat', chatApiLimiter);
app.use('/api/chat', chatRoutes);
app.use('/api/chat', roomRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    socket: socketServer.getStats?.() ?? { status: 'not_initialized' },
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('Server error:', err.stack);
  const byStatus = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 413: 'PAYLOAD_TOO_LARGE', 415: 'UNSUPPORTED_MEDIA_TYPE' };
  const code = err.type === 'entity.parse.failed' ? 'INVALID_JSON'
    : status >= 500 ? 'INTERNAL_ERROR'
      : byStatus[status] ?? `HTTP_${status}`;
  res.status(status).json({ error: code });
});

const PORT = process.env.PORT || 5005;
let presenceCleanupTimer = null;

async function bootstrap() {
  await socketServer.init(server);
  await notificationSubscriber.start();

  presenceCleanupTimer = startPresenceCleanup();

  server.listen(PORT);
}

bootstrap().catch((err) => {
  console.error('[Server] Bootstrap failed:', err);
  process.exit(1);
});

const shutdown = () => gracefulShutdown(server, socketServer, presenceCleanupTimer, notificationSubscriber);

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});

module.exports = { app, server };
