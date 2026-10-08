/**
 * PresenceStatus
 * Single source of truth for valid status values.
 */
const PresenceStatus = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  AWAY: 'AWAY',

  /**
   * @param {string} value
   * @returns {boolean}
   */
  isValid(value) {
    return [this.ONLINE, this.OFFLINE, this.AWAY].includes(value);
  },
});

module.exports = PresenceStatus;
