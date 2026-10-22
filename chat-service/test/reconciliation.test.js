const { test } = require('node:test');
const assert = require('node:assert/strict');
const IdentityReconciler = require('../src/infrastructure/socket/IdentityReconciler');
function socket(id, userId) {
  const handlers = new Map();
  return { id, user: { id: userId }, disconnected: 0,
    on: (name, action) => handlers.set(name, action),
    disconnect() { this.disconnected++; handlers.get('disconnect')?.(); } };
}
test('missed revocation is reconciled once per token, without adapter-visible tokens', async () => {
  const checks = []; const reconciler = new IdentityReconciler(async (...args) => { checks.push(args); throw new Error('AUTH_TOKEN_REVOKED'); });
  const first = socket('one','user'), second = socket('two','user');
  reconciler.track(first,'token'); reconciler.track(second,'token');
  await reconciler.reconcile(); assert.deepEqual(checks, [['token','user']]);
  assert.equal(first.disconnected,1); assert.equal(second.disconnected,1); assert.equal(reconciler.sessions.size,0);
  assert.equal(first.data,undefined); reconciler.stop();
});
test('authority outage retains existing sockets and reconciliation never overlaps', async () => {
  let release; let calls=0; const blocked = new Promise((resolve) => { release=resolve; });
  const reconciler = new IdentityReconciler(async () => { calls++; await blocked; throw new Error('AUTH_AUTHORITY_UNAVAILABLE'); });
  const first=socket('one','user'); reconciler.track(first,'token');
  const run = reconciler.reconcile(); await reconciler.reconcile(); assert.equal(calls,1);
  release(); await run; assert.equal(first.disconnected,0); reconciler.stop(); assert.equal(reconciler.sessions.size,0);
});
test('reconciliation bounds concurrent authority requests', async () => {
  let active=0, maximum=0; const reconciler=new IdentityReconciler(async () => { active++; maximum=Math.max(active,maximum); await new Promise((r) => setImmediate(r)); active--; });
  for(let i=0;i<20;i++) reconciler.track(socket(String(i),String(i)),String(i));
  await reconciler.reconcile(); assert.equal(maximum,4); reconciler.stop();
});

test('expiry observed by reconciliation retains transport-level reconnect behavior', async () => {
  const reconciler=new IdentityReconciler(async () => {throw new Error('AUTH_TOKEN_REVOKED');});
  const expired=socket('expired','user'); expired.user.expiresAt=Date.now()-1;
  let closed=0; expired.conn={close() {closed++;}}; reconciler.track(expired,'token');
  await reconciler.reconcile(); assert.equal(closed,1); assert.equal(expired.disconnected,0); reconciler.stop();
});
