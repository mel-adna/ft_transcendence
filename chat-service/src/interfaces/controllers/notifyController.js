const { sendHttpError } = require('../clientError');
const socketServer = require('../../infrastructure/socket/SocketServer');
const { listWorkspaceMemberIds } = require('../../infrastructure/http/JavaBackendClient');

const ALLOWED_RESOURCES = new Set(['workspaces', 'members', 'tasks']);

const MAX_TARGETS = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

const notifyController = {
  async notify(req, res) {
    try {
      const { resource, userIds, workspaceId } = req.body ?? {};

      if (!ALLOWED_RESOURCES.has(resource)) {
        return res.status(400).json({ error: 'NOTIFY_INVALID_RESOURCE' });
      }
      if (userIds !== undefined && (!Array.isArray(userIds) || !userIds.every(isUuid))) {
        return res.status(400).json({ error: 'NOTIFY_INVALID_TARGETS' });
      }
      if (Array.isArray(userIds) && userIds.length > MAX_TARGETS) {
        return res.status(400).json({ error: 'NOTIFY_TOO_MANY_TARGETS' });
      }
      if (!workspaceId) {
        return res.status(400).json({ error: 'NOTIFY_NO_AUDIENCE' });
      }
      if (!isUuid(workspaceId)) {
        return res.status(400).json({ error: 'NOTIFY_INVALID_WORKSPACE' });
      }

      const audience = Array.isArray(userIds)
        ? userIds
        : await listWorkspaceMemberIds(workspaceId, req.user.token);

      const targets = [...new Set(audience)]
        .filter((id) => typeof id === 'string' && id && id !== req.user.id)
        .slice(0, MAX_TARGETS);

      const payload = { resource, workspaceId: workspaceId ?? null };
      for (const userId of targets) {
        socketServer.emitToUser(userId, 'data:changed', payload);
      }

      return res.json({ ok: true, notified: targets.length });
    } catch (err) {
      return sendHttpError(res, err);
    }
  },
};

module.exports = notifyController;
