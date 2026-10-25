const prisma = require('../database/prismaClient');

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  presenceStatus: true,
  lastSeenAt: true,
};

const DELETED_ACCOUNT = { email: { startsWith: 'deleted_' } };

const UserRepository = {
  async ensureFromIdentity({ id, username, email }) {
    const fallbackEmail = email ?? `${id}@unknown.local`;
    const resolvedUsername = username ?? fallbackEmail;
    const isRealName = username && username !== email;

    const existing = await prisma.user.findUnique({ where: { id }, select: { username: true } });
    const shouldUpdateUsername = isRealName || !existing;

    if (email) {
      const holder = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (holder && holder.id !== id) await UserRepository.anonymizeDeletedAccount(holder.id);
    }

    return prisma.user.upsert({
      where: { id },
      update: {
        ...(email ? { email } : {}),
        ...(shouldUpdateUsername ? { username: resolvedUsername } : {}),
      },
      create: {
        id,
        username: resolvedUsername,
        email: fallbackEmail,
        passwordHash: 'external-auth',
      },
      select: USER_PUBLIC_SELECT,
    });
  },

  async authenticate({ id, username, email, sv }) {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { username: true, email: true, securityVersion: true, svSeenAt: true },
    });
    const isRealName = username && username !== email;
    const profileStale = !row || (email && row.email !== email) || (isRealName && row.username !== username);
    if (profileStale) await UserRepository.ensureFromIdentity({ id, username, email });

    const stored = row?.securityVersion ?? 0;
    if (sv === stored) return { revoked: false, raised: false };

    if (sv > stored) {
      const { count } = await prisma.user.updateMany({
        where: { id, securityVersion: { lt: sv } },
        data: { securityVersion: sv, svSeenAt: new Date() },
      });
      if (count > 0) return { revoked: false, raised: true };
      const current = await prisma.user.findUnique({ where: { id }, select: { securityVersion: true } });
      return { revoked: !current || current.securityVersion > sv, raised: false };
    }

    return { revoked: true, raised: false };
  },

  async raiseSecurityVersion(id, sv) {
    const { count } = await prisma.user.updateMany({
      where: { id, securityVersion: { lt: sv } },
      data: { securityVersion: sv, svSeenAt: new Date() },
    });
    return count > 0;
  },

  async anonymizeDeletedAccount(id) {
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { id },
        data: { email: `deleted_${id}@teampulse.local`, username: 'Deleted User' },
      }),
      prisma.message.updateMany({
        where: { senderId: id, deletedAt: null },
        data: { content: '', deletedAt: new Date() },
      }),
    ]);
  },

  async exportChatData(id) {
    const [memberships, messages] = await Promise.all([
      prisma.roomMember.findMany({
        where: { userId: id },
        select: { role: true, status: true, joinedAt: true, room: { select: { id: true, name: true, type: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.message.findMany({
        where: { senderId: id, deletedAt: null },
        select: {
          id: true, content: true, type: true, parentId: true, isEdited: true, createdAt: true, updatedAt: true,
          room: { select: { id: true, name: true, type: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return { memberships, messages };
  },

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });
  },

  async findAllExcept(excludeUserId, { limit = 100 } = {}) {
    return prisma.user.findMany({
      where: { id: { not: excludeUserId }, NOT: DELETED_ACCOUNT },
      select: USER_PUBLIC_SELECT,
      orderBy: { username: 'asc' },
      take: Math.min(limit, 200),
    });
  },

  async searchByUsernameOrEmail(query, { excludeUserId, excludeRoomId, limit = 10 } = {}) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const where = {
      OR: [
        { username: { contains: trimmed, mode: 'insensitive' } },
        { email: { contains: trimmed, mode: 'insensitive' } },
      ],
      NOT: DELETED_ACCOUNT,
    };
    if (excludeUserId) where.id = { not: excludeUserId };
    if (excludeRoomId) where.roomMemberships = { none: { roomId: excludeRoomId } };

    return prisma.user.findMany({
      where,
      select: USER_PUBLIC_SELECT,
      orderBy: { username: 'asc' },
      take: Math.min(limit, 25),
    });
  },

  async findManyByIds(ids) {
    if (!ids.length) return [];
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: USER_PUBLIC_SELECT,
    });
  },

  async updatePresence(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, presenceStatus: true, lastSeenAt: true },
    });
  },

  async getRoomIds(userId) {
    const memberships = await prisma.roomMember.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { roomId: true },
    });
    return memberships.map((m) => m.roomId);
  },

  async getPresenceByRoom(roomId) {
    return prisma.roomMember.findMany({
      where: { roomId, status: 'ACCEPTED' },
      select: {
        userId: true,
        user: {
          select: USER_PUBLIC_SELECT,
        },
      },
    });
  },

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
