/**
 * typingHandler (Interface Layer)
 * Relays ephemeral typing state between room members. Typing is transient
 * presence — never persisted — so there is no use case; this is pure transport.
 *
 * Socket Events (inbound):
 *   typing:start  { roomId }
 *   typing:stop   { roomId }
 *
 * Socket Events (outbound, to room EXCEPT sender):
 *   typing:update { roomId, userId, username, isTyping }
 *
 * A server-side safety timeout auto-clears a user's "typing" state if no stop
 * arrives (e.g. the sender disconnects mid-type), so peers never get stuck
 * showing a phantom typist.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
const TYPING_TIMEOUT_MS = 6000;

function registerTypingHandlers(io, socket) {
  const userId = socket.user.id;
  const username = socket.user.username ?? 'Someone';

  // roomId -> timeout handle for auto-clear
  const timers = new Map();

  const emitTyping = (roomId, isTyping) => {
    socket.to(roomId).emit('typing:update', { roomId, userId, username, isTyping });
  };

  const clearTimer = (roomId) => {
    const t = timers.get(roomId);
    if (t) {
      clearTimeout(t);
      timers.delete(roomId);
    }
  };

  const stop = (roomId) => {
    if (!roomId) return;
    clearTimer(roomId);
    emitTyping(roomId, false);
  };

  socket.on('typing:start', ({ roomId } = {}) => {
    if (!roomId) return;
    emitTyping(roomId, true);

    // Reset the safety timeout on each keystroke-driven start.
    clearTimer(roomId);
    timers.set(
      roomId,
      setTimeout(() => {
        timers.delete(roomId);
        emitTyping(roomId, false);
      }, TYPING_TIMEOUT_MS),
    );
  });

  socket.on('typing:stop', ({ roomId } = {}) => stop(roomId));

  socket.on('disconnect', () => {
    for (const roomId of timers.keys()) {
      emitTyping(roomId, false);
    }
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  });
}

module.exports = registerTypingHandlers;
