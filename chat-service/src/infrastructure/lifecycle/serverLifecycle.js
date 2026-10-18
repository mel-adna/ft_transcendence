const prisma = require('../database/prismaClient');
const SyncStalePresenceUseCase = require('../../application/presence/SyncStalePresenceUseCase');

function startPresenceCleanup(intervalMs = 5 * 60 * 1000) {
  const run = async () => {
    try {
      await SyncStalePresenceUseCase.execute(5);
    } catch (err) {
      console.error('[PresenceCleanup] Failed:', err.message);
    }
  };

  run();
  return setInterval(run, intervalMs);
}

async function gracefulShutdown(server, socketServer, cleanupTimer = null, notificationSubscriber = null) {
  if (cleanupTimer) clearInterval(cleanupTimer);

  await new Promise((resolve) => {
    server.close(resolve);
  });

  if (notificationSubscriber) await notificationSubscriber.stop();
  await socketServer.shutdown();
  await prisma.$disconnect();
  process.exit(0);
}

module.exports = { startPresenceCleanup, gracefulShutdown };
