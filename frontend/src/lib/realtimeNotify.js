import { CHAT_API_BASE, getToken } from './api';
import { socketClient } from '../infrastructure/socket/SocketClient';

function postNotify(path, body) {
  const token = getToken();
  if (!token) return null;
  return fetch(`${CHAT_API_BASE}/chat/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
  const socketId = socketClient.isConnected() ? socketClient.getSocket().id : undefined;
  postNotify('notify', { ...body, socketId })?.catch(() => {});
}
