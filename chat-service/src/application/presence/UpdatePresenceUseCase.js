const PresenceService = require('../../domain/presence/PresenceService');
const PresenceStatus = require('../../domain/presence/PresenceStatus');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

/**
 * UpdatePresenceUseCase
 * Updates presence in DB and returns payload for broadcast.
 */
class UpdatePresenceUseCase {
  /**
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.status - PresenceStatus value
   * @param {boolean} [params.persist] - write to DB (false for rapid heartbeats)
   * @returns {Promise<object>} presence payload
   */
  async execute({ userId, status, persist = true }) {
    if (!PresenceStatus.isValid(status)) {
      throw new Error(`INVALID_STATUS: ${status}`);
    }

    const lastSeen = status === PresenceStatus.OFFLINE ? new Date() : null;

    if (persist) {
      await UserRepository.updatePresence(userId, {
        presenceStatus: status,
        ...(lastSeen ? { lastSeenAt: lastSeen } : {}),
      });
    }

    return PresenceService.buildPresencePayload(userId, status, lastSeen);
  }
}

module.exports = new UpdatePresenceUseCase();
