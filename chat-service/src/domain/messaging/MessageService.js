class MessageService {
  assertSenderIsMember(senderId, room) {
    const membership = room.members.find((m) => m.userId === senderId);
    if (!membership) {
      throw new Error('MESSAGE_SENDER_NOT_IN_ROOM');
    }
    if (membership.status && membership.status !== 'ACCEPTED') {
      throw new Error('MESSAGE_SENDER_REQUEST_PENDING');
    }
  }

  assertOwnership(actorId, message) {
    if (message.senderId !== actorId) {
      throw new Error('MESSAGE_NOT_OWNER');
    }
  }

  assertEditable(createdAt) {
    const EDIT_WINDOW_MS = 15 * 60 * 1000;
    if (Date.now() - new Date(createdAt).getTime() > EDIT_WINDOW_MS) {
      throw new Error('MESSAGE_EDIT_WINDOW_EXPIRED');
    }
  }

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
