const UserRepository = require('../../infrastructure/repositories/UserRepository');
const { listAllUsers } = require('../../infrastructure/http/JavaBackendClient');

/**
 * ListUsersUseCase
 * Returns users available for DM creation (excludes requester).
 *
 * Merges chat-service's local User table (has presence) with the Java
 * backend's account directory, for the same reason SearchUsersUseCase does:
 * a local row only exists once someone has authenticated against THIS
 * service, so anyone who signed up but never opened chat would be missing
 * from the DM picker entirely. Remote-only users are provisioned on the
 * spot, so picking one and calling createDM immediately afterwards finds a
 * real local row instead of failing with ROOM_DM_USER_NOT_FOUND.
 */
class ListUsersUseCase {
  /**
   * @param {string} requesterId
   * @param {string} [callerToken] - forwarded to the Java backend for its own auth
   * @returns {Promise<object[]>}
   */
  async execute(requesterId, callerToken = null) {
    const localUsers = await UserRepository.findAllExcept(requesterId);
    const localIds = new Set(localUsers.map((u) => u.id));

    const remoteUsers = callerToken ? await listAllUsers(callerToken) : [];
    const remoteOnly = remoteUsers.filter(
      (u) => u.id !== requesterId && !localIds.has(u.id),
    );

    const provisioned = await Promise.all(
      remoteOnly.map((u) =>
        UserRepository.ensureFromIdentity({ id: u.id, username: u.username, email: u.email }),
      ),
    );

    return [...localUsers, ...provisioned]
      .map((u) => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl ?? null,
        presenceStatus: u.presenceStatus,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
  }
}

module.exports = new ListUsersUseCase();
