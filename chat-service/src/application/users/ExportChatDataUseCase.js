const UserRepository = require('../../infrastructure/repositories/UserRepository');

const roomOf = (room) => ({ id: room.id, name: room.type === 'DIRECT' ? null : room.name, type: room.type });

class ExportChatDataUseCase {
  async execute({ userId }) {
    const { memberships, messages } = await UserRepository.exportChatData(userId);
    return {
      exportedAt: new Date().toISOString(),
      rooms: memberships.map((m) => ({
        ...roomOf(m.room),
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt.toISOString(),
      })),
      messages: messages.map((m) => ({
        id: m.id,
        room: roomOf(m.room),
        content: m.content,
        type: m.type,
        replyTo: m.parentId ?? null,
        edited: m.isEdited,
        sentAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
    };
  }
}

module.exports = new ExportChatDataUseCase();
