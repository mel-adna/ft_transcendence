const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5005/api';

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return data;
}

export const chatApi = {
  listRooms() {
    return request('/chat/rooms', { headers: authHeaders() });
  },

  listUsers() {
    return request('/chat/users', { headers: authHeaders() });
  },

  createGroup(name) {
    return request('/chat/rooms', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
  },

  createDM(targetUserId) {
    return request('/chat/rooms/dm', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ targetUserId }),
    });
  },

  getMembers(roomId) {
    return request(`/chat/rooms/${roomId}/members`, { headers: authHeaders() });
  },

  getPresence(roomId) {
    return request(`/chat/rooms/${roomId}/presence`, { headers: authHeaders() });
  },

  getHistory(roomId, { cursor, limit = 50 } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return request(`/chat/rooms/${roomId}/messages?${params}`, { headers: authHeaders() });
  },

  searchMessages(roomId, query, limit = 20) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return request(`/chat/rooms/${roomId}/messages/search?${params}`, { headers: authHeaders() });
  },

  getThread(messageId) {
    return request(`/chat/messages/${messageId}/thread`, { headers: authHeaders() });
  },
};
