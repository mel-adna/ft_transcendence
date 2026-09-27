import { CHAT_API_BASE, getToken } from './api';

export function notifyDataChanged(resource, userIds, { workspaceId } = {}) {
  const targets = userIds === null ? null : (userIds ?? []).filter(Boolean);
  if (targets !== null && !targets.length) return;
  if (targets === null && !workspaceId) return;

  const token = getToken();
  if (!token) return;

  fetch(`${CHAT_API_BASE}/chat/notify`, {
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
  }).catch(() => {});
}
