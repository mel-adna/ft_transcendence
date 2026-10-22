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

let shutdownInProgress = null;

function gracefulShutdown(server, socketServer, cleanupTimer = null, notificationSubscriber = null,
  { timeoutMs = 10000, exit = (code) => process.exit(code) } = {}) {
  if (shutdownInProgress) return shutdownInProgress;
  shutdownInProgress = (async () => {
    if (cleanupTimer) clearInterval(cleanupTimer);
    const failures = [];
    const attempt = async (name, action) => {
      try { await action(); } catch (error) { failures.push(name); console.error(`[Shutdown] ${name} failed:`, error.name); }
    };
    const httpClosed = new Promise((resolve) => {
      try { server.close((error) => { if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') failures.push('http'); resolve(); }); }
      catch { failures.push('http'); resolve(); }
    });
    const cleanup = (async () => {
      await Promise.all([
        attempt('sockets', () => socketServer.shutdown()),
        attempt('subscriber', () => notificationSubscriber?.stop()),
      ]);
      server.closeIdleConnections?.();
      await httpClosed;
      await attempt('database', () => prisma.$disconnect());
      return true;
    })();
    let timer;
    const deadline = new Promise((resolve) => {
      timer = setTimeout(() => { server.closeAllConnections?.(); resolve(false); }, timeoutMs);
    });
    const completed = await Promise.race([cleanup, deadline]);
    clearTimeout(timer);
    if (!completed) console.error('[Shutdown] Deadline exceeded; terminating remaining connections');
    exit(completed && failures.length === 0 ? 0 : 1);
  })();
  return shutdownInProgress;
}

module.exports = { startPresenceCleanup, gracefulShutdown };
