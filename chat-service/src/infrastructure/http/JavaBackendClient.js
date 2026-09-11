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

module.exports = { searchUsersByEmail };
