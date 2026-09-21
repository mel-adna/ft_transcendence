const MessageService = require('../../domain/messaging/MessageService');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');

/**
 * EditMessageUseCase
 */
class EditMessageUseCase {
  /**
   * @param {object} params
   * @param {string} params.actorId
   * @param {string} params.messageId
   * @param {string} params.newContent
   * @returns {Promise<object>} broadcast-ready payload
   */
  async execute({ actorId, messageId, newContent }) {
    if (!newContent || newContent.trim().length === 0) {
      throw new Error('MESSAGE_EMPTY_CONTENT');
    }

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
