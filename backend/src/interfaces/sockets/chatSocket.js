const JoinRoomUseCase = require('../../application/rooms/JoinRoomUseCase');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');

/**
 * chatSocket (Interface Layer)
 * Handles: room auto-join on connect, room-level error events.
 * NO business logic here — delegates to use cases only.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerChatHandlers(io, socket) {
  const userId = socket.user.id;
  _autoJoinRooms(socket, userId);
}

async function _autoJoinRooms(socket, userId) {
  try {
    const rooms = await RoomRepository.findAllForUser(userId);
    const roomIds = [];

    for (const room of rooms) {
      await JoinRoomUseCase.execute({
        userId,
        roomId: room.id,
        socket,
        silent: true,
      });
      roomIds.push(room.id);
    }

    if (roomIds.length > 0) {
      console.log(`[chatSocket] userId=${userId} auto-joined ${roomIds.length} room(s)`);
    }

    socket.emit('chat:rooms_joined', { roomIds });
  } catch (err) {
    console.error(`[chatSocket] Auto-join failed for userId=${userId}:`, err.message);
    socket.emit('chat:error', { code: 'AUTO_JOIN_FAILED', message: err.message });
  }
}

module.exports = registerChatHandlers;
