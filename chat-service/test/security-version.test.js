const { test } = require('node:test');
const assert = require('node:assert/strict');
const prismaPath = require.resolve('../src/infrastructure/database/prismaClient');
let updates = 0, reads = 0, race = false;
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: {
  user: {
    findUnique: async () => ({ username: 'Audit', email: 'audit@example.test', securityVersion: race && ++reads === 1 ? 1 : 5, svSeenAt: new Date(1000) }),
    updateMany: async () => { updates++; return { count: race ? 0 : 1 }; },
  },
} };
const users = require('../src/infrastructure/repositories/UserRepository');
test('later iat cannot downgrade stored security version', async () => {
  const result = await users.authenticate({ id: 'user-id', username: 'Audit', email: 'audit@example.test', sv: 4, issuedAtMs: Date.now() });
  assert.equal(result.revoked, true); assert.equal(updates, 0);
});

test('a concurrent version increase cannot turn a failed raise into successful authentication', async () => {
  race=true; reads=0;
  const result=await users.authenticate({ id:'user-id',username:'Audit',email:'audit@example.test',sv:2 });
  assert.equal(result.revoked,true); assert.equal(result.raised,false);
});
