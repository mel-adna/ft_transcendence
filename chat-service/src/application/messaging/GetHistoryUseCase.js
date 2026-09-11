const MessageRepository = require('../../infrastructure/repositories/MessageRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * GetHistoryUseCase
 * Paginated message history with access control.
 */
class GetHistoryUseCase {
  /**
   * @param {object} params
   * @param {string} params.requesterId
   * @param {string} params.roomId
   * @param {string} [params.cursor]
   * @param {number} [params.limit]
   * @returns {Promise<{ messages: object[], nextCursor: string|null }>}
   */
  async execute({ requesterId, roomId, cursor, limit = 50 }) {
    const isMember = await RoomRepository.isMember(roomId, requesterId);
    if (!isMember) throw new Error('HISTORY_ACCESS_DENIED');

    return MessageRepository.findByRoom(roomId, { cursor, limit });
  }
}

module.exports = new GetHistoryUseCase();
