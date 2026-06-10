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

  // Auto-join all rooms the user is a member of
  _autoJoinRooms(socket, userId);
}

async function _autoJoinRooms(socket, userId) {
  try {
    const rooms = await RoomRepository.findByUser(userId);
    const roomIds = rooms.map((r) => r.id);

    if (roomIds.length > 0) {
      await socket.join(roomIds);
      console.log(`[chatSocket] userId=${userId} auto-joined ${roomIds.length} room(s)`);
    }

    // Inform client which rooms are active
    socket.emit('chat:rooms_joined', { roomIds });
  } catch (err) {
    console.error(`[chatSocket] Auto-join failed for userId=${userId}:`, err.message);
    socket.emit('chat:error', { code: 'AUTO_JOIN_FAILED', message: err.message });
  }
}

module.exports = registerChatHandlers;
