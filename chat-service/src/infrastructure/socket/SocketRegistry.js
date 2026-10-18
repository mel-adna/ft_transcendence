class SocketRegistry {
  constructor() {
    this._userToSockets = new Map();
    this._socketToUser = new Map();
  }

  register(userId, socketId) {
    if (!this._userToSockets.has(userId)) {
      this._userToSockets.set(userId, new Set());
    }
    this._userToSockets.get(userId).add(socketId);
    this._socketToUser.set(socketId, userId);
  }

  unregister(socketId) {
    const userId = this._socketToUser.get(socketId);
    if (!userId) return null;

    this._socketToUser.delete(socketId);
    const sockets = this._userToSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this._userToSockets.delete(userId);
        return { userId, isLastSocket: true };
      }
    }
    return { userId, isLastSocket: false };
  }

  getUserId(socketId) {
    return this._socketToUser.get(socketId);
  }

  getSocketIds(userId) {
    return this._userToSockets.get(userId) ?? new Set();
  }

  isOnline(userId) {
    const sockets = this._userToSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getOnlineUserIds() {
    return Array.from(this._userToSockets.keys());
  }

  stats() {
    return {
      onlineUsers: this._userToSockets.size,
      totalSockets: this._socketToUser.size,
    };
  }
}

const registry = new SocketRegistry();
module.exports = registry;
