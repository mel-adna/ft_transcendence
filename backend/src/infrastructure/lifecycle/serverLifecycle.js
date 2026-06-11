const prisma = require('../database/prismaClient');
const SyncStalePresenceUseCase = require('../../application/presence/SyncStalePresenceUseCase');

/**
 * Periodic stale presence cleanup (Phase 6)
 * @param {number} intervalMs
 */
function startPresenceCleanup(intervalMs = 5 * 60 * 1000) {
  const run = async () => {
    try {
      const count = await SyncStalePresenceUseCase.execute(5);
      if (count > 0) {
        console.log(`[PresenceCleanup] Marked ${count} stale user(s) OFFLINE`);
      }
    } catch (err) {
      console.error('[PresenceCleanup] Failed:', err.message);
    }
  };

  run();
  return setInterval(run, intervalMs);
}

/**
 * Graceful shutdown for HTTP server, Socket.io, Redis, and Prisma
 * @param {import('http').Server} server
 * @param {import('./infrastructure/socket/SocketServer')} socketServer
 * @param {NodeJS.Timeout|null} cleanupTimer
 */
async function gracefulShutdown(server, socketServer, cleanupTimer = null) {
  console.log('[Server] Graceful shutdown initiated…');

  if (cleanupTimer) clearInterval(cleanupTimer);

  await new Promise((resolve) => {
    server.close(resolve);
  });

  await socketServer.shutdown();
  await prisma.$disconnect();

  console.log('[Server] Shutdown complete');
  process.exit(0);
}

module.exports = { startPresenceCleanup, gracefulShutdown };
