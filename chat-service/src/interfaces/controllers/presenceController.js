const { sendHttpError } = require('../clientError');
const GetRoomPresenceUseCase = require('../../application/presence/GetRoomPresenceUseCase');

const STATUS_MAP = {
  ROOM_NOT_FOUND: 404,
  ROOM_ACCESS_DENIED: 403,
};

const presenceController = {
  async getRoomPresence(req, res) {
    try {
      const { roomId } = req.params;
      const members = await GetRoomPresenceUseCase.execute({
        roomId,
        requesterId: req.user.id,
      });
      return res.json({ roomId, members });
    } catch (err) {
      return sendHttpError(res, err, STATUS_MAP);
    }
  },
};

module.exports = presenceController;
