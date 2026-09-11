const SendMessageUseCase = require('../../application/messaging/SendMessageUseCase');
const EditMessageUseCase = require('../../application/messaging/EditMessageUseCase');
const DeleteMessageUseCase = require('../../application/messaging/DeleteMessageUseCase');
const MarkAsReadUseCase = require('../../application/messaging/MarkAsReadUseCase');
const GetRoomReadReceiptsUseCase = require('../../application/messaging/GetRoomReadReceiptsUseCase');

/**
 * messageHandler (Interface Layer)
 * Binds socket events to messaging use cases.
 * Zero business logic — input extraction + error handling only.
 *
 * Socket Events (inbound):
 *   message:send    { roomId, content, type?, parentId? }
 *   message:edit    { messageId, newContent }
 *   message:delete  { messageId }
 *   message:read    { roomId, lastReadMessageId? }
 *   read:sync       { roomId }                       (ack → { ok, receipts })
 *
 * Socket Events (outbound):
 *   message:new          → room broadcast
 *   message:updated      → room broadcast
 *   message:deleted      → room broadcast
 *   message:read         → room broadcast { roomId, userId, lastReadMessageId, readAt }
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

      // Broadcast to the room EXCEPT the sender. The sender already renders
      // this message via optimistic append and reconciles it from the ack
      // below — echoing it back would render a duplicate on the sender side.
      socket.to(roomId).emit('message:new', result);

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

  // ─── READ RECEIPT ────────────────────────────────────────────────────────
  socket.on('message:read', async (payload, ack) => {
    try {
      const { roomId, lastReadMessageId } = payload ?? {};

      const result = await MarkAsReadUseCase.execute({
        userId,
        roomId,
        lastReadMessageId,
      });

      io.to(roomId).emit('message:read', result);

      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      _emitError(socket, 'message:read', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ─── READ SYNC (bootstrap all members' read positions on room open) ────────
  socket.on('read:sync', async (payload, ack) => {
    try {
      const { roomId } = payload ?? {};

      const receipts = await GetRoomReadReceiptsUseCase.execute({
        roomId,
        requesterId: userId,
      });

      if (typeof ack === 'function') ack({ ok: true, receipts });
    } catch (err) {
      _emitError(socket, 'read:sync', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });
}

function _emitError(socket, event, err) {
  console.error(`[messageHandler] ${event} failed for userId=${socket.user.id}:`, err.message);
  socket.emit('message:error', { event, code: err.message });
}

module.exports = registerMessageHandlers;
