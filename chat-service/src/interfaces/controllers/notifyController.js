const { sendHttpError } = require('../clientError');
const socketServer = require('../../infrastructure/socket/SocketServer');
const { listWorkspaceMemberIds } = require('../../infrastructure/http/JavaBackendClient');

const ALLOWED_RESOURCES = new Set(['workspaces', 'members', 'tasks']);

const MAX_TARGETS = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

function deliver(resource, workspaceId, targets) {
  const payload = { resource, workspaceId };
  for (const userId of targets) {
    socketServer.emitToUser(userId, 'data:changed', payload);
  }
}

async function resolveTargets(req) {
  const { resource, userIds, workspaceId } = req.body ?? {};

  if (!ALLOWED_RESOURCES.has(resource)) return { error: 'NOTIFY_INVALID_RESOURCE' };
  if (userIds !== undefined && (!Array.isArray(userIds) || !userIds.every(isUuid))) {
    return { error: 'NOTIFY_INVALID_TARGETS' };
  }
  if (Array.isArray(userIds) && userIds.length > MAX_TARGETS) return { error: 'NOTIFY_TOO_MANY_TARGETS' };
  if (!workspaceId) return { error: 'NOTIFY_NO_AUDIENCE' };
  if (!isUuid(workspaceId)) return { error: 'NOTIFY_INVALID_WORKSPACE' };

  const roster = new Set(await listWorkspaceMemberIds(workspaceId, req.user.token));
  const wanted = Array.isArray(userIds) ? userIds : [...roster];
  const targets = [...new Set(wanted)]
    .filter((id) => roster.has(id) && id !== req.user.id)
    .slice(0, MAX_TARGETS);

  return { resource, workspaceId, targets };
}

const notifyController = {
  async notify(req, res) {
    try {
      const resolved = await resolveTargets(req);
      if (resolved.error) return res.status(400).json({ error: resolved.error });
      const { resource, workspaceId, targets } = resolved;

      deliver(resource, workspaceId, targets);
      return res.json({ ok: true, notified: targets.length });
    } catch (err) {
      return sendHttpError(res, err);
    }
  },
};

module.exports = notifyController;
