const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MESSAGE_SELECT = {
  id: true,
  roomId: true,
  content: true,
  type: true,
  parentId: true,
  isEdited: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  sender: {
    select: {
      id: true,
      username: true,
      avatarUrl: true,
    },
  },
};

/**
 * MessageRepository
 * Isolates all Prisma message operations.
 */
const MessageRepository = {
  /**
   * @param {object} data - { senderId, roomId, content, type, parentId }
   * @returns {Promise<object>}
   */
  async create(data) {
    return prisma.message.create({
      data: {
        senderId: data.senderId,
        roomId: data.roomId,
        content: data.content,
        type: data.type ?? 'TEXT',
        parentId: data.parentId ?? null,
      },
      select: MESSAGE_SELECT,
    });
  },

  /**
   * Cursor-based pagination, newest-first
   * @param {string} roomId
   * @param {{ cursor?: string, limit?: number }} options
   * @returns {Promise<{ messages: object[], nextCursor: string|null }>}
   */
  async findByRoom(roomId, { cursor, limit = 50 } = {}) {
    const take = Math.min(limit, 100); // hard cap

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > take;
    const page = hasMore ? messages.slice(0, take) : messages;

    return {
      messages: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  },

  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return prisma.message.findUnique({
      where: { id },
      select: MESSAGE_SELECT,
    });
  },

  /**
   * @param {string} id
   * @param {string} content
   * @returns {Promise<object>}
   */
  async updateContent(id, content) {
    return prisma.message.update({
      where: { id },
      data: { content, isEdited: true },
      select: MESSAGE_SELECT,
    });
  },

  /**
   * Soft delete
   * @param {string} id
   * @returns {Promise<void>}
   */
  async softDelete(id) {
    await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};

module.exports = MessageRepository;
