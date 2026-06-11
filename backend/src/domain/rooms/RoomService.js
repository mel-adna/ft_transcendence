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
   * @returns {object}
   */
  buildRoomResponse(room) {
    if (!room) return null;

    return {
      id: room.id,
      name: room.name,
      type: room.type,
      createdAt: room.createdAt instanceof Date
        ? room.createdAt.toISOString()
        : room.createdAt,
      memberCount: room.members?.length ?? undefined,
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
}

module.exports = new RoomService();
