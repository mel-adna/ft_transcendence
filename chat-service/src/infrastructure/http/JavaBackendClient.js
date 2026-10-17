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
      { headers: { Authorization: `Bearer ${callerToken}` } },
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
    });
    if (!res.ok) return [];

    const members = await res.json();
    return members.map((m) => m.member?.id).filter(Boolean).map(String);
  } catch {
    return [];
  }
}

module.exports = { searchUsersByEmail, listAllUsers, listWorkspaceMemberIds };
