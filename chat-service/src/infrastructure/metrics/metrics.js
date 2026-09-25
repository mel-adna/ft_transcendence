const client = require('prom-client');

// Prometheus registry for chat-service: default Node process metrics
// (event loop lag, heap, GC, CPU) plus connection/message/DM counters below.
const register = new client.Registry();
register.setDefaultLabels({ service: 'chat-service' });
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const socketConnectionsGauge = new client.Gauge({
  name: 'chat_socket_connections_total',
  help: 'Currently connected Socket.io clients',
  registers: [register],
});

const onlineUsersGauge = new client.Gauge({
  name: 'chat_online_users_total',
  help: 'Distinct users with at least one live socket (a user with 2 tabs open counts once here, twice in chat_socket_connections_total)',
  registers: [register],
});

const messagesSentCounter = new client.Counter({
  name: 'chat_messages_sent_total',
  help: 'Messages successfully persisted and broadcast',
  registers: [register],
});

const socketAuthFailuresCounter = new client.Counter({
  name: 'chat_socket_auth_failures_total',
  help: 'Rejected socket handshakes, by reason (expired/invalid/missing token)',
  labelNames: ['reason'],
  registers: [register],
});

const dmRequestsCounter = new client.Counter({
  name: 'chat_dm_requests_total',
  help: 'DM requests, by outcome',
  labelNames: ['outcome'], // sent | accepted | rejected
  registers: [register],
});

const redisConnectedGauge = new client.Gauge({
  name: 'chat_redis_connected',
  help: '1 if the Socket.io Redis adapter is attached (multi-instance mode), 0 if running single-instance',
  registers: [register],
});

// Records request duration/count per response. Uses req.route.path when set
// so the route label stays a pattern like "/rooms/:roomId" instead of one
// label per real room id; falls back to the raw path for unmatched (404) routes.
function httpMetricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path
      ? (req.baseUrl || '') + req.route.path
      : req.path;
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      durationSeconds,
    );
  });
  next();
}

module.exports = {
  register,
  httpMetricsMiddleware,
  socketConnectionsGauge,
  onlineUsersGauge,
  messagesSentCounter,
  socketAuthFailuresCounter,
  dmRequestsCounter,
  redisConnectedGauge,
};
