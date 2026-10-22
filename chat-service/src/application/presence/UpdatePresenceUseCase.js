const PresenceService = require('../../domain/presence/PresenceService');
const PresenceStatus = require('../../domain/presence/PresenceStatus');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

class UpdatePresenceUseCase {
  async execute({ userId, status, persist = true }) {
    if (!PresenceStatus.isValid(status)) {
      throw new Error('INVALID_STATUS');
    }

    const seenAt = new Date();
    const lastSeen = status === PresenceStatus.OFFLINE ? seenAt : null;

    if (persist) {
      await UserRepository.updatePresence(userId, {
        presenceStatus: status,
        lastSeenAt: seenAt,
      });
    }

    return PresenceService.buildPresencePayload(userId, status, lastSeen);
  }
}

module.exports = new UpdatePresenceUseCase();
