const Message = require('../../domain/messaging/Message');
const MessageService = require('../../domain/messaging/MessageService');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * SendMessageUseCase
 * Orchestrates: validate → authorize → persist → return broadcast payload
 */
class SendMessageUseCase {
  /**
   * @param {object} params
   * @param {string} params.senderId
   * @param {string} params.roomId
   * @param {string} params.content
   * @param {string} [params.type]
   * @param {string|null} [params.parentId]
   * @returns {Promise<object>} broadcast-ready payload
   */
  async execute({ senderId, roomId, content, type = 'TEXT', parentId = null }) {
    // Domain entity validates input
    const message = new Message({ senderId, roomId, content, type, parentId });

    // Authorization: sender must be in room
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    MessageService.assertSenderIsMember(senderId, room);

    // Persist
    const persisted = await MessageRepository.create(message.toCreateInput());

    // Build broadcast payload
    return MessageService.buildBroadcastPayload(persisted);
  }
}

module.exports = new SendMessageUseCase();
