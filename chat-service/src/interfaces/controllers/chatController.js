const GetHistoryUseCase = require('../../application/messaging/GetHistoryUseCase');
const SearchMessagesUseCase = require('../../application/messaging/SearchMessagesUseCase');
const GetThreadRepliesUseCase = require('../../application/messaging/GetThreadRepliesUseCase');

const STATUS_MAP = {
  HISTORY_ACCESS_DENIED: 403,
  SEARCH_ACCESS_DENIED: 403,
  SEARCH_QUERY_REQUIRED: 400,
  SEARCH_QUERY_TOO_SHORT: 400,
  THREAD_ACCESS_DENIED: 403,
  MESSAGE_NOT_FOUND: 404,
  ROOM_NOT_FOUND: 404,
};

/**
 * chatController (Interface Layer)
 * REST endpoints for chat messages.
 */
const chatController = {
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
      return _handleError(res, err);
    }
  },

  async searchMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { q, limit } = req.query;

      const result = await SearchMessagesUseCase.execute({
        requesterId: req.user.id,
        roomId,
        query: q ?? '',
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return res.json(result);
    } catch (err) {
      return _handleError(res, err);
    }
  },

  async getThread(req, res) {
    try {
      const { messageId } = req.params;

      const result = await GetThreadRepliesUseCase.execute({
        requesterId: req.user.id,
        parentId: messageId,
      });

      return res.json(result);
    } catch (err) {
      return _handleError(res, err);
    }
  },
};

function _handleError(res, err) {
  const status = STATUS_MAP[err.message] ?? 500;
  return res.status(status).json({ error: err.message });
}

module.exports = chatController;
