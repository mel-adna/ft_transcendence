const Room = require('../../domain/rooms/Room');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

/**
 * CreateRoomUseCase
 * Creates GROUP channels or DIRECT message rooms (with deduplication).
 */
class CreateRoomUseCase {
  /**
   * @param {object} params
   * @param {string} params.creatorId
   * @param {'GROUP'|'DIRECT'} params.type
   * @param {string} [params.name] - required for GROUP
   * @param {string} [params.targetUserId] - required for DIRECT
   * @param {string[]} [params.memberIds] - initial members to invite (GROUP only)
   * @returns {Promise<object>} room response DTO
   */
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

    // Seed initial members (validated, deduped, creator excluded)
    const candidateIds = [...new Set(memberIds)].filter((id) => id && id !== creatorId);
    if (candidateIds.length) {
      const users = await UserRepository.findManyByIds(candidateIds);
      for (const user of users) {
        await RoomRepository.addMember(created.id, user.id, 'MEMBER');
      }
    }

    const room = await RoomRepository.findById(created.id);
    return RoomService.buildRoomResponse(room);
  }

  async _createDirectRoom(creatorId, targetUserId) {
    if (!targetUserId) throw new Error('ROOM_DM_TARGET_REQUIRED');
    if (targetUserId === creatorId) throw new Error('ROOM_DM_SELF');

    const targetUser = await UserRepository.findById(targetUserId);
    if (!targetUser) throw new Error('ROOM_DM_USER_NOT_FOUND');

    const existing = await RoomRepository.findDMRoom(creatorId, targetUserId);
    if (existing) {
      return RoomService.buildRoomResponse(existing);
    }

    const dmName = RoomService.getDMRoomName(creatorId, targetUserId);
    const roomEntity = Room.create(dmName, Room.TYPES.DIRECT);
    const created = await RoomRepository.create(roomEntity.toCreateInput());

    await RoomRepository.addMember(created.id, creatorId, 'MEMBER');
    await RoomRepository.addMember(created.id, targetUserId, 'MEMBER');

    const room = await RoomRepository.findById(created.id);
    return RoomService.buildRoomResponse(room);
  }
}

module.exports = new CreateRoomUseCase();
