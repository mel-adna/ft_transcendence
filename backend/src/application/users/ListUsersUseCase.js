const UserRepository = require('../../infrastructure/repositories/UserRepository');

/**
 * ListUsersUseCase
 * Returns users available for DM creation (excludes requester).
 */
class ListUsersUseCase {
  /**
   * @param {string} requesterId
   * @returns {Promise<object[]>}
   */
  async execute(requesterId) {
    const users = await UserRepository.findAllExcept(requesterId);
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl ?? null,
      presenceStatus: u.presenceStatus,
    }));
  }
}

module.exports = new ListUsersUseCase();
