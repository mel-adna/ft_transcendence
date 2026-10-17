const ReadReceiptRepository = require('../../infrastructure/repositories/ReadReceiptRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

class GetRoomReadReceiptsUseCase {
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
