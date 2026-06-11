const MessageRepository = require('../../infrastructure/repositories/MessageRepository');
const MessageService = require('../../domain/messaging/MessageService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * GetThreadRepliesUseCase
 * Returns replies for a parent message (thread).
 */
class GetThreadRepliesUseCase {
  /**
   * @param {object} params
   * @param {string} params.requesterId
   * @param {string} params.parentId
   * @param {number} [params.limit=50]
   */
  async execute({ requesterId, parentId, limit = 50 }) {
    const parent = await MessageRepository.findById(parentId);
    if (!parent) throw new Error('MESSAGE_NOT_FOUND');

    const isMember = await RoomRepository.isMember(parent.roomId, requesterId);
    if (!isMember) throw new Error('THREAD_ACCESS_DENIED');

    const replies = await MessageRepository.findByThread(parentId, { limit });

    return {
      parentId,
      roomId: parent.roomId,
      replies: replies.map((msg) => MessageService.buildBroadcastPayload(msg)),
    };
  }
}

module.exports = new GetThreadRepliesUseCase();
