const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const RoomService = require('../../domain/rooms/RoomService');

class ListPendingDMRequestsUseCase {
  async execute(userId) {
    const rooms = await RoomRepository.findPendingDMRequestsFor(userId);
    return rooms.map((room) => {
      const requester = room.members.find((m) => m.userId !== userId) ?? null;
      return {
        ...RoomService.buildRoomResponse(room, userId),
        requester: requester?.user ?? null,
      };
    });
  }
}

module.exports = new ListPendingDMRequestsUseCase();
