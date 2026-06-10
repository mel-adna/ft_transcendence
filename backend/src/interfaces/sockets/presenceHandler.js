const UpdatePresenceUseCase = require('../../application/presence/UpdatePresenceUseCase');
const PresenceStatus = require('../../domain/presence/PresenceStatus');
const PresenceService = require('../../domain/presence/PresenceService');
const UserRepository = require('../../infrastructure/repositories/UserRepository');
const registry = require('../../infrastructure/socket/SocketRegistry');

/**
 * presenceHandler (Interface Layer)
 *
 * Socket Events (inbound):
 *   presence:set     { status: 'ONLINE' | 'AWAY' }
 *   presence:heartbeat  (no payload, keeps ONLINE alive)
 *
 * Socket Events (outbound):
 *   presence:update  → all room-mates: { userId, status, lastSeen }
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerPresenceHandlers(io, socket) {
  const userId = socket.user.id;

  // Announce ONLINE to room-mates on connect
  _broadcastPresence(io, userId, PresenceStatus.ONLINE);

  // ─── MANUAL STATUS CHANGE ─────────────────────────────────────────────────
  socket.on('presence:set', async ({ status } = {}) => {
    try {
      const validated = PresenceService.validateStatusChange(status);
      const payload = await UpdatePresenceUseCase.execute({ userId, status: validated });
      await _broadcastPresence(io, userId, validated, payload.lastSeen);
    } catch (err) {
      socket.emit('presence:error', { code: err.message });
    }
  });

  // ─── HEARTBEAT ────────────────────────────────────────────────────────────
  // Client pings every 30s to stay ONLINE; server-side timeout in 60s window
  socket.on('presence:heartbeat', () => {
    // No-op on server: as long as socket is alive, user is ONLINE
    // Heartbeat is purely to let clients detect stale connections
  });

  // ─── DISCONNECT ───────────────────────────────────────────────────────────
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

/**
 * Broadcast presence to all room-mates of the user
 * Scoped: only users sharing at least one room receive the event
 */
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
