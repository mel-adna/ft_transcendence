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
  async findById(id) {
    return prisma.room.findUnique({
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

  async addMember(roomId, userId, role = 'MEMBER', status = 'ACCEPTED') {
    return prisma.roomMember.upsert({
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

  async removeMember(roomId, userId) {
    return prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } },
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

  async isMember(roomId, userId) {
    if (typeof roomId !== 'string' || typeof userId !== 'string') return false;
    const member = await prisma.roomMember.findUnique({
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
