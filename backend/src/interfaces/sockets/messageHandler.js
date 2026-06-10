const SendMessageUseCase = require('../../application/messaging/SendMessageUseCase');
const EditMessageUseCase = require('../../application/messaging/EditMessageUseCase');
const DeleteMessageUseCase = require('../../application/messaging/DeleteMessageUseCase');

/**
 * messageHandler (Interface Layer)
 * Binds socket events to messaging use cases.
 * Zero business logic — input extraction + error handling only.
 *
 * Socket Events (inbound):
 *   message:send    { roomId, content, type?, parentId? }
 *   message:edit    { messageId, newContent }
 *   message:delete  { messageId }
 *
 * Socket Events (outbound):
 *   message:new          → room broadcast
 *   message:updated      → room broadcast
 *   message:deleted      → room broadcast
 *   message:error        → sender only
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerMessageHandlers(io, socket) {
  const userId = socket.user.id;

  // ─── SEND ──────────────────────────────────────────────────────────────────
  socket.on('message:send', async (payload, ack) => {
    try {
      const { roomId, content, type, parentId } = payload ?? {};

      const result = await SendMessageUseCase.execute({
        senderId: userId,
        roomId,
        content,
        type,
        parentId,
      });

      // Broadcast to everyone in room (including sender)
      io.to(roomId).emit('message:new', result);

      // Acknowledge sender with message id (for optimistic UI reconciliation)
      if (typeof ack === 'function') ack({ ok: true, messageId: result.id });
    } catch (err) {
      _emitError(socket, 'message:send', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ─── EDIT ──────────────────────────────────────────────────────────────────
  socket.on('message:edit', async (payload, ack) => {
    try {
      const { messageId, newContent } = payload ?? {};

      const result = await EditMessageUseCase.execute({
        actorId: userId,
        messageId,
        newContent,
      });

      io.to(result.roomId).emit('message:updated', result);

      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      _emitError(socket, 'message:edit', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ─── DELETE ────────────────────────────────────────────────────────────────
  socket.on('message:delete', async (payload, ack) => {
    try {
      const { messageId } = payload ?? {};

      const result = await DeleteMessageUseCase.execute({
        actorId: userId,
        messageId,
      });

      io.to(result.roomId).emit('message:deleted', {
        messageId: result.messageId,
        roomId: result.roomId,
      });

      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      _emitError(socket, 'message:delete', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });
}

function _emitError(socket, event, err) {
  console.error(`[messageHandler] ${event} failed for userId=${socket.user.id}:`, err.message);
  socket.emit('message:error', { event, code: err.message });
}

module.exports = registerMessageHandlers;
