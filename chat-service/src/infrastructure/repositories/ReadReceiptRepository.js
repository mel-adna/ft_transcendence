const prisma = require('../database/prismaClient');

const ReadReceiptRepository = {
  async upsert(roomId, userId, lastReadMessageId = null) {
    const readAt = new Date();
    return prisma.readReceipt.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { lastReadMessageId, readAt },
      create: { roomId, userId, lastReadMessageId, readAt },
    });
  },

  async findForUserRoom(roomId, userId) {
    return prisma.readReceipt.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
  },

  async findByRoom(roomId) {
    return prisma.readReceipt.findMany({
      where: { roomId },
      select: { userId: true, lastReadMessageId: true, readAt: true },
    });
  },

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
