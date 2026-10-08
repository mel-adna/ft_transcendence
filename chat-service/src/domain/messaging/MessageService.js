/**
 * MessageService (Domain)
 * Business rules for messaging — no I/O.
 */
class MessageService {
  /**
   * Verify sender is a full (ACCEPTED) member of the room — the target side
   * of a pending DM request has a row but can't message until they accept.
   * @param {string} senderId
   * @param {object} room - { id, members: Array<{ userId, status }> }
   */
  assertSenderIsMember(senderId, room) {
    const membership = room.members.find((m) => m.userId === senderId);
    if (!membership) {
      throw new Error('MESSAGE_SENDER_NOT_IN_ROOM');
    }
    if (membership.status && membership.status !== 'ACCEPTED') {
      throw new Error('MESSAGE_SENDER_REQUEST_PENDING');
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
