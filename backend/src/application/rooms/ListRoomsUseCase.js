const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const RoomService = require('../../domain/rooms/RoomService');
const ReadReceiptRepository = require('../../infrastructure/repositories/ReadReceiptRepository');

/**
 * ListRoomsUseCase
 * Returns all rooms the requester belongs to, each annotated with the
 * requester's unread message count (drives sidebar badges).
 */
class ListRoomsUseCase {
  /**
   * @param {string} requesterId
   * @returns {Promise<object[]>}
   */
  async execute(requesterId) {
    const rooms = await RoomRepository.findAllForUser(requesterId);

    return Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await ReadReceiptRepository.getUnreadCount(
          room.id,
          requesterId,
        );
        return { ...RoomService.buildRoomResponse(room, requesterId), unreadCount };
      }),
    );
  }
}

module.exports = new ListRoomsUseCase();
