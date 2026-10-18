const TYPING_TIMEOUT_MS = 6000;

function registerTypingHandlers(io, socket) {
  const userId = socket.user.id;
  const username = socket.user.username ?? 'Someone';

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

  const joinedRoom = (payload) => {
    const roomId = payload?.roomId;
    return typeof roomId === 'string' && !roomId.startsWith('user:') && socket.rooms.has(roomId) ? roomId : null;
  };

  socket.on('typing:start', (payload) => {
    try {
      const roomId = joinedRoom(payload);
      if (!roomId) return;
      emitTyping(roomId, true);

      clearTimer(roomId);
      timers.set(
        roomId,
        setTimeout(() => {
          timers.delete(roomId);
          emitTyping(roomId, false);
        }, TYPING_TIMEOUT_MS),
      );
    } catch (err) {
      console.error(`[typingHandler] typing:start failed userId=${userId}:`, err.message);
    }
  });

  socket.on('typing:stop', (payload) => {
    try {
      const roomId = joinedRoom(payload);
      if (!roomId) return;
      clearTimer(roomId);
      emitTyping(roomId, false);
    } catch (err) {
      console.error(`[typingHandler] typing:stop failed userId=${userId}:`, err.message);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId of timers.keys()) {
      emitTyping(roomId, false);
    }
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  });
}

module.exports = registerTypingHandlers;
