const Message = require('../../domain/messaging/Message');
const MessageService = require('../../domain/messaging/MessageService');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');

class EditMessageUseCase {
  async execute({ actorId, messageId, newContent }) {
    Message.validateContent(newContent);
    if (!messageId || typeof messageId !== 'string') throw new Error('MESSAGE_NOT_FOUND');

    const message = await MessageRepository.findById(messageId);
    if (!message) throw new Error('MESSAGE_NOT_FOUND');
    if (message.deletedAt) throw new Error('MESSAGE_DELETED');

    MessageService.assertOwnership(actorId, message);
    MessageService.assertEditable(message.createdAt);

    const updated = await MessageRepository.updateContent(messageId, newContent.trim());
    return MessageService.buildBroadcastPayload(updated);
  }
}

module.exports = new EditMessageUseCase();
