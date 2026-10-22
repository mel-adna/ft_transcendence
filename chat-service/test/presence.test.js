const { test }=require('node:test');
const assert=require('node:assert/strict');
const id=require.resolve('../src/infrastructure/repositories/UserRepository');
let saved;
require.cache[id]={id,filename:id,loaded:true,exports:{updatePresence:async (userId,data) => {saved={userId,...data};}}};
const update=require('../src/application/presence/UpdatePresenceUseCase');
test('online heartbeats persist liveness without changing the presence JSON lastSeen semantics',async () => {
  const before=Date.now(); const result=await update.execute({userId:'user',status:'ONLINE'});
  assert.equal(saved.userId,'user'); assert.equal(saved.presenceStatus,'ONLINE'); assert.ok(saved.lastSeenAt instanceof Date); assert.ok(saved.lastSeenAt.getTime()>=before);
  assert.equal(result.lastSeen,null);
});
test('offline updates preserve the existing last-seen response',async () => {
  const result=await update.execute({userId:'user',status:'OFFLINE'}); assert.equal(result.lastSeen,saved.lastSeenAt.toISOString());
});
