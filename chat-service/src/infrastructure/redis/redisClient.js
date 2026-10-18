const { createClient } = require('redis');

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
