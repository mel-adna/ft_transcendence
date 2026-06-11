const prisma = require('../database/prismaClient');

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  presenceStatus: true,
  lastSeenAt: true,
};

/**
 * UserRepository
 * Isolates all Prisma user operations needed by realtime module.
 */
const UserRepository = {
  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });
  },

  /**
   * List users except requester (for DM picker)
   * @param {string} excludeUserId
   * @param {{ limit?: number }} [options]
   */
  async findAllExcept(excludeUserId, { limit = 100 } = {}) {
    return prisma.user.findMany({
      where: { id: { not: excludeUserId } },
      select: USER_PUBLIC_SELECT,
      orderBy: { username: 'asc' },
      take: Math.min(limit, 200),
    });
  },

  /**
   * Bulk fetch by ids
   * @param {string[]} ids
   */
  async findManyByIds(ids) {
    if (!ids.length) return [];
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: USER_PUBLIC_SELECT,
    });
  },

  /**
   * Update presence fields
   * @param {string} id
   * @param {{ presenceStatus?: string, lastSeenAt?: Date }} data
   */
  async updatePresence(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, presenceStatus: true, lastSeenAt: true },
    });
  },

  /**
   * Get all roomIds a user belongs to (for presence broadcast scoping)
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async getRoomIds(userId) {
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    return memberships.map((m) => m.roomId);
  },

  /**
   * Presence snapshot for all members of a room
   * @param {string} roomId
   */
  async getPresenceByRoom(roomId) {
    return prisma.roomMember.findMany({
      where: { roomId },
      select: {
        userId: true,
        user: {
          select: USER_PUBLIC_SELECT,
        },
      },
    });
  },

  /**
   * Mark stale AWAY users as OFFLINE after timeout
   * @param {Date} cutoff
   */
  async markStaleOffline(cutoff) {
    const result = await prisma.user.updateMany({
      where: {
        presenceStatus: { in: ['ONLINE', 'AWAY'] },
        lastSeenAt: { lt: cutoff },
      },
      data: { presenceStatus: 'OFFLINE' },
    });
    return result.count;
  },
};

module.exports = UserRepository;
