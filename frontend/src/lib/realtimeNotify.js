import { CHAT_API_BASE, getToken } from './api';

function postNotify(path, body, signal) {
  const token = getToken();
  if (!token) return null;
  return fetch(`${CHAT_API_BASE}/chat/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
}

function buildBody(resource, userIds, workspaceId) {
  const targets = userIds === null ? null : (userIds ?? []).filter(Boolean);
  if (targets !== null && !targets.length) return null;
  if (!workspaceId) return null;
  return { resource, ...(targets === null ? {} : { userIds: targets }), workspaceId };
}

export function notifyDataChanged(resource, userIds, { workspaceId } = {}) {
  const body = buildBody(resource, userIds, workspaceId);
  if (!body) return;
  postNotify('notify', body)?.catch(() => {});
}

export async function holdDataChanged(resource, userIds, { workspaceId } = {}) {
  const body = buildBody(resource, userIds, workspaceId);
  if (!body) return null;
  try {
    const res = await postNotify('notify', { ...body, hold: true }, AbortSignal.timeout(2000));
    if (!res?.ok) return null;
    const { ticket } = await res.json();
    return ticket ?? null;
  } catch {
    return null;
  }
}

export function releaseDataChanged(ticket) {
  if (!ticket) return;
  postNotify('notify/release', { ticket })?.catch(() => {});
}
