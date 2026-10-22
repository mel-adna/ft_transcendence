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

const RoomRepository = {
  async findById(id, db = prisma) {
    return db.room.findUnique({
      where: { id },
      select: ROOM_SELECT,
    });
  },

  async findAllForUser(userId) {
    return prisma.room.findMany({
      where: {
        members: { some: { userId, status: 'ACCEPTED' } },
      },
      select: ROOM_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
  },

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

  async findByUser(userId) {
    return this.findAllForUser(userId);
  },

  async findDMRoom(userId1, userId2, db = prisma) {
    const candidates = await db.room.findMany({
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

  async create(data, db = prisma) {
    return db.room.create({
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

  async addMember(roomId, userId, role = 'MEMBER', status = 'ACCEPTED', db = prisma) {
    return db.roomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { role, status },
      create: { roomId, userId, role, status },
    });
  },

  async setMemberStatus(roomId, userId, status) {
    return prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { status },
    });
  },

  async withRoomLock(roomId, action) {
    return prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM "Room" WHERE id = ${roomId} FOR UPDATE`;
      return action(db);
    });
  },

  async withDirectPairLock(first, second, action) {
    const pair = `teampulse:dm:${[first, second].sort().join(':')}`;
    return prisma.$transaction(async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pair}, 0))`;
      return action(db);
    });
  },

  async createWithMembers(data, members, db = prisma) {
    return db.room.create({
      data: { name: data.name, type: data.type, members: { create: members } },
      select: ROOM_SELECT,
    });
  },

  async removeMember(roomId, userId) {
    return this.withRoomLock(roomId, async (db) => {
      const member = await db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
      if (!member || member.status !== 'ACCEPTED') throw new Error('ROOM_NOT_MEMBER');
      if (member.role === 'OWNER') {
        const owners = await db.roomMember.count({ where: { roomId, role: 'OWNER', status: 'ACCEPTED' } });
        if (owners <= 1) throw new Error('ROOM_LAST_OWNER');
      }
      return db.roomMember.delete({ where: { roomId_userId: { roomId, userId } } });
    });
  },

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

  async isMember(roomId, userId, db = prisma) {
    if (typeof roomId !== 'string' || typeof userId !== 'string') return false;
    const member = await db.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { status: true },
    });
    return member?.status === 'ACCEPTED';
  },

  async getMemberRole(roomId, userId) {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true },
    });
    return member?.role ?? null;
  },

  async getMemberIds(roomId) {
    const members = await prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  },

  async delete(roomId) {
    await prisma.room.delete({ where: { id: roomId } });
  },
};

module.exports = RoomRepository;
