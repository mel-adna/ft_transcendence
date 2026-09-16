const Room = require('../../domain/rooms/Room');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

const PRIVILEGED_ROLES = ['OWNER', 'ADMIN'];

/**
 * InviteToRoomUseCase
 * An OWNER/ADMIN adds other users to a GROUP room.
 * DB-only — realtime side-effects (socket join + notify) are handled by the caller.
 */
class InviteToRoomUseCase {
  /**
   * @param {object} params
   * @param {string} params.roomId
   * @param {string} params.inviterId
   * @param {string[]} params.userIds
   * @returns {Promise<{ room: object, invitedUserIds: string[] }>}
   */
  async execute({ roomId, inviterId, userIds }) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('ROOM_INVITE_NO_USERS');
    }

    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.type !== Room.TYPES.GROUP) throw new Error('ROOM_CANNOT_INVITE_DM');

    const inviter = room.members.find((m) => m.userId === inviterId);
    if (!inviter) throw new Error('ROOM_NOT_MEMBER');
    if (!PRIVILEGED_ROLES.includes(inviter.role)) throw new Error('ROOM_INVITE_FORBIDDEN');

    // Drop the inviter and anyone already in the room, then keep only real users.
    const existingIds = new Set(room.members.map((m) => m.userId));
    const candidateIds = [...new Set(userIds)].filter(
      (id) => id && id !== inviterId && !existingIds.has(id),
    );

    const users = await UserRepository.findManyByIds(candidateIds);
    const invitedUserIds = users.map((u) => u.id);

    for (const userId of invitedUserIds) {
      await RoomRepository.addMember(roomId, userId, 'MEMBER');
    }

    const updated = await RoomRepository.findById(roomId);
    return {
      room: RoomService.buildRoomResponse(updated),
      invitedUserIds,
    };
  }
}

module.exports = new InviteToRoomUseCase();
