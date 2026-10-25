const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { createClient } = require('redis');
const allowed = process.env.AUDIT_RUNTIME === 'true'
  && process.env.AUDIT_NODE_DB_URL === 'postgresql://audit@127.0.0.1:55439/audit_test?schema=chat';

test('Actual Java/Node/Redis/MinIO and browser Socket.IO protocol compatibility', { skip: !allowed, timeout: 150000 }, async (t) => {
  process.env.DATABASE_URL=process.env.AUDIT_NODE_DB_URL;
  const prisma=require('../../src/infrastructure/database/prismaClient');
  const { io }=require('../../../frontend/node_modules/socket.io-client');
  const core=process.env.AUDIT_RUNTIME_IMAGES === 'true' ? 'http://127.0.0.1:58082/api/v1' : 'http://127.0.0.1:58080/api/v1';
  const chat=process.env.AUDIT_RUNTIME_IMAGES === 'true' ? 'http://127.0.0.1:55006' : 'http://127.0.0.1:55005';
  const redis=createClient({ url:'redis://127.0.0.1:56379' }); redis.on('error',() => {}); await redis.connect();
  const sockets=[];
  const request=async (base,path,{ token,method='GET',body,form }={}) => {
    const response=await fetch(base+path,{ method,signal:AbortSignal.timeout(10000),headers:{ ...(token ? {Authorization:`Bearer ${token}`} : {}),...(body ? {'Content-Type':'application/json'} : {}) },body:form ?? (body ? JSON.stringify(body) : undefined) });
    return { status:response.status,body:await response.json().catch(() => null) };
  };
  async function identity() {
    const id=randomUUID(), email=`runtime-${id}@example.test`, code='812693';
    await prisma.$executeRaw`INSERT INTO public.users(id,email,first_name,last_name,enabled) VALUES (${id}::uuid,${email},'Runtime','Audit',false)`;
    await prisma.$executeRaw`INSERT INTO public.verification_codes(id,user_id,code,expiry_date) VALUES (${randomUUID()}::uuid,${id}::uuid,${createHash('sha256').update(code).digest('hex')},CURRENT_TIMESTAMP + INTERVAL '10 minutes')`;
    const response=await request(core,'/auth/verify-email',{method:'POST',body:{email,code}}); assert.equal(response.status,200);
    return { id,email,...response.body };
  }
  function connect(token,options={}) {
    const socket=io(chat,{auth:{token},transports:['websocket'],reconnection:false,...options}); sockets.push(socket);
    return new Promise((resolve,reject) => { const timer=setTimeout(() => reject(new Error('socket timeout')),10000);
      socket.once('connect',() => {clearTimeout(timer);resolve(socket);});socket.once('connect_error',(error) => {clearTimeout(timer);reject(error);}); });
  }
  function once(socket,event,timeout=10000,accept=() => true) {
    return new Promise((resolve,reject) => {
      const handler=(value) => { if(!accept(value)) return; clearTimeout(timer); socket.off(event,handler); resolve(value); };
      const timer=setTimeout(() => {socket.off(event,handler); reject(new Error(`missing ${event}`));},timeout);
      socket.on(event,handler);
    });
  }
  async function waitForHealth(url) {
    const deadline=Date.now()+30000;
    while(Date.now()<deadline) {
      try { const response=await fetch(url,{signal:AbortSignal.timeout(2000)}); if(response.ok) return; }
      catch { /* Container bootstrap may not be listening yet. */ }
      await new Promise((resolve) => setTimeout(resolve,100));
    }
    throw new Error(`Audit service did not become healthy: ${url}`);
  }
  let first,second,ownerSocket;
  try {
    await waitForHealth(core+'/actuator/health');
    await waitForHealth(chat+'/api/health');
    await t.test('real services start healthy and Java-generated JWT authenticates Node',async () => {
      assert.equal((await request(core,'/actuator/health')).body.status,'UP'); assert.equal((await request(chat,'/api/health')).body.status,'OK');
      first=await identity(); second=await identity();
      assert.equal((await request(core,'/users/me',{token:first.accessToken})).body.id,first.id);
      ownerSocket=await connect(first.accessToken); await connect(second.accessToken);
      assert.equal((await request(chat,'/api/chat/rooms',{token:first.accessToken})).status,200);
    });
    assert.ok(first && second && ownerSocket, 'identity setup must succeed before dependent scenarios');
    await t.test('expired transport reconnects using the latest token getter', {skip: !process.env.AUDIT_JWT_SECRET}, async () => {
      const jwt=require('jsonwebtoken'); const decoded=jwt.decode(second.accessToken,{complete:true});
      const short=jwt.sign({...decoded.payload,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+2},Buffer.from(process.env.AUDIT_JWT_SECRET,'base64'),{algorithm:decoded.header.alg});
      let current=short;
      const socket=await connect(short,{auth:(cb) => cb({token:current}),reconnection:true,reconnectionDelay:50,reconnectionDelayMax:100});
      const reconnected=once(socket,'connect'); current=second.accessToken; await reconnected; assert.equal(socket.connected,true);
      socket.disconnect();
    });
    await t.test('room JSON and Socket.IO send acknowledgement remain compatible',async () => {
      const result=await request(chat,'/api/chat/rooms',{token:first.accessToken,method:'POST',body:{name:`Runtime ${randomUUID()}`,memberIds:[second.id]}});
      assert.equal(result.status,201); assert.equal(result.body.room.members.length,2);
      const ack=await ownerSocket.timeout(5000).emitWithAck('message:send',{roomId:result.body.room.id,content:'runtime compatibility'});
      assert.equal(ack.ok,true); assert.ok(ack.messageId);
      const stored=await prisma.message.findUnique({where:{id:ack.messageId}}); assert.equal(stored.content,'runtime compatibility');
    });
    await t.test('Java task transaction publishes the unchanged custom-channel event through Redis to Socket.IO',async () => {
      const workspace=await request(core,'/workspaces',{token:first.accessToken,method:'POST',body:{name:`Audit ${randomUUID()}`,type:'ORGANIZATION'}}); assert.equal(workspace.status,201);
      await prisma.$executeRaw`INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES (${workspace.body.id}::uuid,${second.id}::uuid,'ADMIN')`;
      const recipient=sockets[1]; const received=once(recipient,'notification:new',10000,(event) => event.type==='TASK' && event.action==='ASSIGNED');
      const [result,event]=await Promise.all([request(core,`/tasks/workspace/${workspace.body.id}`,{token:first.accessToken,method:'POST',body:{title:'Redis contract',priority:'MEDIUM',assigneeId:second.id}}),received]);
      assert.equal(result.status,201);
      assert.equal(event.type,'TASK'); assert.equal(event.action,'ASSIGNED'); assert.equal(event.recipientId,second.id); assert.equal(event.entityId,result.body.id);
      assert.equal(event.payload.taskTitle,'Redis contract');
    });
    await t.test('real avatar replacement uploads and removes the previous MinIO object only after commit',async () => {
      const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
      const upload=async () => { const form=new FormData(); form.append('file',new Blob([png],{type:'image/png'}),'avatar.png'); return request(core,'/users/me/avatar',{token:first.accessToken,method:'POST',form}); };
      const before=await upload(); assert.equal(before.status,200); assert.equal((await fetch(before.body.avatarUrl)).status,200);
      const after=await upload(); assert.equal(after.status,200); assert.notEqual(after.body.avatarUrl,before.body.avatarUrl);
      assert.equal((await fetch(after.body.avatarUrl)).status,200); assert.equal((await fetch(before.body.avatarUrl)).status,404);
    });
    await t.test('missed Pub/Sub security change is reconciled for established sockets',async () => {
      const execFile=require('node:util').promisify(require('node:child_process').execFile);
      const label=await execFile('docker',['inspect','--format','{{index .Config.Labels "teampulse.audit"}}','teampulse-remediation-redis']);
      assert.equal(label.stdout.trim(),'remediation');
      const expectedSubscribers=(await redis.pubSubNumSub('teampulse-audit-events'))['teampulse-audit-events'];
      assert.ok(expectedSubscribers>=1);
      const disconnected=once(ownerSocket,'disconnect',45000);
      await execFile('docker',['stop','-t','1','teampulse-remediation-redis']);
      try {
        await prisma.$executeRaw`UPDATE public.users SET security_version=security_version+1,row_version=row_version+1 WHERE id=${first.id}::uuid`;
        assert.equal(await disconnected,'io server disconnect');
      } finally { await execFile('docker',['start','teampulse-remediation-redis']); }
      await assert.rejects(connect(first.accessToken),/AUTH_TOKEN_REVOKED/);
      while(!redis.isReady) await new Promise((resolve) => setTimeout(resolve,50));
      let allSubscribed=false;
      for(let attempt=0;attempt<200;attempt++) {
        const counts=await redis.pubSubNumSub('teampulse-audit-events'); if(counts['teampulse-audit-events']>=expectedSubscribers) {allSubscribed=true;break;}
        await new Promise((resolve) => setTimeout(resolve,50));
      }
      assert.ok(allSubscribed,'all pre-outage notification subscribers must acknowledge recovery');
      const restored=once(sockets[1],'notification:new',10000,(event) => event.payload?.message==='after reconnect');
      await redis.publish('teampulse-audit-events',JSON.stringify({type:'TASK',action:'UPDATED',recipientId:second.id,entityId:randomUUID(),payload:{message:'after reconnect'}}));
      assert.equal((await restored).payload.message,'after reconnect');
    });
    await t.test('a refreshed Java JWT reconnects and account soft deletion rejects future handshakes',async () => {
      const refreshed=await request(core,'/auth/refresh',{method:'POST',body:{refreshToken:first.refreshToken}}); assert.equal(refreshed.status,200);
      const renewed=await connect(refreshed.body.accessToken); const disconnected=once(renewed,'disconnect');
      const deletion=await request(core,'/users/me',{token:refreshed.body.accessToken,method:'DELETE'}); assert.equal(deletion.status,204);
      await disconnected; await assert.rejects(connect(refreshed.body.accessToken),/AUTH_TOKEN_REVOKED/);
      const rows=await prisma.$queryRaw`SELECT deleted,row_version FROM public.users WHERE id=${first.id}::uuid`;
      assert.equal(rows.length,1); assert.equal(rows[0].deleted,true);
    });
  } finally { for(const socket of sockets) socket.disconnect(); await redis.quit(); await prisma.$disconnect(); }
});
