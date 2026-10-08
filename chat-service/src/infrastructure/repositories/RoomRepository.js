const prisma = require('../database/prismaClient');

const ROOM_SELECT = {
  id: true,
  name: true,
  type: true,
  createdAt: true,
  members: {
    select: {
      userId: true,
      role: true,
      status: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          presenceStatus: true,
        },
      },
    },
  },
};

/**
 * RoomRepository
 * Isolates all Prisma room operations needed by realtime module.
 */
const RoomRepository = {
  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return prisma.room.findUnique({
      where: { id },
      select: ROOM_SELECT,
    });
  },

  /**
   * Rooms a user actively belongs to. Excludes DMs the user was invited to
   * but hasn't accepted yet — those surface separately via
   * findPendingDMRequestsFor until accepted.
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  async findAllForUser(userId) {
    return prisma.room.findMany({
      where: {
        members: { some: { userId, status: 'ACCEPTED' } },
      },
      select: ROOM_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
  },

  /**
   * DM rooms where the user has been invited but hasn't responded yet.
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  async findPendingDMRequestsFor(userId) {
    return prisma.room.findMany({
      where: {
        type: 'DIRECT',
        members: { some: { userId, status: 'PENDING' } },
      },
      select: ROOM_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  },

  /** @deprecated use findAllForUser */
  async findByUser(userId) {
    return this.findAllForUser(userId);
  },

  /**
   * Find existing DIRECT room between exactly two users
   * @param {string} userId1
   * @param {string} userId2
   * @returns {Promise<object|null>}
   */
  async findDMRoom(userId1, userId2) {
    const candidates = await prisma.room.findMany({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: userId1 } } },
          { members: { some: { userId: userId2 } } },
        ],
      },
      select: ROOM_SELECT,
    });

    return candidates.find((room) => room.members.length === 2) ?? null;
  },

  /**
   * @param {{ name: string|null, type: string }} data
   * @returns {Promise<object>}
   */
  async create(data) {
    return prisma.room.create({
      data: {
        name: data.name,
        type: data.type,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });
  },

  /**
   * Upsert room membership
   * @param {string} roomId
   * @param {string} userId
   * @param {string} [role='MEMBER']
   * @param {string} [status='ACCEPTED'] - 'PENDING' for an unconfirmed DM request
   */
  async addMember(roomId, userId, role = 'MEMBER', status = 'ACCEPTED') {
    return prisma.roomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { role, status },
      create: { roomId, userId, role, status },
    });
  },

  /**
   * @param {string} roomId
   * @param {string} userId
   * @param {string} status - 'PENDING' | 'ACCEPTED'
   */
  async setMemberStatus(roomId, userId, status) {
    return prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { status },
    });
  },

  /**
   * @param {string} roomId
   * @param {string} userId
   */
  async removeMember(roomId, userId) {
    return prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  },

  /**
   * @param {string} roomId
   * @returns {Promise<object[]>}
   */
  async getMembers(roomId) {
    return prisma.roomMember.findMany({
      where: { roomId },
      select: {
        userId: true,
        role: true,
        status: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            presenceStatus: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  },

  /**
   * Most recent non-deleted message in a room (for room-list previews).
   * Uses the Message(roomId, createdAt DESC) index.
   * @param {string} roomId
   * @returns {Promise<object|null>}
   */
  async getLastMessage(roomId) {
    return prisma.message.findFirst({
      where: { roomId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        type: true,
        senderId: true,
        createdAt: true,
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  },

  /**
   * Check membership
   * @param {string} roomId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async isMember(roomId, userId) {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return !!member;
  },

  /**
   * A user's role in a room, or null if not a member.
   * @param {string} roomId
   * @param {string} userId
   * @returns {Promise<string|null>}
   */
  async getMemberRole(roomId, userId) {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true },
    });
    return member?.role ?? null;
  },

  /**
   * The ids of every member of a room (for broadcasting room-wide events
   * like deletion to users who may be offline / not in the socket room).
   * @param {string} roomId
   * @returns {Promise<string[]>}
   */
  async getMemberIds(roomId) {
    const members = await prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  },

  /**
   * Delete a room. Messages, memberships and read receipts cascade via the
   * schema's onDelete: Cascade relations.
   * @param {string} roomId
   * @returns {Promise<void>}
   */
  async delete(roomId) {
    await prisma.room.delete({ where: { id: roomId } });
  },
};

module.exports = RoomRepository;
