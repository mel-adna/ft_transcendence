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
   * @returns {Promise<{ room: object, notifyUserIds: string[], requestSentTo: string[] }>}
   *   notifyUserIds are OTHER members (never the creator) already joined and
   *   needing a live room:joined push. requestSentTo is only ever populated
   *   for a brand-new DIRECT room — the target hasn't joined anything yet,
   *   they've just received a pending request (see RespondToDMRequestUseCase).
   *   The caller (roomController) is responsible for actually emitting these,
   *   same as InviteToRoomUseCase.
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

  /**
   * Starts a DM as a request: the creator is an ACCEPTED member immediately,
   * the target is PENDING until they respond via RespondToDMRequestUseCase.
   * @returns {Promise<{ room: object, notifyUserIds: string[], requestSentTo: string[] }>}
   *   requestSentTo is who should get the "someone wants to DM you" push —
   *   distinct from notifyUserIds (room:joined, only sent once accepted).
   */
  async _createDirectRoom(creatorId, targetUserId) {
    if (!targetUserId) throw new Error('ROOM_DM_TARGET_REQUIRED');
    if (targetUserId === creatorId) throw new Error('ROOM_DM_SELF');

    const targetUser = await UserRepository.findById(targetUserId);
    if (!targetUser) throw new Error('ROOM_DM_USER_NOT_FOUND');

    const existing = await RoomRepository.findDMRoom(creatorId, targetUserId);
    if (existing) {
      // Already requested or already accepted — nothing new to send either way.
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
