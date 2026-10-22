const MessageService = require('../../domain/messaging/MessageService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');

class DeleteMessageUseCase {
  async execute({ actorId, messageId }) {
    if (!messageId || typeof messageId !== 'string') throw new Error('MESSAGE_NOT_FOUND');
    const initial = await MessageRepository.findById(messageId);
    if (!initial) throw new Error('MESSAGE_NOT_FOUND');
    return RoomRepository.withRoomLock(initial.roomId, async (db) => {
      const message = await MessageRepository.findById(messageId, db);
      if (!message) throw new Error('MESSAGE_NOT_FOUND');
      if (message.deletedAt) throw new Error('MESSAGE_ALREADY_DELETED');

      MessageService.assertOwnership(actorId, message);
      if (!await RoomRepository.isMember(message.roomId, actorId, db)) throw new Error('MESSAGE_SENDER_NOT_IN_ROOM');

      await MessageRepository.softDelete(messageId, db);

      return { messageId, roomId: message.roomId };
    });
  }
}

module.exports = new DeleteMessageUseCase();
