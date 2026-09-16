/**
 * RoomService (Domain)
 * Business rules for rooms — no I/O.
 */
class RoomService {
  static VALID_TYPES = ['GROUP', 'DIRECT'];

  /**
   * @param {string} type
   * @returns {boolean}
   */
  isValidType(type) {
    return RoomService.VALID_TYPES.includes(type);
  }

  /**
   * Canonical internal name for a DM room (deterministic regardless of order)
   * @param {string} uid1
   * @param {string} uid2
   * @returns {string}
   */
  getDMRoomName(uid1, uid2) {
    const [a, b] = [uid1, uid2].sort();
    return `dm:${a}:${b}`;
  }

  /**
   * @param {object} room - Prisma room with optional members
   * @param {string|null} [requesterId] - when given, includes the requester's
   *   own role in the room as `myRole` so clients can gate owner-only actions
   *   without scanning the members array.
   * @returns {object}
   */
  buildRoomResponse(room, requesterId = null) {
    if (!room) return null;

    const myRole =
      requesterId && room.members
        ? room.members.find((m) => m.userId === requesterId)?.role ?? null
        : undefined;

    return {
      id: room.id,
      name: room.name,
      type: room.type,
      createdAt: room.createdAt instanceof Date
        ? room.createdAt.toISOString()
        : room.createdAt,
      memberCount: room.members?.length ?? undefined,
      myRole,
      members: room.members
        ? room.members.map((m) => this.buildMemberResponse(m))
        : undefined,
    };
  }

  /**
   * @param {object} member
   * @returns {object}
   */
  buildMemberResponse(member) {
    return {
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt instanceof Date
        ? member.joinedAt.toISOString()
        : member.joinedAt,
      user: member.user
        ? {
            id: member.user.id,
            username: member.user.username,
            avatarUrl: member.user.avatarUrl ?? null,
            presenceStatus: member.user.presenceStatus ?? null,
          }
        : undefined,
    };
  }

  /**
   * Assert requester is a member before returning room data
   * @param {string} requesterId
   * @param {object} room
   */
  assertMember(requesterId, room) {
    const isMember = room.members?.some((m) => m.userId === requesterId);
    if (!isMember) {
      throw new Error('ROOM_ACCESS_DENIED');
    }
  }

  /**
   * Only the OWNER of a GROUP room may delete it. DIRECT rooms have no owner
   * and cannot be deleted this way.
   * @param {string} requesterRole - the requester's role in the room, or null
   * @param {string} roomType
   */
  assertCanDeleteRoom(requesterRole, roomType) {
    if (roomType !== 'GROUP') {
      throw new Error('ROOM_NOT_DELETABLE');
    }
    if (requesterRole !== 'OWNER') {
      throw new Error('ROOM_DELETE_FORBIDDEN');
    }
  }
}

module.exports = new RoomService();
