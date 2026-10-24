const { test } = require('node:test');
const assert = require('node:assert/strict');
const repoPath = require.resolve('../src/infrastructure/repositories/UserRepository');
const asked = [];
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: {
  exportChatData: async (id) => {
    asked.push(id);
    const at = new Date('2026-10-23T10:00:00Z');
    return {
      memberships: [
        { role: 'OWNER', status: 'ACCEPTED', joinedAt: at, room: { id: 'r1', name: 'general', type: 'GROUP' } },
        { role: 'MEMBER', status: 'PENDING', joinedAt: at, room: { id: 'r2', name: 'dm:a:b', type: 'DIRECT' } },
      ],
      messages: [{ id: 'm1', content: 'hi', type: 'TEXT', parentId: null, isEdited: false, createdAt: at, updatedAt: at, room: { id: 'r1', name: 'general', type: 'GROUP' } }],
    };
  },
} };
const exportChat = require('../src/application/users/ExportChatDataUseCase');
test('export lists only the caller rooms and messages, without internal dm names', async () => {
  const out = await exportChat.execute({ userId: 'me' });
  assert.deepEqual(asked, ['me']);
  assert.equal(out.rooms.length, 2);
  assert.equal(out.rooms[1].name, null);
  assert.deepEqual(out.messages[0], {
    id: 'm1', room: { id: 'r1', name: 'general', type: 'GROUP' }, content: 'hi', type: 'TEXT',
    replyTo: null, edited: false, sentAt: '2026-10-23T10:00:00.000Z', updatedAt: '2026-10-23T10:00:00.000Z',
  });
});
