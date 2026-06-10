const jwt = require('jsonwebtoken');

/**
 * SocketAuthUseCase
 * Validates JWT from socket handshake, returns decoded user payload.
 * Throws on invalid/expired token.
 */
class SocketAuthUseCase {
  /**
   * @param {object} handshakeAuth - socket.handshake.auth
   * @returns {{ id: string, username: string, email: string }}
   */
  execute(handshakeAuth) {
    const token = handshakeAuth?.token;
    if (!token) {
      throw new Error('AUTH_MISSING_TOKEN');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new Error('AUTH_TOKEN_EXPIRED');
      throw new Error('AUTH_TOKEN_INVALID');
    }

    if (!payload.id) {
      throw new Error('AUTH_PAYLOAD_INVALID');
    }

    return {
      id: String(payload.id),
      username: payload.username ?? null,
      email: payload.email ?? null,
    };
  }
}

module.exports = new SocketAuthUseCase();
