const Room = require('../../domain/rooms/Room');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

class LeaveRoomUseCase {
  async execute({ userId, roomId, socket = null }) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    if (room.type === Room.TYPES.DIRECT) {
      throw new Error('ROOM_CANNOT_LEAVE_DM');
    }

    const isMember = await RoomRepository.isMember(roomId, userId);
    if (!isMember) throw new Error('ROOM_NOT_MEMBER');

    await RoomRepository.removeMember(roomId, userId);

    if (socket) {
      socket.leave(roomId);
      socket.emit('room:left', { roomId });
    }

    return { roomId };
  }
}

module.exports = new LeaveRoomUseCase();
