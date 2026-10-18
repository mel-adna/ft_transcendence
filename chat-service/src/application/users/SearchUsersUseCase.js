const UserRepository = require('../../infrastructure/repositories/UserRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const { searchUsersByEmail } = require('../../infrastructure/http/JavaBackendClient');

const MAX_QUERY_LENGTH = 100;

class SearchUsersUseCase {
  async execute({ requesterId, query, excludeRoomId = null, limit = 10, callerToken = null }) {
    if (typeof query !== 'string' || !query.trim()) return [];
    if (query.length > MAX_QUERY_LENGTH) throw new Error('USERS_QUERY_TOO_LONG');
    if (typeof excludeRoomId !== 'string') excludeRoomId = null;

    const localUsers = await UserRepository.searchByUsernameOrEmail(query, {
      excludeUserId: requesterId,
      excludeRoomId,
      limit,
    });

    const localIds = new Set(localUsers.map((u) => u.id));
    let excludeMemberIds = new Set();
    if (excludeRoomId) {
      const room = await RoomRepository.findById(excludeRoomId);
      excludeMemberIds = new Set((room?.members ?? []).map((m) => m.userId));
    }

    const remoteUsers = callerToken ? await searchUsersByEmail(query, callerToken) : [];
    const remoteOnly = remoteUsers.filter(
      (u) => u.id !== requesterId && !localIds.has(u.id) && !excludeMemberIds.has(u.id),
    );

    await Promise.all(
      remoteOnly.map((u) =>
        UserRepository.ensureFromIdentity({ id: u.id, username: u.username, email: u.email }),
      ),
    );

    return [
      ...localUsers.map((u) => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl ?? null,
        presenceStatus: u.presenceStatus,
      })),
      ...remoteOnly.map((u) => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        presenceStatus: 'OFFLINE',
      })),
    ].slice(0, limit);
  }
}

module.exports = new SearchUsersUseCase();
