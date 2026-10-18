const MessageRepository = require('../../infrastructure/repositories/MessageRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

class GetHistoryUseCase {
  async execute({ requesterId, roomId, cursor, limit = 50 }) {
    if (cursor !== undefined && typeof cursor !== 'string') throw new Error('HISTORY_INVALID_CURSOR');
    const isMember = await RoomRepository.isMember(roomId, requesterId);
    if (!isMember) throw new Error('HISTORY_ACCESS_DENIED');

    return MessageRepository.findByRoom(roomId, { cursor, limit });
  }
}

module.exports = new GetHistoryUseCase();
