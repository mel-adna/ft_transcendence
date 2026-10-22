const { test } = require('node:test');
const assert = require('node:assert/strict');
const dbId = require.resolve('../src/infrastructure/database/prismaClient');
const presenceId = require.resolve('../src/application/presence/SyncStalePresenceUseCase');
require.cache[presenceId] = { id:presenceId,filename:presenceId,loaded:true,exports:{} };
function lifecycle(disconnect) {
  require.cache[dbId] = { id:dbId,filename:dbId,loaded:true,exports:{ $disconnect:disconnect } };
  const id=require.resolve('../src/infrastructure/lifecycle/serverLifecycle'); delete require.cache[id]; return require(id);
}
test('shutdown closes sockets before waiting for HTTP drain and runs once', async () => {
  const order=[]; let httpClosed; const exits=[];
  const service=lifecycle(async () => { order.push('database'); });
  const server={ close(cb) { order.push('http-start'); httpClosed=cb; }, closeIdleConnections() { order.push('idle'); } };
  const sockets={ async shutdown() { order.push('sockets'); httpClosed(); } };
  const subscriber={ async stop() { order.push('subscriber'); } };
  const first=service.gracefulShutdown(server,sockets,null,subscriber,{ exit:(code) => exits.push(code) });
  assert.equal(service.gracefulShutdown(server,sockets),first); await first;
  assert.deepEqual(exits,[0]); assert.ok(order.indexOf('sockets') < order.indexOf('database')); assert.ok(order.includes('subscriber'));
});
test('shutdown deadline forces termination when socket cleanup never resolves', async (t) => {
  t.mock.timers.enable({ apis:['setTimeout'] }); const exits=[]; let forced=0;
  const service=lifecycle(async () => {});
  const result=service.gracefulShutdown({ close() {}, closeAllConnections() { forced++; } },{ shutdown:() => new Promise(() => {}) },null,null,{ timeoutMs:100,exit:(code) => exits.push(code) });
  t.mock.timers.tick(100); await result; assert.deepEqual(exits,[1]); assert.equal(forced,1); t.mock.timers.reset();
});
test('cleanup failure still attempts subscriber, HTTP and database cleanup', async () => {
  let stopped=0,disconnected=0; const exits=[];
  const service=lifecycle(async () => { disconnected++; });
  await service.gracefulShutdown({ close(cb) { cb(); } },{ async shutdown() { throw new Error('test'); } },null,{ async stop() { stopped++; } },{ exit:(code) => exits.push(code) });
  assert.equal(stopped,1); assert.equal(disconnected,1); assert.deepEqual(exits,[1]);
});
