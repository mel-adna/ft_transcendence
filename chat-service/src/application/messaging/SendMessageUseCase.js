const Message = require('../../domain/messaging/Message');
const MessageService = require('../../domain/messaging/MessageService');
const MessageRepository = require('../../infrastructure/repositories/MessageRepository');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

class SendMessageUseCase {
  async execute({ senderId, roomId, content, type = 'TEXT', parentId = null }) {
    if (!Message.CLIENT_TYPES.includes(type)) throw new Error('MESSAGE_INVALID_TYPE');
    const message = new Message({ senderId, roomId, content, type, parentId });

    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    MessageService.assertSenderIsMember(senderId, room);

    if (message.parentId) {
      const parent = await MessageRepository.findById(message.parentId);
      if (!parent || parent.roomId !== roomId) throw new Error('MESSAGE_PARENT_INVALID');
    }

    const persisted = await MessageRepository.create(message.toCreateInput());

    return MessageService.buildBroadcastPayload(persisted);
  }
}

module.exports = new SendMessageUseCase();
