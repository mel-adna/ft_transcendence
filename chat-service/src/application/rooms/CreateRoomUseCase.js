const Room = require('../../domain/rooms/Room');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

const MAX_MEMBERS_PER_REQUEST = 100;

class CreateRoomUseCase {
  async execute({ creatorId, type, name, targetUserId, memberIds = [] }) {
    if (type === Room.TYPES.DIRECT) {
      return this._createDirectRoom(creatorId, targetUserId);
    }

    if (type === Room.TYPES.GROUP) {
      return this._createGroupRoom(creatorId, name, memberIds);
    }

    throw new Error('ROOM_INVALID_TYPE');
  }

  async _createGroupRoom(creatorId, name, memberIds = []) {
    if (memberIds.length > MAX_MEMBERS_PER_REQUEST) throw new Error('ROOM_TOO_MANY_MEMBERS');
    const roomEntity = Room.create(name, Room.TYPES.GROUP);
    const candidateIds = [...new Set(memberIds)].filter((id) => typeof id === 'string' && id && id !== creatorId);
    const users = candidateIds.length ? await UserRepository.findManyByIds(candidateIds) : [];
    const room = await RoomRepository.createWithMembers(roomEntity.toCreateInput(), [
      { userId: creatorId, role: 'OWNER', status: 'ACCEPTED' },
      ...users.map((user) => ({ userId: user.id, role: 'MEMBER', status: 'ACCEPTED' })),
    ]);
    return { room: RoomService.buildRoomResponse(room, creatorId), notifyUserIds: users.map((u) => u.id), requestSentTo: [] };
  }

  async _createDirectRoom(creatorId, targetUserId) {
    if (!targetUserId || typeof targetUserId !== 'string') throw new Error('ROOM_DM_TARGET_REQUIRED');
    if (targetUserId === creatorId) throw new Error('ROOM_DM_SELF');

    const targetUser = await UserRepository.findById(targetUserId);
    if (!targetUser) throw new Error('ROOM_DM_USER_NOT_FOUND');

    return RoomRepository.withDirectPairLock(creatorId, targetUserId, async (db) => {
      const existing = await RoomRepository.findDMRoom(creatorId, targetUserId, db);
      if (existing) {
        return { room: RoomService.buildRoomResponse(existing, creatorId), notifyUserIds: [], requestSentTo: [] };
      }
      const entity = Room.create(RoomService.getDMRoomName(creatorId, targetUserId), Room.TYPES.DIRECT);
      const room = await RoomRepository.createWithMembers(entity.toCreateInput(), [
        { userId: creatorId, role: 'MEMBER', status: 'ACCEPTED' },
        { userId: targetUserId, role: 'MEMBER', status: 'PENDING' },
      ], db);
      return { room: RoomService.buildRoomResponse(room, creatorId), notifyUserIds: [], requestSentTo: [targetUserId] };
    });
  }
}

module.exports = new CreateRoomUseCase();
