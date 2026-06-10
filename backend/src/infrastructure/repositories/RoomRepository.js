const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ROOM_SELECT = {
  id: true,
  name: true,
  type: true,
  createdAt: true,
  members: {
    select: {
      userId: true,
      role: true,
      user: {
        select: { id: true, username: true, avatarUrl: true },
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
   * Find all rooms a user is a member of (for socket room auto-join)
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  async findByUser(userId) {
    return prisma.room.findMany({
      where: {
        members: { some: { userId } },
      },
      select: ROOM_SELECT,
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
