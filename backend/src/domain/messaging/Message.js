/**
 * Message (Domain Entity)
 * Pure value object — no DB dependency.
 * Validates and normalizes message data before persistence.
 */
class Message {
  static MAX_CONTENT_LENGTH = 4000;

  /**
   * @param {object} props
   * @param {string} props.senderId
   * @param {string} props.roomId
   * @param {string} props.content
   * @param {string} [props.type] - 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
   * @param {string|null} [props.parentId] - for replies/threads
   */
  constructor({ senderId, roomId, content, type = 'TEXT', parentId = null }) {
    this._validate({ senderId, roomId, content, type });
    this.senderId = senderId;
    this.roomId = roomId;
    this.content = content.trim();
    this.type = type;
    this.parentId = parentId;
  }

  _validate({ senderId, roomId, content, type }) {
    if (!senderId) throw new Error('MESSAGE_MISSING_SENDER');
    if (!roomId) throw new Error('MESSAGE_MISSING_ROOM');
    if (!content || typeof content !== 'string') throw new Error('MESSAGE_INVALID_CONTENT');
    if (content.trim().length === 0) throw new Error('MESSAGE_EMPTY_CONTENT');
    if (content.length > Message.MAX_CONTENT_LENGTH) throw new Error('MESSAGE_TOO_LONG');
    if (!['TEXT', 'IMAGE', 'FILE', 'SYSTEM'].includes(type)) throw new Error('MESSAGE_INVALID_TYPE');
  }

  toCreateInput() {
    return {
      senderId: this.senderId,
      roomId: this.roomId,
      content: this.content,
      type: this.type,
      parentId: this.parentId,
    };
  }
}

module.exports = Message;
