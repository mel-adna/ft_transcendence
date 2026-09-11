const MessageRepository = require('../../infrastructure/repositories/MessageRepository');
const MessageService = require('../../domain/messaging/MessageService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * SearchMessagesUseCase
 * Full-text search within a room the requester belongs to.
 */
class SearchMessagesUseCase {
  /**
   * @param {object} params
   * @param {string} params.requesterId
   * @param {string} params.roomId
   * @param {string} params.query
   * @param {number} [params.limit=20]
   */
  async execute({ requesterId, roomId, query, limit = 20 }) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('SEARCH_QUERY_REQUIRED');
    }
    if (query.trim().length < 2) {
      throw new Error('SEARCH_QUERY_TOO_SHORT');
    }

    const isMember = await RoomRepository.isMember(roomId, requesterId);
    if (!isMember) throw new Error('SEARCH_ACCESS_DENIED');

    const results = await MessageRepository.search(roomId, query, limit);

    return {
      messages: results.map((msg) => MessageService.buildBroadcastPayload(msg)),
    };
  }
}

module.exports = new SearchMessagesUseCase();
