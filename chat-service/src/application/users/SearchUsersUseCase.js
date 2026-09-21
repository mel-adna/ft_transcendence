const UserRepository = require('../../infrastructure/repositories/UserRepository');

/**
 * SearchUsersUseCase
 * Finds users by username/email for the invite picker.
 * Excludes the requester and (optionally) members already in a room.
 */
class SearchUsersUseCase {
  /**
   * @param {object} params
   * @param {string} params.requesterId
   * @param {string} params.query
   * @param {string|null} [params.excludeRoomId]
   * @param {number} [params.limit]
   * @returns {Promise<object[]>}
   */
  async execute({ requesterId, query, excludeRoomId = null, limit = 10 }) {
    if (!query || !query.trim()) return [];

    const users = await UserRepository.searchByUsernameOrEmail(query, {
      excludeUserId: requesterId,
      excludeRoomId,
      limit,
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl ?? null,
      presenceStatus: u.presenceStatus,
    }));
  }
}

module.exports = new SearchUsersUseCase();
