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

  /**
   * Search users by username/email for the invite picker.
   * @param {string} query
   * @param {{ roomId?: string }} [opts] - exclude existing members of this room
   */
  searchUsers(query, { roomId } = {}) {
    const params = new URLSearchParams({ q: query });
    if (roomId) params.set('roomId', roomId);
    return request(`/chat/users/search?${params}`, { headers: authHeaders() });
  },

  createGroup(name, memberIds = []) {
    return request('/chat/rooms', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, memberIds }),
    });
  },

  inviteToRoom(roomId, userIds) {
    return request(`/chat/rooms/${roomId}/invite`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userIds }),
    });
  },

  deleteRoom(roomId) {
    return request(`/chat/rooms/${roomId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  leaveRoom(roomId) {
    return request(`/chat/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: authHeaders(),
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
