const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * DeleteRoomUseCase
 * Permanently deletes a GROUP room. Only the room OWNER may do this.
 * Messages, memberships and read receipts cascade-delete via the schema.
 *
 * Returns the member ids captured *before* deletion so the interface layer can
 * notify every member (including offline ones) that the room is gone.
 */
class DeleteRoomUseCase {
  /**
   * @param {object} params
   * @param {string} params.actorId - user requesting the deletion
   * @param {string} params.roomId
   * @returns {Promise<{ roomId: string, memberIds: string[] }>}
   */
  async execute({ actorId, roomId }) {
    if (!roomId) throw new Error('ROOM_ID_REQUIRED');

    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    const role = await RoomRepository.getMemberRole(roomId, actorId);
    // Authorization: must be the GROUP owner.
    RoomService.assertCanDeleteRoom(role, room.type);

    // Capture members before the cascade removes them.
    const memberIds = await RoomRepository.getMemberIds(roomId);

    await RoomRepository.delete(roomId);

    return { roomId, memberIds };
  }
}

module.exports = new DeleteRoomUseCase();
