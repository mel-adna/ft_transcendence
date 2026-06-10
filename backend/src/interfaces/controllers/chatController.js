const GetHistoryUseCase = require('../../application/messaging/GetHistoryUseCase');

/**
 * chatController (Interface Layer)
 * REST endpoints for chat — history pagination only.
 * WebSocket handles all realtime operations.
 */
const chatController = {
  /**
   * GET /api/chat/rooms/:roomId/messages?cursor=&limit=
   */
  async getHistory(req, res) {
    try {
      const { roomId } = req.params;
      const { cursor, limit } = req.query;
      const requesterId = req.user.id;

      const result = await GetHistoryUseCase.execute({
        requesterId,
        roomId,
        cursor: cursor ?? undefined,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      return res.json(result);
    } catch (err) {
      const statusMap = {
        HISTORY_ACCESS_DENIED: 403,
        ROOM_NOT_FOUND: 404,
      };
      const status = statusMap[err.message] ?? 500;
      return res.status(status).json({ error: err.message });
    }
  },
};

module.exports = chatController;
