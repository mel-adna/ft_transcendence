const UserRepository = require('../../infrastructure/repositories/UserRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const { searchUsersByEmail } = require('../../infrastructure/http/JavaBackendClient');

/**
 * SearchUsersUseCase
 * Finds users by username/email for the invite picker.
 * Excludes the requester and (optionally) members already in a room.
 *
 * Merges two sources: chat-service's local User table (fast, has presence)
 * and the Java backend's /users/search (the real account directory) for
 * anyone who signed up but hasn't opened chat yet and so has no local row.
 * Without the remote fallback, a real account is invisible to this search
 * until its own first chat-service contact auto-provisions it — which the
 * person being invited obviously hasn't done, since they're the one being
 * invited.
 */
class SearchUsersUseCase {
  /**
   * @param {object} params
   * @param {string} params.requesterId
   * @param {string} params.query
   * @param {string|null} [params.excludeRoomId]
   * @param {number} [params.limit]
   * @param {string} [params.callerToken] - forwarded to the Java backend for its own auth
   * @returns {Promise<object[]>}
   */
  async execute({ requesterId, query, excludeRoomId = null, limit = 10, callerToken = null }) {
    if (!query || !query.trim()) return [];

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

    // Provision now, not just display — otherwise selecting this result in
    // the invite picker calls InviteToRoomUseCase with an id that still
    // doesn't exist locally, and the invite silently drops it.
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
        presenceStatus: 'OFFLINE', // never contacted chat-service — no live/persisted presence yet
      })),
    ].slice(0, limit);
  }
}

module.exports = new SearchUsersUseCase();
