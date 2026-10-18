const Room = require('../../domain/rooms/Room');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

const PRIVILEGED_ROLES = ['OWNER', 'ADMIN'];

const MAX_MEMBERS_PER_REQUEST = 100;

class InviteToRoomUseCase {
  async execute({ roomId, inviterId, userIds }) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('ROOM_INVITE_NO_USERS');
    }
    if (userIds.length > MAX_MEMBERS_PER_REQUEST) throw new Error('ROOM_TOO_MANY_MEMBERS');

    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.type !== Room.TYPES.GROUP) throw new Error('ROOM_CANNOT_INVITE_DM');

    const inviter = room.members.find((m) => m.userId === inviterId);
    if (!inviter) throw new Error('ROOM_NOT_MEMBER');
    if (!PRIVILEGED_ROLES.includes(inviter.role)) throw new Error('ROOM_INVITE_FORBIDDEN');

    const existingIds = new Set(room.members.map((m) => m.userId));
    const candidateIds = [...new Set(userIds)].filter(
      (id) => typeof id === 'string' && id && id !== inviterId && !existingIds.has(id),
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
