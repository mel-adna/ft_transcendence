const Room = require('../../domain/rooms/Room');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

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
    const roomEntity = Room.create(name, Room.TYPES.GROUP);
    const created = await RoomRepository.create(roomEntity.toCreateInput());
    await RoomRepository.addMember(created.id, creatorId, 'OWNER');

    const candidateIds = [...new Set(memberIds)].filter((id) => id && id !== creatorId);
    let notifyUserIds = [];
    if (candidateIds.length) {
      const users = await UserRepository.findManyByIds(candidateIds);
      for (const user of users) {
        await RoomRepository.addMember(created.id, user.id, 'MEMBER');
      }
      notifyUserIds = users.map((u) => u.id);
    }

    const room = await RoomRepository.findById(created.id);
    return { room: RoomService.buildRoomResponse(room, creatorId), notifyUserIds, requestSentTo: [] };
  }

  async _createDirectRoom(creatorId, targetUserId) {
    if (!targetUserId) throw new Error('ROOM_DM_TARGET_REQUIRED');
    if (targetUserId === creatorId) throw new Error('ROOM_DM_SELF');

    const targetUser = await UserRepository.findById(targetUserId);
    if (!targetUser) throw new Error('ROOM_DM_USER_NOT_FOUND');

    const existing = await RoomRepository.findDMRoom(creatorId, targetUserId);
    if (existing) {
      return { room: RoomService.buildRoomResponse(existing, creatorId), notifyUserIds: [], requestSentTo: [] };
    }

    const dmName = RoomService.getDMRoomName(creatorId, targetUserId);
    const roomEntity = Room.create(dmName, Room.TYPES.DIRECT);
    const created = await RoomRepository.create(roomEntity.toCreateInput());

    await RoomRepository.addMember(created.id, creatorId, 'MEMBER', 'ACCEPTED');
    await RoomRepository.addMember(created.id, targetUserId, 'MEMBER', 'PENDING');

    const room = await RoomRepository.findById(created.id);
    return {
      room: RoomService.buildRoomResponse(room, creatorId),
      notifyUserIds: [],
      requestSentTo: [targetUserId],
    };
  }
}

module.exports = new CreateRoomUseCase();
