const { socketRateLimitedCounter } = require('../../infrastructure/metrics/metrics');

const WINDOW_MS = 10_000;
const LIMITS = {
  'message:send': 15,
  'message:edit': 10,
  'message:delete': 10,
  'message:read': 60,
  'read:sync': 20,
  'typing:start': 20,
  'typing:stop': 20,
  'presence:set': 10,
  'presence:subscribe': 20,
  'presence:unsubscribe': 20,
  'presence:heartbeat': 10,
  'room:join': 20,
  'room:leave': 10,
};
const DEFAULT_LIMIT = 30;

const windows = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
}, 60_000).unref();

function bucketFor(event) {
  return typeof event === 'string' && Object.hasOwn(LIMITS, event) ? event : 'other';
}

function isAllowed(userId, bucket) {
  const now = Date.now();
  const key = `${userId}:${bucket}`;
  let w = windows.get(key);
  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(key, w);
  }
  w.count += 1;
  return w.count <= (LIMITS[bucket] ?? DEFAULT_LIMIT);
}

function applySocketRateLimit(socket) {
  const userId = socket.user.id;

  socket.use((packet, next) => {
    const bucket = bucketFor(packet[0]);
    if (isAllowed(userId, bucket)) return next();

    socketRateLimitedCounter.inc({ event: bucket });
    const ack = packet[packet.length - 1];
    if (typeof ack === 'function') ack({ ok: false, error: 'RATE_LIMITED' });
  });
}

module.exports = applySocketRateLimit;
