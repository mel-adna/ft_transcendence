const prisma = require('../database/prismaClient');

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
    const take = Math.min(limit, 100);

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        parentId: null,
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
   * Thread replies for a parent message
   * @param {string} parentId
   * @param {{ limit?: number }} [options]
   */
  async findByThread(parentId, { limit = 50 } = {}) {
    const take = Math.min(limit, 100);
    return prisma.message.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'asc' },
      take,
    });
  },

  /**
   * Full-text search within a room (case-insensitive)
   * @param {string} roomId
   * @param {string} query
   * @param {number} [limit=20]
   */
  async search(roomId, query, limit = 20) {
    const take = Math.min(limit, 50);
    const trimmed = query.trim();
    if (!trimmed) return [];

    return prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        content: { contains: trimmed, mode: 'insensitive' },
      },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'desc' },
      take,
    });
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
   */
  async softDelete(id) {
    await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  /**
   * Count replies for a parent message
   * @param {string} parentId
   */
  async countReplies(parentId) {
    return prisma.message.count({
      where: { parentId, deletedAt: null },
    });
  },
};

module.exports = MessageRepository;
