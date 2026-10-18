const prisma = require('../database/prismaClient');
const SyncStalePresenceUseCase = require('../../application/presence/SyncStalePresenceUseCase');

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

async function gracefulShutdown(server, socketServer, cleanupTimer = null, notificationSubscriber = null) {
  console.log('[Server] Graceful shutdown initiated…');

  if (cleanupTimer) clearInterval(cleanupTimer);

  await new Promise((resolve) => {
    server.close(resolve);
  });

  if (notificationSubscriber) await notificationSubscriber.stop();
  await socketServer.shutdown();
  await prisma.$disconnect();

  console.log('[Server] Shutdown complete');
  process.exit(0);
}

module.exports = { startPresenceCleanup, gracefulShutdown };
