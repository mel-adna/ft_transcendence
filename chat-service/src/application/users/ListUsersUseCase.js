const UserRepository = require('../../infrastructure/repositories/UserRepository');
const { listAllUsers } = require('../../infrastructure/http/JavaBackendClient');

class ListUsersUseCase {
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
