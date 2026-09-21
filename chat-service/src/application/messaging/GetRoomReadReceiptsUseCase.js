const ReadReceiptRepository = require('../../infrastructure/repositories/ReadReceiptRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * GetRoomReadReceiptsUseCase
 * Returns every member's last-read position in a room so a freshly-opened
 * client can render read indicators for history it loaded over REST.
 */
class GetRoomReadReceiptsUseCase {
  /**
   * @param {object} params
   * @param {string} params.roomId
   * @param {string} params.requesterId
   * @returns {Promise<{ userId: string, lastReadMessageId: string|null, readAt: string|null }[]>}
   */
  async execute({ roomId, requesterId }) {
    if (!roomId) throw new Error('ROOM_ID_REQUIRED');

    const isMember = await RoomRepository.isMember(roomId, requesterId);
    if (!isMember) throw new Error('READ_ACCESS_DENIED');

    const receipts = await ReadReceiptRepository.findByRoom(roomId);
    return receipts.map((r) => ({
      userId: r.userId,
      lastReadMessageId: r.lastReadMessageId,
      readAt: r.readAt instanceof Date ? r.readAt.toISOString() : r.readAt,
    }));
  }
}

module.exports = new GetRoomReadReceiptsUseCase();
