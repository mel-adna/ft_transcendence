const PresenceStatus = require('./PresenceStatus');

/**
 * PresenceService (Domain)
 * Pure logic — no I/O, no side effects.
 * Determines presence transitions and last-seen updates.
 */
class PresenceService {
  /**
   * Compute status after a connection event
   * @param {boolean} wasOnline
   * @returns {string}
   */
  onConnect(wasOnline) {
    return PresenceStatus.ONLINE;
  }

  /**
   * Compute status after a disconnection event
   * @param {boolean} hasRemainingConnections
   * @returns {string}
   */
  onDisconnect(hasRemainingConnections) {
    return hasRemainingConnections ? PresenceStatus.ONLINE : PresenceStatus.OFFLINE;
  }

  /**
   * Validate a manual status change request
   * @param {string} requestedStatus
   * @returns {string} validated status
   */
  validateStatusChange(requestedStatus) {
    if (!PresenceStatus.isValid(requestedStatus)) {
      throw new Error(`INVALID_STATUS: ${requestedStatus}`);
    }
    // Cannot manually set to OFFLINE — only disconnect does that
    if (requestedStatus === PresenceStatus.OFFLINE) {
      throw new Error('CANNOT_MANUALLY_SET_OFFLINE');
    }
    return requestedStatus;
  }

  /**
   * Build a presence payload for broadcast
   * @param {string} userId
   * @param {string} status
   * @param {Date|null} lastSeen
   * @returns {object}
   */
  buildPresencePayload(userId, status, lastSeen = null) {
    return {
      userId,
      status,
      lastSeen: lastSeen ? lastSeen.toISOString() : null,
    };
  }
}

module.exports = new PresenceService();
