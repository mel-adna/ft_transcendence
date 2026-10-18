const { toClientCode } = require('../clientError');
const JoinRoomUseCase = require('../../application/rooms/JoinRoomUseCase');
const LeaveRoomUseCase = require('../../application/rooms/LeaveRoomUseCase');

function registerRoomHandlers(io, socket) {
  const userId = socket.user.id;

  socket.on('room:join', async (payload, ack) => {
    try {
      const { roomId } = payload ?? {};
      if (!roomId || typeof roomId !== 'string') throw new Error('ROOM_ID_REQUIRED');

      const result = await JoinRoomUseCase.execute({ userId, roomId, socket });

      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (err) {
      _emitError(socket, 'room:join', err);
      if (typeof ack === 'function') ack({ ok: false, error: toClientCode(err) });
    }
  });

  socket.on('room:leave', async (payload, ack) => {
    try {
      const { roomId } = payload ?? {};
      if (!roomId || typeof roomId !== 'string') throw new Error('ROOM_ID_REQUIRED');

      const result = await LeaveRoomUseCase.execute({ userId, roomId, socket });

      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (err) {
      _emitError(socket, 'room:leave', err);
      if (typeof ack === 'function') ack({ ok: false, error: toClientCode(err) });
    }
  });
}

function _emitError(socket, event, err) {
  console.error(`[roomHandler] ${event} failed for userId=${socket.user.id}:`, err.message);
  socket.emit('room:error', { event, code: toClientCode(err) });
}

module.exports = registerRoomHandlers;
