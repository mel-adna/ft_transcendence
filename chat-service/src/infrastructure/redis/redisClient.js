const { createClient } = require('redis');

/**
 * Redis client factory for Socket.io adapter.
 * Returns null when REDIS_URL is not configured (single-instance mode).
 */
async function createRedisClients() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => {
    console.error('[Redis] pubClient error:', err.message);
  });
  subClient.on('error', (err) => {
    console.error('[Redis] subClient error:', err.message);
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log('[Redis] Connected for Socket.io adapter');

  return { pubClient, subClient };
}

module.exports = { createRedisClients };
