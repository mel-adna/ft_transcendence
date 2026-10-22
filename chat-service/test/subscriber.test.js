const { test } = require('node:test');
const assert = require('node:assert/strict');
const socketPath = require.resolve('../src/infrastructure/socket/SocketServer');
const repoPath = require.resolve('../src/infrastructure/repositories/UserRepository');
const emitted = [];
require.cache[socketPath] = { id: socketPath, filename: socketPath, loaded: true, exports: { emitToUser: (...args) => emitted.push(args) } };
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: {} };
const subscriber = require('../src/infrastructure/redis/NotificationSubscriber');
test('malformed and non-object JSON cannot escape the subscriber', () => {
  for (const value of ['null', '[]', 'true', '7', '"text"', '{}', '{']) assert.doesNotThrow(() => subscriber._handleMessage(value));
  assert.equal(emitted.length, 0);
});
test('notification broadcast stays local to prevent redis adapter fanout duplicates', () => {
  subscriber._handleMessage(JSON.stringify({ type: 'TASK', action: 'UPDATED', recipientId: 'user-id', eventId: 'event-id' }));
  assert.equal(emitted.length, 1); assert.deepEqual(emitted[0][3], { local: true });
});
