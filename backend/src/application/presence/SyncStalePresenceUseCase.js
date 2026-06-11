const UserRepository = require('../../infrastructure/repositories/UserRepository');

/**
 * SyncStalePresenceUseCase
 * Marks users OFFLINE when lastSeen exceeds threshold.
 */
class SyncStalePresenceUseCase {
  /**
   * @param {number} [staleMinutes=5]
   * @returns {Promise<number>} count of users updated
   */
  async execute(staleMinutes = 5) {
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
    return UserRepository.markStaleOffline(cutoff);
  }
}

module.exports = new SyncStalePresenceUseCase();
