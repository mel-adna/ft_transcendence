const socketServer = require('../../infrastructure/socket/SocketServer');
const { listWorkspaceMemberIds } = require('../../infrastructure/http/JavaBackendClient');

/** Resources a client is allowed to announce a change to. */
const ALLOWED_RESOURCES = new Set(['workspaces', 'members', 'tasks']);

/** Hard cap so one call can't fan out to an unbounded audience. */
const MAX_TARGETS = 200;

/**
 * notifyController (Interface Layer)
 *
 * Cross-feature realtime relay. Teams, colleagues and tasks live entirely in
 * the Java backend, which has no WebSocket/SSE/Redis of its own — its Spring
 * events never leave the JVM. But every logged-in user already holds a socket
 * to THIS service, so it can act as the delivery channel for changes it
 * doesn't itself own.
 *
 * After a client mutates one of those resources over the Java REST API it
 * POSTs here with the users affected; we push a `data:changed` event to their
 * live sockets so their hooks refetch instead of showing stale data until a
 * manual refresh.
 *
 * This carries no data — only "this resource changed, refetch it". The
 * authoritative read still goes to the Java backend, which re-checks the
 * caller's own permissions, so a spurious notify can at worst cause a
 * needless refetch, never a data leak.
 */
const notifyController = {
  /**
   * POST /api/chat/notify  { resource, userIds[], workspaceId? }
   */
  async notify(req, res) {
    try {
      const { resource, userIds, workspaceId } = req.body ?? {};

      if (!ALLOWED_RESOURCES.has(resource)) {
        return res.status(400).json({ error: 'NOTIFY_INVALID_RESOURCE' });
      }
      if (userIds !== undefined && !Array.isArray(userIds)) {
        return res.status(400).json({ error: 'NOTIFY_INVALID_TARGETS' });
      }
      if (userIds === undefined && !workspaceId) {
        return res.status(400).json({ error: 'NOTIFY_NO_AUDIENCE' });
      }

      // Callers that know exactly who to reach (e.g. the person just added to
      // a team) name them; callers where the audience is "the whole team"
      // (a task move) pass only workspaceId and we resolve it from the Java
      // backend using their own token, so it enforces their access.
      const audience = Array.isArray(userIds)
        ? userIds
        : await listWorkspaceMemberIds(workspaceId, req.user.token);

      // Never echo back to the caller — they already applied the change
      // locally and a refetch would just undo their optimistic update.
      const targets = [...new Set(audience)]
        .filter((id) => typeof id === 'string' && id && id !== req.user.id)
        .slice(0, MAX_TARGETS);

      const payload = { resource, workspaceId: workspaceId ?? null };
      for (const userId of targets) {
        socketServer.emitToUser(userId, 'data:changed', payload);
      }

      return res.json({ ok: true, notified: targets.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};

module.exports = notifyController;
