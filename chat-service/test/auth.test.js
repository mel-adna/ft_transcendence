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
const fetches = [];
beforeEach(() => {
  calls.length = 0; status = 200; identity = { id: 'user-id' };
  fetches.length = 0;
  global.fetch = async (url, init) => { fetches.push(init); return { ok: status === 200, status, json: async () => identity }; };
});
after(() => { global.fetch = originalFetch; });
const auth = require('../src/application/socket/SocketAuthUseCase');
const key = Buffer.from(process.env.JWT_SECRET, 'base64');
let nonce = 0;
const sign = (claims = {}, options = {}) => jwt.sign({ id: 'user-id', sub: 'audit@example.test', sv: 1, n: nonce++, ...claims }, key, { expiresIn: 60, ...options });
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
test('a recent ok is reused for the same token, so java is not called on every request', async () => {
  const token = sign();
  await auth.execute({ token }); await auth.execute({ token });
  assert.equal(fetches.length, 1); assert.equal(calls.length, 2);
});
test('the user ip is forwarded to java so rate limits stay per user', async () => {
  await auth.execute({ token: sign() }, { clientIp: '203.0.113.7' });
  assert.equal(fetches[0].headers['X-Real-IP'], '203.0.113.7');
  await auth.execute({ token: sign() }, { clientIp: 'not an ip' });
  assert.equal(fetches[1].headers['X-Real-IP'], undefined);
});
test('fresh checks skip the cache and forgetting a user drops it', async () => {
  const { verifyCurrentIdentity, forgetVerifiedUser } = require('../src/infrastructure/http/JavaBackendClient');
  const token = sign();
  await verifyCurrentIdentity(token, 'user-id');
  await verifyCurrentIdentity(token, 'user-id', { fresh: true });
  assert.equal(fetches.length, 2);
  forgetVerifiedUser('user-id');
  status = 401;
  await assert.rejects(verifyCurrentIdentity(token, 'user-id'), /AUTH_TOKEN_REVOKED/);
});
