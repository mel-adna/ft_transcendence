const RoomService = require('./RoomService');

/**
 * Room (Domain Entity)
 * Pure value object — no DB dependency.
 */
class Room {
  static MAX_NAME_LENGTH = 100;

  static TYPES = Object.freeze({
    GROUP: 'GROUP',
    DIRECT: 'DIRECT',
  });

  /**
   * @param {object} props
   * @param {string|null} props.name
   * @param {string} props.type - 'GROUP' | 'DIRECT'
   */
  constructor({ name, type }) {
    this.name = name;
    this.type = type;
  }

  /**
   * Factory with validation
   * @param {string|null|undefined} name
   * @param {string} type
   * @returns {Room}
   */
  static create(name, type) {
    if (!RoomService.isValidType(type)) {
      throw new Error('ROOM_INVALID_TYPE');
    }

    if (type === Room.TYPES.GROUP) {
      if (!name || typeof name !== 'string') {
        throw new Error('ROOM_NAME_REQUIRED');
      }
      const trimmed = name.trim();
      if (trimmed.length === 0) throw new Error('ROOM_NAME_EMPTY');
      if (trimmed.length > Room.MAX_NAME_LENGTH) throw new Error('ROOM_NAME_TOO_LONG');
      return new Room({ name: trimmed, type });
    }

    const trimmedName = name != null && typeof name === 'string' ? name.trim() : null;
    if (trimmedName && trimmedName.length > Room.MAX_NAME_LENGTH) {
      throw new Error('ROOM_NAME_TOO_LONG');
    }

    return new Room({ name: trimmedName || null, type });
  }

  toCreateInput() {
    return {
      name: this.name,
      type: this.type,
    };
  }
}

module.exports = Room;
