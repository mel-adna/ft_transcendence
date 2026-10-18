const MessageService = require('../../domain/messaging/MessageService');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');

class DeleteMessageUseCase {
  async execute({ actorId, messageId }) {
    const message = await MessageRepository.findById(messageId);
    if (!message) throw new Error('MESSAGE_NOT_FOUND');
    if (message.deletedAt) throw new Error('MESSAGE_ALREADY_DELETED');

    MessageService.assertOwnership(actorId, message);

    await MessageRepository.softDelete(messageId);

    return { messageId, roomId: message.roomId };
  }
}

module.exports = new DeleteMessageUseCase();
