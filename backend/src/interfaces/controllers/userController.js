const ListUsersUseCase = require('../../application/users/ListUsersUseCase');

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
};

module.exports = userController;
