const jwt = require('jsonwebtoken');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

const SIGNING_KEY = Buffer.from(process.env.JWT_SECRET ?? '', 'base64');

class SocketAuthUseCase {
  async execute(handshakeAuth) {
    const token = handshakeAuth?.token;
    if (!token) {
      throw new Error('AUTH_MISSING_TOKEN');
    }

    let payload;
    try {
      payload = jwt.verify(token, SIGNING_KEY);
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new Error('AUTH_TOKEN_EXPIRED');
      throw new Error('AUTH_TOKEN_INVALID');
    }

    const id = payload.id ?? payload.userId ?? payload.sub;
    if (!id) {
      throw new Error('AUTH_PAYLOAD_INVALID');
    }

    const email = payload.email ?? payload.sub ?? null;
    const username = payload.name ?? payload.username ?? email ?? payload.sub ?? null;

    await UserRepository.ensureFromIdentity({ id: String(id), username, email });

    return {
      id: String(id),
      username,
      email,
    };
  }
}

module.exports = new SocketAuthUseCase();
