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

async function verifyCurrentIdentity(token, expectedId) {
  try {
    const res = await fetch(`${JAVA_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('AUTH_TOKEN_REVOKED');
      throw new Error('AUTH_AUTHORITY_UNAVAILABLE');
    }
    const user = await res.json();
    if (user.id !== expectedId) throw new Error('AUTH_PAYLOAD_INVALID');
  } catch (err) {
    if (err.message?.startsWith('AUTH_')) throw err;
    throw new Error('AUTH_AUTHORITY_UNAVAILABLE');
  }
}

module.exports = { verifyCurrentIdentity, searchUsersByEmail, listAllUsers, listWorkspaceMemberIds };
