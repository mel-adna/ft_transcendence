const UserRepository = require('../../infrastructure/repositories/UserRepository');

class SyncStalePresenceUseCase {
  async execute(staleMinutes = 5) {
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
    return UserRepository.markStaleOffline(cutoff);
  }
}

module.exports = new SyncStalePresenceUseCase();
