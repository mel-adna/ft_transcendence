const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        presenceStatus: true,
        lastSeenAt: true,
      },
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
};

module.exports = UserRepository;
