import { getToken } from './api';

/**
 * Cross-feature realtime relay (client side).
 *
 * Teams, colleagues and tasks are served by the Java backend, which has no
 * WebSocket of its own, so a change made by one user never reaches anyone
 * else's open page. Every logged-in user does hold a socket to the chat
 * service though, so after mutating one of those resources we ask it to push
 * a `data:changed` event to the other people affected; their hooks refetch
 * from the Java API instead of showing stale data until a manual refresh.
 *
 * Fire-and-forget by design: the mutation itself already succeeded against
 * the Java backend, so a failure here must never surface as an error. The
 * worst case is the old behaviour — the other user refreshes manually.
 */
const CHAT_API = import.meta.env.VITE_API_URL ?? 'http://localhost:5005/api';

/**
 * @param {'workspaces'|'members'|'tasks'} resource
 * @param {string[]|null} userIds - who should refetch (the caller is filtered
 *   out server-side). Pass null to mean "everyone in workspaceId", which the
 *   chat service resolves from the Java backend.
 * @param {{ workspaceId?: string }} [options]
 */
export function notifyDataChanged(resource, userIds, { workspaceId } = {}) {
  const targets = userIds === null ? null : (userIds ?? []).filter(Boolean);
  if (targets !== null && !targets.length) return;
  if (targets === null && !workspaceId) return;

  const token = getToken();
  if (!token) return;

  fetch(`${CHAT_API}/chat/notify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resource,
      ...(targets === null ? {} : { userIds: targets }),
      workspaceId,
    }),
  }).catch(() => {
    // Chat service down or unreachable — the Java mutation still went
    // through, so stay silent rather than failing the user's action.
  });
}
