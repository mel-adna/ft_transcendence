const prisma = require('../database/prismaClient');

/**
 * ReadReceiptRepository
 * Isolates all Prisma read-receipt operations.
 * One receipt per (roomId, userId) — the last message the user has read.
 */
const ReadReceiptRepository = {
  /**
   * Upsert the user's read position in a room.
   * @param {string} roomId
   * @param {string} userId
   * @param {string|null} lastReadMessageId
   * @returns {Promise<object>}
   */
  async upsert(roomId, userId, lastReadMessageId = null) {
    const readAt = new Date();
    return prisma.readReceipt.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { lastReadMessageId, readAt },
      create: { roomId, userId, lastReadMessageId, readAt },
    });
  },

  /**
   * @param {string} roomId
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async findForUserRoom(roomId, userId) {
    return prisma.readReceipt.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
  },

  /**
   * All receipts in a room (for rendering per-user read indicators).
   * @param {string} roomId
   * @returns {Promise<object[]>}
   */
  async findByRoom(roomId) {
    return prisma.readReceipt.findMany({
      where: { roomId },
      select: { userId: true, lastReadMessageId: true, readAt: true },
    });
  },

  /**
   * Unread count for a user in a room: messages after their last read time,
   * authored by someone else, not soft-deleted.
   * Backed by the Message(roomId, createdAt DESC) index.
   * @param {string} roomId
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUnreadCount(roomId, userId) {
    const receipt = await this.findForUserRoom(roomId, userId);

    const where = {
      roomId,
      deletedAt: null,
      senderId: { not: userId },
    };
    if (receipt?.readAt) {
      where.createdAt = { gt: receipt.readAt };
    }

    return prisma.message.count({ where });
  },
};

module.exports = ReadReceiptRepository;
