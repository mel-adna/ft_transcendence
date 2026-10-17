const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

class DeleteRoomUseCase {
  async execute({ actorId, roomId }) {
    if (!roomId) throw new Error('ROOM_ID_REQUIRED');

    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    const role = await RoomRepository.getMemberRole(roomId, actorId);
    RoomService.assertCanDeleteRoom(role, room.type);

    const memberIds = await RoomRepository.getMemberIds(roomId);

    await RoomRepository.delete(roomId);

    return { roomId, memberIds };
  }
}

module.exports = new DeleteRoomUseCase();
