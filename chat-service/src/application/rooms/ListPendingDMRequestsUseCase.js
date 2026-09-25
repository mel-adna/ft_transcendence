const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const RoomService = require('../../domain/rooms/RoomService');

/**
 * ListPendingDMRequestsUseCase
 * DM requests sent to this user that they haven't accepted or rejected yet.
 */
class ListPendingDMRequestsUseCase {
  /**
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
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
