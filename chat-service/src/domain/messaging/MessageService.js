/**
 * MessageService (Domain)
 * Business rules for messaging — no I/O.
 */
class MessageService {
  /**
   * Verify sender is a member of the room
   * @param {string} senderId
   * @param {object} room - { id, members: Array<{ userId }> }
   */
  assertSenderIsMember(senderId, room) {
    const isMember = room.members.some((m) => m.userId === senderId);
    if (!isMember) {
      throw new Error('MESSAGE_SENDER_NOT_IN_ROOM');
    }
  }

  /**
   * Verify a message belongs to sender before edit/delete
   * @param {string} actorId
   * @param {object} message - { senderId }
   */
  assertOwnership(actorId, message) {
    if (message.senderId !== actorId) {
      throw new Error('MESSAGE_NOT_OWNER');
    }
  }

  /**
   * Check if a message can still be edited (within 15 min window)
   * @param {Date} createdAt
   */
  assertEditable(createdAt) {
    const EDIT_WINDOW_MS = 15 * 60 * 1000;
    if (Date.now() - new Date(createdAt).getTime() > EDIT_WINDOW_MS) {
      throw new Error('MESSAGE_EDIT_WINDOW_EXPIRED');
    }
  }

  /**
   * Build the broadcast payload from a persisted message
   * @param {object} persistedMessage - Prisma message with sender relation
   * @returns {object}
   */
  buildBroadcastPayload(persistedMessage) {
    return {
      id: persistedMessage.id,
      roomId: persistedMessage.roomId,
      content: persistedMessage.content,
      type: persistedMessage.type,
      parentId: persistedMessage.parentId ?? null,
      sender: {
        id: persistedMessage.sender.id,
        username: persistedMessage.sender.username,
        avatarUrl: persistedMessage.sender.avatarUrl ?? null,
      },
      createdAt: persistedMessage.createdAt.toISOString(),
      updatedAt: persistedMessage.updatedAt.toISOString(),
      isEdited: persistedMessage.isEdited,
    };
  }
}

module.exports = new MessageService();
