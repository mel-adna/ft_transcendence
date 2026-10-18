const ReadReceiptRepository = require('../../infrastructure/repositories/ReadReceiptRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');

class MarkAsReadUseCase {
  async execute({ userId, roomId, lastReadMessageId = null }) {
    if (!roomId) throw new Error('ROOM_ID_REQUIRED');

    const isMember = await RoomRepository.isMember(roomId, userId);
    if (!isMember) throw new Error('READ_ACCESS_DENIED');

    if (lastReadMessageId) {
      if (typeof lastReadMessageId !== 'string') throw new Error('READ_MESSAGE_INVALID');
      const message = await MessageRepository.findById(lastReadMessageId);
      if (!message || message.roomId !== roomId) {
        throw new Error('READ_MESSAGE_INVALID');
      }
    }

    const receipt = await ReadReceiptRepository.upsert(roomId, userId, lastReadMessageId);

    return {
      roomId,
      userId,
      lastReadMessageId: receipt.lastReadMessageId,
      readAt: receipt.readAt instanceof Date ? receipt.readAt.toISOString() : receipt.readAt,
    };
  }
}

module.exports = new MarkAsReadUseCase();
