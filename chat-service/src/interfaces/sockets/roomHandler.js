const JoinRoomUseCase = require('../../application/rooms/JoinRoomUseCase');
const LeaveRoomUseCase = require('../../application/rooms/LeaveRoomUseCase');

/**
 * roomHandler (Interface Layer)
 * Binds socket events to room use cases.
 *
 * Socket Events (inbound):
 *   room:join   { roomId }
 *   room:leave  { roomId }
 *
 * Socket Events (outbound):
 *   room:joined  → sender only (via JoinRoomUseCase)
 *   room:left    → sender only (via LeaveRoomUseCase)
 *   room:error   → sender only
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerRoomHandlers(io, socket) {
  const userId = socket.user.id;

  socket.on('room:join', async (payload, ack) => {
    try {
      const { roomId } = payload ?? {};
      if (!roomId) throw new Error('ROOM_ID_REQUIRED');

      const result = await JoinRoomUseCase.execute({ userId, roomId, socket });

      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (err) {
      _emitError(socket, 'room:join', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  socket.on('room:leave', async (payload, ack) => {
    try {
      const { roomId } = payload ?? {};
      if (!roomId) throw new Error('ROOM_ID_REQUIRED');

      const result = await LeaveRoomUseCase.execute({ userId, roomId, socket });

      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (err) {
      _emitError(socket, 'room:leave', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });
}

function _emitError(socket, event, err) {
  console.error(`[roomHandler] ${event} failed for userId=${socket.user.id}:`, err.message);
  socket.emit('room:error', { event, code: err.message });
}

module.exports = registerRoomHandlers;
