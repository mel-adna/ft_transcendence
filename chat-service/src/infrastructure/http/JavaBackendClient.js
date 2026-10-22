const JAVA_API_BASE = process.env.JAVA_API_URL ?? 'http://backend:8080/api/v1';

function _fullName(u) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return full || null;
}

async function searchUsersByEmail(email, callerToken) {
  if (!email?.trim() || !callerToken) return [];

  try {
    const res = await fetch(
      `${JAVA_API_BASE}/users/search?email=${encodeURIComponent(email.trim())}`,
      { headers: { Authorization: `Bearer ${callerToken}` }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];

    const users = await res.json();
    return users.map((u) => ({
      id: String(u.id),
      username: _fullName(u) ?? u.email ?? u.id,
      email: u.email ?? null,
      avatarUrl: u.avatarUrl ?? null,
    }));
  } catch {
    return [];
  }
}

async function listAllUsers(callerToken) {
  return searchUsersByEmail('@', callerToken);
}

async function listWorkspaceMemberIds(workspaceId, callerToken) {
  if (!workspaceId || !callerToken) return [];

  try {
    const res = await fetch(`${JAVA_API_BASE}/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${callerToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const members = await res.json();
    return members.map((m) => m.member?.id).filter(Boolean).map(String);
  } catch {
    return [];
  }
}

const VERIFY_TTL_MS = 15_000;
const MAX_VERIFIED = 10_000;
const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;
const verified = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [token, v] of verified) if (v.until <= now) verified.delete(token);
}, 60_000).unref();

function forgetVerifiedUser(userId) {
  for (const [token, v] of verified) if (v.userId === userId) verified.delete(token);
}

async function verifyCurrentIdentity(token, expectedId, { clientIp = null, fresh = false } = {}) {
  if (!fresh) {
    const hit = verified.get(token);
    if (hit && hit.userId === expectedId && hit.until > Date.now()) return;
  }
  try {
    const headers = { Authorization: `Bearer ${token}` };
    if (typeof clientIp === 'string' && IP_RE.test(clientIp)) headers['X-Real-IP'] = clientIp;
    const res = await fetch(`${JAVA_API_BASE}/users/me`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('AUTH_TOKEN_REVOKED');
      throw new Error('AUTH_AUTHORITY_UNAVAILABLE');
    }
    const user = await res.json();
    if (user.id !== expectedId) throw new Error('AUTH_PAYLOAD_INVALID');
    if (verified.size >= MAX_VERIFIED) verified.delete(verified.keys().next().value);
    verified.set(token, { userId: expectedId, until: Date.now() + VERIFY_TTL_MS });
  } catch (err) {
    if (err.message === 'AUTH_TOKEN_REVOKED' || err.message === 'AUTH_PAYLOAD_INVALID') verified.delete(token);
    if (err.message?.startsWith('AUTH_')) throw err;
    throw new Error('AUTH_AUTHORITY_UNAVAILABLE');
  }
}

module.exports = { verifyCurrentIdentity, forgetVerifiedUser, searchUsersByEmail, listAllUsers, listWorkspaceMemberIds };
