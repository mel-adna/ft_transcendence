const Room = require('../../domain/rooms/Room');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * LeaveRoomUseCase
 * Removes membership, leaves socket room, emits room:left.
 */
class LeaveRoomUseCase {
  /**
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.roomId
   * @param {import('socket.io').Socket} [params.socket]
   * @returns {Promise<{ roomId: string }>}
   */
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
