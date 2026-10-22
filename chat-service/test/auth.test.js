const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = Buffer.alloc(48, 7).toString('base64');
const repoPath = require.resolve('../src/infrastructure/repositories/UserRepository');
const calls = [];
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true,
  exports: { authenticate: async (identity) => { calls.push(identity); return { revoked: false, raised: false }; } } };
const originalFetch = global.fetch;
let status, identity;
beforeEach(() => {
  calls.length = 0; status = 200; identity = { id: 'user-id' };
  global.fetch = async () => ({ ok: status === 200, status, json: async () => identity });
});
after(() => { global.fetch = originalFetch; });
const auth = require('../src/application/socket/SocketAuthUseCase');
const key = Buffer.from(process.env.JWT_SECRET, 'base64');
const sign = (claims = {}, options = {}) => jwt.sign({ id: 'user-id', sub: 'audit@example.test', sv: 1, ...claims }, key, { expiresIn: 60, ...options });
test('valid token checks authoritative backend and returns expiry', async () => {
  const result = await auth.execute({ token: sign() });
  assert.equal(result.id, 'user-id'); assert.ok(result.expiresAt > Date.now()); assert.equal(calls.length, 1);
});
test('deleted or revoked identity is rejected even when local mirror accepts it', async () => {
  status = 401; await assert.rejects(auth.execute({ token: sign() }), /AUTH_TOKEN_REVOKED/); assert.equal(calls.length, 0);
});
test('identity substitution is rejected', async () => {
  identity = { id: 'other-user' }; await assert.rejects(auth.execute({ token: sign() }), /AUTH_PAYLOAD_INVALID/);
});
test('backend outage fails closed', async () => {
  global.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(auth.execute({ token: sign() }), /AUTH_AUTHORITY_UNAVAILABLE/); assert.equal(calls.length, 0);
});
test('expired JWT is rejected before database work', async () => {
  await assert.rejects(auth.execute({ token: sign({}, { expiresIn: -60 }) }), /AUTH_TOKEN_EXPIRED/); assert.equal(calls.length, 0);
});
test('missing exp is rejected', async () => {
  const token = jwt.sign({ id: 'user-id', sub: 'audit@example.test', sv: 1 }, key);
  await assert.rejects(auth.execute({ token }), /AUTH_PAYLOAD_INVALID/);
});
test('wrong signature is rejected', async () => {
  const token = jwt.sign({ id: 'user-id', sub: 'audit@example.test', sv: 1 }, Buffer.alloc(48, 9), { expiresIn: 60 });
  await assert.rejects(auth.execute({ token }), /AUTH_TOKEN_INVALID/);
});
test('missing security version is rejected', async () => {
  const token = jwt.sign({ id: 'user-id', sub: 'audit@example.test' }, key, { expiresIn: 60 });
  await assert.rejects(auth.execute({ token }), /AUTH_PAYLOAD_INVALID/);
});
