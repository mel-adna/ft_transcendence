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
   * All rooms a user belongs to
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  async findAllForUser(userId) {
    return prisma.room.findMany({
      where: {
        members: { some: { userId } },
      },
      select: ROOM_SELECT,
      orderBy: { updatedAt: 'desc' },
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
   */
  async addMember(roomId, userId, role = 'MEMBER') {
    return prisma.roomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { role },
      create: { roomId, userId, role },
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
};

module.exports = RoomRepository;
