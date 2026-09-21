// ==========================================
// Team-Pulse Dashboard Backend Core Server
// ==========================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const chatRoutes = require('./interfaces/routes/chatRoutes');
const roomRoutes = require('./interfaces/routes/roomRoutes');
const socketServer = require('./infrastructure/socket/SocketServer');
const { startPresenceCleanup, gracefulShutdown } = require('./infrastructure/lifecycle/serverLifecycle');

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

app.use('/api/chat', chatApiLimiter, chatRoutes);
app.use('/api/chat', chatApiLimiter, roomRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    socket: socketServer.getStats?.() ?? { status: 'not_initialized' },
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5005;
let presenceCleanupTimer = null;

async function bootstrap() {
  await socketServer.init(server);

  presenceCleanupTimer = startPresenceCleanup();

  server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Bootstrap failed:', err);
  process.exit(1);
});

const shutdown = () => gracefulShutdown(server, socketServer, presenceCleanupTimer);

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { app, server };
