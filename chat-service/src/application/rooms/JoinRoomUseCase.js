const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

class JoinRoomUseCase {
  async execute({ userId, roomId, socket = null, silent = false }) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    if (!RoomService.isAcceptedMember(userId, room)) throw new Error('ROOM_NOT_MEMBER');

    if (socket) {
      await socket.join(roomId);

      if (!silent) {
        const refreshed = await RoomRepository.findById(roomId);
        socket.emit('room:joined', {
          roomId,
          room: RoomService.buildRoomResponse(refreshed),
        });
      }
    }

    const refreshed = await RoomRepository.findById(roomId);
    return {
      roomId,
      room: RoomService.buildRoomResponse(refreshed),
    };
  }
}

module.exports = new JoinRoomUseCase();
