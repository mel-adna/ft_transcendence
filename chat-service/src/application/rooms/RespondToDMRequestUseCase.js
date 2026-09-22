const Room = require('../../domain/rooms/Room');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * RespondToDMRequestUseCase
 * The invited side of a DM request accepts or rejects it.
 * ACCEPT flips their membership to ACCEPTED (room becomes usable for both).
 * REJECT deletes the room outright — a DM has exactly two members, so once
 * one declines there is nothing left worth keeping.
 */
class RespondToDMRequestUseCase {
  /**
   * @param {object} params
   * @param {string} params.roomId
   * @param {string} params.userId - the invited user responding
   * @param {'ACCEPT'|'REJECT'} params.action
   * @returns {Promise<{ action: 'ACCEPT'|'REJECT', room: object|null, requesterId: string|null }>}
   */
  async execute({ roomId, userId, action }) {
    if (action !== 'ACCEPT' && action !== 'REJECT') {
      throw new Error('DM_REQUEST_INVALID_ACTION');
    }

    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.type !== Room.TYPES.DIRECT) throw new Error('DM_REQUEST_NOT_A_DM');

    const membership = room.members.find((m) => m.userId === userId);
    if (!membership) throw new Error('ROOM_NOT_MEMBER');
    if (membership.status !== 'PENDING') throw new Error('DM_REQUEST_NOT_PENDING');

    const requester = room.members.find((m) => m.userId !== userId) ?? null;

    if (action === 'REJECT') {
      await RoomRepository.delete(roomId);
      return { action, room: null, requesterId: requester?.userId ?? null };
    }

    await RoomRepository.setMemberStatus(roomId, userId, 'ACCEPTED');
    const updated = await RoomRepository.findById(roomId);
    return {
      action,
      room: RoomService.buildRoomResponse(updated, userId),
      requesterId: requester?.userId ?? null,
    };
  }
}

module.exports = new RespondToDMRequestUseCase();
