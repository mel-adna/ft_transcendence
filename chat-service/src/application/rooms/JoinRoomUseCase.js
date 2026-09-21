const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * JoinRoomUseCase
 * Re-attaches the caller's socket to a room they are ALREADY a member of
 * (e.g. connect-time auto-join, manual reconnect-sync). This is NOT how a
 * user becomes a member — membership is only granted via CreateRoomUseCase
 * (as creator) or InviteToRoomUseCase (OWNER/ADMIN inviting others). Without
 * the membership check below, any authenticated user could self-join any
 * room — including someone else's DM — just by knowing its id.
 */
class JoinRoomUseCase {
  /**
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.roomId
   * @param {import('socket.io').Socket} [params.socket]
   * @param {boolean} [params.silent=false] - skip room:joined emit (bulk auto-join)
   * @returns {Promise<{ roomId: string, room: object }>}
   */
  async execute({ userId, roomId, socket = null, silent = false }) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    const isMember = room.members?.some((m) => m.userId === userId);
    if (!isMember) throw new Error('ROOM_NOT_MEMBER');

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
