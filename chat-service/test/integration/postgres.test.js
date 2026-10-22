const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const url = process.env.AUDIT_NODE_DB_URL;
const permitted = url === 'postgresql://audit@127.0.0.1:55439/audit_test?schema=chat';

test('PostgreSQL chat concurrency and integrity', { skip: !permitted }, async (t) => {
  process.env.DATABASE_URL = url;
  const prisma = require('../../src/infrastructure/database/prismaClient');
  const rooms = require('../../src/infrastructure/repositories/RoomRepository');
  const create = require('../../src/application/rooms/CreateRoomUseCase');
  const leave = require('../../src/application/rooms/LeaveRoomUseCase');
  const send = require('../../src/application/messaging/SendMessageUseCase');
  const edit = require('../../src/application/messaging/EditMessageUseCase');
  const remove = require('../../src/application/messaging/DeleteMessageUseCase');
  const search = require('../../src/application/users/SearchUsersUseCase');
  async function user() {
    const id = randomUUID(); return prisma.user.create({ data: { id, username: 'Audit', email: `${id}@example.test`, passwordHash: 'test-only' } });
  }
  try {
    await t.test('parallel DM creation produces exactly one complete room', async () => {
      const first = await user(), second = await user();
      const results = await Promise.all(Array.from({ length: 8 }, () => create.execute({ creatorId: first.id, type: 'DIRECT', targetUserId: second.id })));
      assert.equal(new Set(results.map((v) => v.room.id)).size, 1);
      const room = await rooms.findById(results[0].room.id);
      assert.equal(room.members.length, 2); assert.equal(room.members.filter((m) => m.status === 'PENDING').length, 1);
    });
    await t.test('failed nested membership creation rolls back the room', async () => {
      const owner = await user(); const name = `rollback-${randomUUID()}`;
      await assert.rejects(rooms.createWithMembers({ name, type: 'GROUP' }, [
        { userId: owner.id, role: 'OWNER', status: 'ACCEPTED' },
        { userId: randomUUID(), role: 'MEMBER', status: 'ACCEPTED' },
      ]));
      assert.equal(await prisma.room.count({ where: { name } }), 0);
    });
    await t.test('last owner cannot leave but ordinary member can', async () => {
      const owner = await user(), member = await user();
      const { room } = await create.execute({ creatorId: owner.id, type: 'GROUP', name: `owner-${randomUUID()}`, memberIds: [member.id] });
      await assert.rejects(leave.execute({ userId: owner.id, roomId: room.id }), /ROOM_LAST_OWNER/);
      assert.equal(await rooms.isMember(room.id, owner.id), true);
      await leave.execute({ userId: member.id, roomId: room.id }); assert.equal(await rooms.isMember(room.id, member.id), false);
    });
    await t.test('membership removal before queued send prevents insertion', async () => {
      const owner = await user(), member = await user();
      const { room } = await create.execute({ creatorId: owner.id, type: 'GROUP', name: `race-${randomUUID()}`, memberIds: [member.id] });
      const original = rooms.withRoomLock.bind(rooms); let entered; const ready = new Promise((resolve) => { entered = resolve; });
      let pending;
      rooms.withRoomLock = (id, action) => { entered(); return original(id, action); };
      try {
        await prisma.$transaction(async (db) => {
          await db.$queryRaw`SELECT id FROM "Room" WHERE id = ${room.id} FOR UPDATE`;
          pending = send.execute({ senderId: member.id, roomId: room.id, content: 'must not insert' }).then((result) => ({ result }), (error) => ({ error }));
          await ready;
          await db.roomMember.delete({ where: { roomId_userId: { roomId: room.id, userId: member.id } } });
        });
        const outcome = await pending; assert.match(outcome.error.message, /MESSAGE_SENDER_NOT_IN_ROOM/);
        assert.equal(await prisma.message.count({ where: { roomId: room.id } }), 0);
      } finally { rooms.withRoomLock = original; }
    });
    await t.test('message edit/delete races cannot resurrect deleted content', async () => {
      const owner = await user(); const { room } = await create.execute({ creatorId: owner.id, type: 'GROUP', name: `message-${randomUUID()}` });
      const message = await send.execute({ senderId: owner.id, roomId: room.id, content: 'before' });
      const outcomes = await Promise.allSettled([
        edit.execute({ actorId: owner.id, messageId: message.id, newContent: 'after' }),
        remove.execute({ actorId: owner.id, messageId: message.id }),
      ]);
      assert.equal(outcomes[1].status, 'fulfilled');
      const stored = await prisma.message.findUnique({ where: { id: message.id } }); assert.ok(stored.deletedAt);
      await assert.rejects(edit.execute({ actorId: owner.id, messageId: message.id, newContent: 'resurrect' }), /MESSAGE_DELETED/);
    });
    await t.test('room exclusion search rejects nonmembers before directory query', async () => {
      const owner = await user(), attacker = await user(); const { room } = await create.execute({ creatorId: owner.id, type: 'GROUP', name: `private-${randomUUID()}` });
      await assert.rejects(search.execute({ requesterId: attacker.id, query: 'Audit', excludeRoomId: room.id }), /ROOM_ACCESS_DENIED/);
      assert.ok(Array.isArray(await search.execute({ requesterId: owner.id, query: 'Audit', excludeRoomId: room.id })));
    });
  } finally { await prisma.$disconnect(); }
});
