const MessageService = require('../../domain/messaging/MessageService');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');

/**
 * DeleteMessageUseCase
 * Soft-deletes a message. Broadcast tells clients to remove/redact it.
 */
class DeleteMessageUseCase {
  /**
   * @param {object} params
   * @param {string} params.actorId
   * @param {string} params.messageId
   * @returns {Promise<{ messageId: string, roomId: string }>}
   */
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
