const GetRoomPresenceUseCase = require('../../application/presence/GetRoomPresenceUseCase');
const UpdatePresenceUseCase = require('../../application/presence/UpdatePresenceUseCase');
const PresenceStatus = require('../../domain/presence/PresenceStatus');
const PresenceService = require('../../domain/presence/PresenceService');
const UserRepository = require('../../infrastructure/repositories/UserRepository');
const registry = require('../../infrastructure/socket/SocketRegistry');

/**
 * presenceHandler (Interface Layer)
 *
 * Socket Events (inbound):
 *   presence:set         { status: 'ONLINE' | 'AWAY' }
 *   presence:heartbeat   (no payload)
 *   presence:subscribe   { roomId }
 *   presence:unsubscribe { roomId }
 *
 * Socket Events (outbound):
 *   presence:update    → room-mates: { userId, status, lastSeen }
 *   presence:snapshot  → subscriber: { roomId, members }
 *   presence:error     → sender only
 */
function registerPresenceHandlers(io, socket) {
  const userId = socket.user.id;

  if (!socket.data.presenceRooms) {
    socket.data.presenceRooms = new Set();
  }

  _broadcastPresence(io, userId, PresenceStatus.ONLINE);

  socket.on('presence:set', async ({ status } = {}) => {
    try {
      const validated = PresenceService.validateStatusChange(status);
      const payload = await UpdatePresenceUseCase.execute({ userId, status: validated });
      await _broadcastPresence(io, userId, validated, payload.lastSeen);
    } catch (err) {
      socket.emit('presence:error', { code: err.message });
    }
  });

  socket.on('presence:heartbeat', async () => {
    try {
      await UpdatePresenceUseCase.execute({
        userId,
        status: PresenceStatus.ONLINE,
        persist: false,
      });
    } catch (err) {
      console.error(`[presenceHandler] heartbeat failed userId=${userId}:`, err.message);
    }
  });

  socket.on('presence:subscribe', async ({ roomId } = {}) => {
    try {
      if (!roomId) throw new Error('ROOM_ID_REQUIRED');

      const members = await GetRoomPresenceUseCase.execute({ roomId, requesterId: userId });
      socket.data.presenceRooms.add(roomId);

      socket.emit('presence:snapshot', { roomId, members });
    } catch (err) {
      socket.emit('presence:error', { code: err.message, event: 'presence:subscribe' });
    }
  });

  socket.on('presence:unsubscribe', ({ roomId } = {}) => {
    if (roomId) socket.data.presenceRooms.delete(roomId);
  });

  socket.on('disconnect', async () => {
    const result = registry.unregister(socket.id);
    if (result?.isLastSocket) {
      try {
        const payload = await UpdatePresenceUseCase.execute({
          userId,
          status: PresenceStatus.OFFLINE,
        });
        await _broadcastPresence(io, userId, PresenceStatus.OFFLINE, payload.lastSeen);
      } catch (err) {
        console.error(`[presenceHandler] Offline update failed for userId=${userId}:`, err.message);
      }
    }
  });
}

async function _broadcastPresence(io, userId, status, lastSeen = null) {
  try {
    const roomIds = await UserRepository.getRoomIds(userId);
    const payload = PresenceService.buildPresencePayload(userId, status, lastSeen);

    for (const roomId of roomIds) {
      io.to(roomId).emit('presence:update', payload);
    }
  } catch (err) {
    console.error(`[presenceHandler] Broadcast failed for userId=${userId}:`, err.message);
  }
}

module.exports = registerPresenceHandlers;
