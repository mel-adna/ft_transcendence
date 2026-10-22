const { test } = require('node:test');
const assert = require('node:assert/strict');
function stub(modulePath, exports) {
  const id = require.resolve(modulePath); require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('../src/application/socket/SocketAuthUseCase', {});
stub('../src/infrastructure/redis/redisClient', {});
stub('../src/infrastructure/socket/IdentityReconciler', class { track() {} });
stub('../src/infrastructure/socket/SocketRegistry', { register() {}, stats: () => ({ totalSockets: 1, onlineUsers: 1 }) });
for (const name of ['chatSocket', 'messageHandler', 'presenceHandler', 'roomHandler', 'typingHandler', 'socketRateLimit']) stub(`../src/interfaces/sockets/${name}`, () => {});
const gauge = { set() {}, inc() {} };
stub('../src/infrastructure/metrics/metrics', { socketConnectionsGauge: gauge, onlineUsersGauge: gauge, socketAuthFailuresCounter: gauge, redisConnectedGauge: gauge });
const server = require('../src/infrastructure/socket/SocketServer');
test('idle sockets disconnect at JWT expiry and expired packets fail', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 });
  let connected, disconnected = 0; const middleware = []; const handlers = new Map();
  server.io = { on: (name, fn) => { connected = fn; } };
  server._registerConnectionHandler();
  const socket = {
    id: 'socket-id', user: { id: 'user-id', expiresAt: 11000 },
    join() {}, use: (fn) => middleware.push(fn),
    on: (name, fn) => { handlers.set(name, [...(handlers.get(name) || []), fn]); },
    conn: { close: () => { disconnected++; } },
  };
  connected(socket); t.mock.timers.tick(1000); assert.equal(disconnected, 1);
  let error; middleware[0]([], (err) => { error = err; }); assert.match(error.message, /AUTH_TOKEN_EXPIRED/);
  for (const fn of handlers.get('disconnect')) fn();
  t.mock.timers.reset();
});
