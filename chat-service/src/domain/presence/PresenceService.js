const PresenceStatus = require('./PresenceStatus');

/**
 * PresenceService (Domain)
 * Pure logic — no I/O, no side effects.
 */
class PresenceService {
  onConnect() {
    return PresenceStatus.ONLINE;
  }

  onDisconnect(hasRemainingConnections) {
    return hasRemainingConnections ? PresenceStatus.ONLINE : PresenceStatus.OFFLINE;
  }

  validateStatusChange(requestedStatus) {
    if (!PresenceStatus.isValid(requestedStatus)) {
      throw new Error(`INVALID_STATUS: ${requestedStatus}`);
    }
    if (requestedStatus === PresenceStatus.OFFLINE) {
      throw new Error('CANNOT_MANUALLY_SET_OFFLINE');
    }
    return requestedStatus;
  }

  /**
   * @param {string} userId
   * @param {string} status
   * @param {Date|string|null} [lastSeen] - a Date when called with a fresh
   *   value, but presenceHandler's disconnect path re-broadcasts a payload
   *   that already went through this method once (already an ISO string) —
   *   accept both rather than crashing on .toISOString() of a string.
   */
  buildPresencePayload(userId, status, lastSeen = null) {
    return {
      userId,
      status,
      lastSeen: lastSeen instanceof Date ? lastSeen.toISOString() : lastSeen ?? null,
    };
  }

  /**
   * Merge DB presence with live socket registry for accurate ONLINE status
   * @param {object} user - DB user record
   * @param {boolean} isLiveOnline - from SocketRegistry.isOnline
   * @returns {object}
   */
  resolveStatus(user, isLiveOnline) {
    if (isLiveOnline) {
      return {
        userId: user.id ?? user.userId,
        username: user.username,
        avatarUrl: user.avatarUrl ?? null,
        status: PresenceStatus.ONLINE,
        lastSeen: null,
      };
    }

    return {
      userId: user.id ?? user.userId,
      username: user.username,
      avatarUrl: user.avatarUrl ?? null,
      status: user.presenceStatus ?? PresenceStatus.OFFLINE,
      lastSeen: user.lastSeenAt instanceof Date
        ? user.lastSeenAt.toISOString()
        : user.lastSeenAt ?? null,
    };
  }
}

module.exports = new PresenceService();
