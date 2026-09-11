const GetRoomPresenceUseCase = require('../../application/presence/GetRoomPresenceUseCase');

const STATUS_MAP = {
  ROOM_NOT_FOUND: 404,
  ROOM_ACCESS_DENIED: 403,
};

const presenceController = {
  /**
   * GET /api/chat/rooms/:roomId/presence
   */
  async getRoomPresence(req, res) {
    try {
      const { roomId } = req.params;
      const members = await GetRoomPresenceUseCase.execute({
        roomId,
        requesterId: req.user.id,
      });
      return res.json({ roomId, members });
    } catch (err) {
      const status = STATUS_MAP[err.message] ?? 500;
      return res.status(status).json({ error: err.message });
    }
  },
};

module.exports = presenceController;
