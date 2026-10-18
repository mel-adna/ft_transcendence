const PresenceStatus = require('./PresenceStatus');

class PresenceService {
  onConnect() {
    return PresenceStatus.ONLINE;
  }

  onDisconnect(hasRemainingConnections) {
    return hasRemainingConnections ? PresenceStatus.ONLINE : PresenceStatus.OFFLINE;
  }

  validateStatusChange(requestedStatus) {
    if (!PresenceStatus.isValid(requestedStatus)) {
      throw new Error('INVALID_STATUS');
    }
    if (requestedStatus === PresenceStatus.OFFLINE) {
      throw new Error('CANNOT_MANUALLY_SET_OFFLINE');
    }
    return requestedStatus;
  }

  buildPresencePayload(userId, status, lastSeen = null) {
    return {
      userId,
      status,
      lastSeen: lastSeen instanceof Date ? lastSeen.toISOString() : lastSeen ?? null,
    };
  }

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
