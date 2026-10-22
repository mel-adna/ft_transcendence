const { verifyCurrentIdentity } = require('../http/JavaBackendClient');

// Pub/Sub is best effort. Recheck established local sockets against the existing
// authority, without copying bearer tokens into adapter-visible socket.data.
class IdentityReconciler {
  constructor(verify = verifyCurrentIdentity) {
    this.verify = verify;
    this.sessions = new Map();
    this.running = false;
    this.timer = null;
  }
  start(intervalMs = 30000) {
    this.timer = setInterval(() => this.reconcile(), intervalMs);
    this.timer.unref?.();
  }
  track(socket, token, clientIp = null) {
    this.sessions.set(socket.id, { socket, token, userId: socket.user.id, clientIp });
    socket.on('disconnect', () => this.sessions.delete(socket.id));
  }
  async reconcile() {
    if (this.running) return;
    this.running = true;
    try {
      const groups = new Map();
      for (const value of this.sessions.values()) {
        if (!groups.has(value.token)) groups.set(value.token, []);
        groups.get(value.token).push(value);
      }
      const queue = [...groups.values()];
      const worker = async () => {
        while (queue.length) {
          const sessions = queue.shift();
          try { await this.verify(sessions[0].token, sessions[0].userId, { clientIp: sessions[0].clientIp, fresh: true }); }
          catch (error) {
            if (['AUTH_TOKEN_REVOKED', 'AUTH_PAYLOAD_INVALID'].includes(error.message)) {
              for (const value of sessions) {
                if (this.sessions.has(value.socket.id)) {
                  if (Date.now() >= value.socket.user.expiresAt) value.socket.conn.close();
                  else value.socket.disconnect(true);
                }
              }
            }
            // An authority outage must not be mistaken for a definitive revocation.
            // Existing JWT expiry timers still impose the original maximum lifetime.
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
    } finally { this.running = false; }
  }
  stop() { clearInterval(this.timer); this.timer = null; this.sessions.clear(); }
}
module.exports = IdentityReconciler;
