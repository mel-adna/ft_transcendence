const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const RoomService = require('../../domain/rooms/RoomService');
const ReadReceiptRepository = require('../../infrastructure/repositories/ReadReceiptRepository');

class ListRoomsUseCase {
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
