const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * JoinRoomUseCase
 * Upserts membership, joins socket room, emits room:joined.
 */
class JoinRoomUseCase {
  /**
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.roomId
   * @param {import('socket.io').Socket} [params.socket]
   * @param {string} [params.role='MEMBER']
   * @param {boolean} [params.silent=false] - skip room:joined emit (bulk auto-join)
   * @returns {Promise<{ roomId: string, room: object }>}
   */
  async execute({ userId, roomId, socket = null, role = 'MEMBER', silent = false }) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    await RoomRepository.addMember(roomId, userId, role);

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
