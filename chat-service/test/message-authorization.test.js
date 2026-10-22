const { test } = require('node:test');
const assert = require('node:assert/strict');
function stub(modulePath, exports) {
  const id = require.resolve(modulePath); require.cache[id] = { id, filename: id, loaded: true, exports };
}
let mutations = 0;
stub('../src/infrastructure/repositories/RoomRepository', { isMember: async () => false, withRoomLock: async (_id, action) => action(undefined) });
stub('../src/infrastructure/repositories/MessageRepository', {
  findById: async () => ({ id: 'message', roomId: 'former-room', senderId: 'author', createdAt: new Date() }),
  updateContent: async () => { mutations++; }, softDelete: async () => { mutations++; },
});
const edit = require('../src/application/messaging/EditMessageUseCase');
const remove = require('../src/application/messaging/DeleteMessageUseCase');
test('former member cannot edit an owned message', async () => {
  await assert.rejects(edit.execute({ actorId: 'author', messageId: 'message', newContent: 'changed' }), /MESSAGE_SENDER_NOT_IN_ROOM/);
  assert.equal(mutations, 0);
});
test('former member cannot delete an owned message', async () => {
  await assert.rejects(remove.execute({ actorId: 'author', messageId: 'message' }), /MESSAGE_SENDER_NOT_IN_ROOM/);
  assert.equal(mutations, 0);
});
