const PresenceService = require('../../domain/presence/PresenceService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const RoomService = require('../../domain/rooms/RoomService');
const UserRepository = require('../../infrastructure/repositories/UserRepository');
const registry = require('../../infrastructure/socket/SocketRegistry');

class GetRoomPresenceUseCase {
  async execute({ roomId, requesterId }) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    RoomService.assertMember(requesterId, room);

    const memberships = await UserRepository.getPresenceByRoom(roomId);

    return memberships.map(({ userId, user }) =>
      PresenceService.resolveStatus(
        { ...user, userId },
        registry.isOnline(userId),
      ),
    );
  }
}

module.exports = new GetRoomPresenceUseCase();
