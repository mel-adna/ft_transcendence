class RoomService {
  static VALID_TYPES = ['GROUP', 'DIRECT'];

  isValidType(type) {
    return RoomService.VALID_TYPES.includes(type);
  }

  getDMRoomName(uid1, uid2) {
    const [a, b] = [uid1, uid2].sort();
    return `dm:${a}:${b}`;
  }

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

  buildMemberResponse(member) {
    return {
      userId: member.userId,
      role: member.role,
      status: member.status ?? 'ACCEPTED',
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

  isAcceptedMember(userId, room) {
    return !!room.members?.some((m) => m.userId === userId && (m.status ?? 'ACCEPTED') === 'ACCEPTED');
  }

  assertMember(requesterId, room) {
    if (!this.isAcceptedMember(requesterId, room)) {
      throw new Error('ROOM_ACCESS_DENIED');
    }
  }

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
