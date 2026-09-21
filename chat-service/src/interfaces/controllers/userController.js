const ListUsersUseCase = require('../../application/users/ListUsersUseCase');
const SearchUsersUseCase = require('../../application/users/SearchUsersUseCase');

const userController = {
  /**
   * GET /api/chat/users
   */
  async listUsers(req, res) {
    try {
      const users = await ListUsersUseCase.execute(req.user.id);
      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/chat/users/search?q=&roomId=
   * Search by username/email for the invite picker.
   */
  async searchUsers(req, res) {
    try {
      const { q, roomId } = req.query;
      const users = await SearchUsersUseCase.execute({
        requesterId: req.user.id,
        query: q ?? '',
        excludeRoomId: roomId ?? null,
      });
      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};

module.exports = userController;
