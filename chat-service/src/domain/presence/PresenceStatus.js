const PresenceStatus = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  AWAY: 'AWAY',

  isValid(value) {
    return [this.ONLINE, this.OFFLINE, this.AWAY].includes(value);
  },
});

module.exports = PresenceStatus;
