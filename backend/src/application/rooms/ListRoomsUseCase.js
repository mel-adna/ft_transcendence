const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const RoomService = require('../../domain/rooms/RoomService');

/**
 * ListRoomsUseCase
 * Returns all rooms the requester belongs to.
 */
class ListRoomsUseCase {
  /**
   * @param {string} requesterId
   * @returns {Promise<object[]>}
   */
  async execute(requesterId) {
    const rooms = await RoomRepository.findAllForUser(requesterId);
    return rooms.map((room) => RoomService.buildRoomResponse(room));
  }
}

module.exports = new ListRoomsUseCase();
