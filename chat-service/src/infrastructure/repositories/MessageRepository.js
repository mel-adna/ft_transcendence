const prisma = require('../database/prismaClient');

const clampTake = (value, fallback, max) =>
  Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;

const MESSAGE_SELECT = {
  id: true,
  roomId: true,
  senderId: true,
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

const MessageRepository = {
  async create(data, db = prisma) {
    return db.message.create({
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

  async findByRoom(roomId, { cursor, limit = 50 } = {}) {
    const take = clampTake(limit, 50, 100);

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        parentId: null,
      },
      select: MESSAGE_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

  async findByThread(parentId, { limit = 50 } = {}) {
    const take = clampTake(limit, 50, 100);
    return prisma.message.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      select: MESSAGE_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
    });
  },

  async search(roomId, query, limit = 20) {
    const take = clampTake(limit, 20, 50);
    const trimmed = query.trim();
    if (!trimmed) return [];

    return prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        content: { contains: trimmed, mode: 'insensitive' },
      },
      select: MESSAGE_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  },

  async findById(id, db = prisma) {
    return db.message.findUnique({
      where: { id },
      select: MESSAGE_SELECT,
    });
  },

  async updateContent(id, content, db = prisma) {
    return db.message.update({
      where: { id },
      data: { content, isEdited: true },
      select: MESSAGE_SELECT,
    });
  },

  async softDelete(id, db = prisma) {
    await db.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async countReplies(parentId) {
    return prisma.message.count({
      where: { parentId, deletedAt: null },
    });
  },
};

module.exports = MessageRepository;
