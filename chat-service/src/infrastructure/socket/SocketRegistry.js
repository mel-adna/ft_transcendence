/**
 * SocketRegistry
 * Maintains bidirectional mapping: userId <-> Set<socketId>
 * Supports multiple tabs/devices per user
 */
class SocketRegistry {
  constructor() {
    /** @type {Map<string, Set<string>>} userId -> socketIds */
    this._userToSockets = new Map();
    /** @type {Map<string, string>} socketId -> userId */
    this._socketToUser = new Map();
  }

  /**
   * Register a socket for a user
   * @param {string} userId
   * @param {string} socketId
   */
  register(userId, socketId) {
    if (!this._userToSockets.has(userId)) {
      this._userToSockets.set(userId, new Set());
    }
    this._userToSockets.get(userId).add(socketId);
    this._socketToUser.set(socketId, userId);
  }

  /**
   * Remove a socket, returns userId if all sockets for that user are gone
   * @param {string} socketId
   * @returns {{ userId: string, isLastSocket: boolean } | null}
   */
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

  /**
   * @param {string} socketId
   * @returns {string | undefined}
   */
  getUserId(socketId) {
    return this._socketToUser.get(socketId);
  }

  /**
   * @param {string} userId
   * @returns {Set<string>}
   */
  getSocketIds(userId) {
    return this._userToSockets.get(userId) ?? new Set();
  }

  /**
   * @param {string} userId
   * @returns {boolean}
   */
  isOnline(userId) {
    const sockets = this._userToSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * @returns {string[]} All online userIds
   */
  getOnlineUserIds() {
    return Array.from(this._userToSockets.keys());
  }

  /**
   * Debug snapshot
   */
  stats() {
    return {
      onlineUsers: this._userToSockets.size,
      totalSockets: this._socketToUser.size,
    };
  }
}

// Singleton
const registry = new SocketRegistry();
module.exports = registry;
