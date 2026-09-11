/**
 * JavaBackendClient
 * Thin client for the one thing chat-service needs from the Java backend
 * outside the JWT contract: looking up real users it hasn't seen yet.
 *
 * chat-service only auto-provisions a local User row when someone
 * authenticates against IT directly (socket connect / REST call). Someone
 * who signed up on the Java side but never opened chat has no local row
 * yet, so they're invisible to the invite picker and to invite-by-id — this
 * client fills that gap by asking the Java backend's own /users/search.
 *
 * Forwards the calling user's own JWT (the endpoint requires auth) rather
 * than holding a service-to-service credential, since every caller here is
 * already an authenticated chat-service request with a token available.
 */
const JAVA_API_BASE = process.env.JAVA_API_URL ?? 'http://backend:8080/api/v1';

/**
 * @param {string} email - partial or full email
 * @param {string} callerToken - the requesting user's own JWT
 * @returns {Promise<Array<{ id: string, username: string, email: string, avatarUrl: string|null }>>}
 */
async function searchUsersByEmail(email, callerToken) {
  if (!email?.trim() || !callerToken) return [];

  try {
    const res = await fetch(
      `${JAVA_API_BASE}/users/search?email=${encodeURIComponent(email.trim())}`,
      { headers: { Authorization: `Bearer ${callerToken}` } },
    );
    if (!res.ok) return [];

    const users = await res.json();
    return users.map((u) => ({
      id: String(u.id),
      username: u.firstName ?? u.email?.split('@')[0] ?? u.id,
      email: u.email ?? null,
      avatarUrl: u.avatarUrl ?? null,
    }));
  } catch {
    // Java backend unreachable/erroring — degrade to "no remote results"
    // rather than failing the whole invite/search request.
    return [];
  }
}

/**
 * Every account in the directory, for pickers that show "everyone" rather
 * than search results (the DM picker).
 *
 * The Java side exposes no list-all endpoint — only /users/search?email=,
 * a case-insensitive substring match that rejects a blank query. Every
 * email contains "@", so searching for it returns the full directory
 * without needing a change on their side.
 *
 * @param {string} callerToken - the requesting user's own JWT
 * @returns {Promise<Array<{ id: string, username: string, email: string, avatarUrl: string|null }>>}
 */
async function listAllUsers(callerToken) {
  return searchUsersByEmail('@', callerToken);
}

/**
 * Member user-ids of a Java-side workspace.
 *
 * Used to resolve the audience for a `data:changed` push when the caller
 * says "this workspace changed" without naming recipients (a task move, for
 * instance, is relevant to the whole team). Called with the requesting
 * user's own token, so the Java backend enforces that they may actually see
 * that workspace's roster.
 *
 * @param {string} workspaceId
 * @param {string} callerToken
 * @returns {Promise<string[]>}
 */
async function listWorkspaceMemberIds(workspaceId, callerToken) {
  if (!workspaceId || !callerToken) return [];

  try {
    const res = await fetch(`${JAVA_API_BASE}/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${callerToken}` },
    });
    if (!res.ok) return [];

    // WorkspaceMemberResponse nests the account under `member`.
    const members = await res.json();
    return members.map((m) => m.member?.id).filter(Boolean).map(String);
  } catch {
    return [];
  }
}

module.exports = { searchUsersByEmail, listAllUsers, listWorkspaceMemberIds };
