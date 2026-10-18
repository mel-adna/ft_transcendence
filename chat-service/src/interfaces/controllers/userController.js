const { sendHttpError } = require('../clientError');
const ListUsersUseCase = require('../../application/users/ListUsersUseCase');
const SearchUsersUseCase = require('../../application/users/SearchUsersUseCase');

const userController = {
  async listUsers(req, res) {
    try {
      const users = await ListUsersUseCase.execute(req.user.id, req.user.token);
      return res.json({ users });
    } catch (err) {
      return sendHttpError(res, err);
    }
  },

  async searchUsers(req, res) {
    try {
      const { q, roomId } = req.query;
      const users = await SearchUsersUseCase.execute({
        requesterId: req.user.id,
        query: q ?? '',
        excludeRoomId: roomId ?? null,
        callerToken: req.user.token,
      });
      return res.json({ users });
    } catch (err) {
      return sendHttpError(res, err, { USERS_QUERY_TOO_LONG: 400 });
    }
  },
};

module.exports = userController;
