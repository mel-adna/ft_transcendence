const jwt = require('jsonwebtoken');
const { verifyCurrentIdentity } = require('../../infrastructure/http/JavaBackendClient');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

const SIGNING_KEY = Buffer.from(process.env.JWT_SECRET ?? '', 'base64');
if (SIGNING_KEY.length < 32) {
  throw new Error('JWT_SECRET is missing or shorter than 256 bits');
}
const VERIFY_OPTIONS = { algorithms: ['HS256', 'HS384', 'HS512'] };

class SocketAuthUseCase {
  async execute(handshakeAuth, { clientIp = null } = {}) {
    const token = handshakeAuth?.token;
    if (!token || typeof token !== 'string') {
      throw new Error('AUTH_MISSING_TOKEN');
    }

    let payload;
    try {
      payload = jwt.verify(token, SIGNING_KEY, VERIFY_OPTIONS);
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new Error('AUTH_TOKEN_EXPIRED');
      throw new Error('AUTH_TOKEN_INVALID');
    }

    if (!payload || typeof payload !== 'object'
      || !Number.isInteger(payload.exp) || !Number.isInteger(payload.iat)
      || !Number.isInteger(payload.sv) || payload.sv < 1
      || typeof payload.sub !== 'string' || !payload.sub.trim()
      || typeof payload.id !== 'string') throw new Error('AUTH_PAYLOAD_INVALID');

    const id = payload.id;
    if (!id) {
      throw new Error('AUTH_PAYLOAD_INVALID');
    }

    await verifyCurrentIdentity(token, id, { clientIp });

    const email = payload.email ?? payload.sub ?? null;
    const username = payload.name ?? payload.username ?? email ?? payload.sub ?? null;

    const sv = Number.isInteger(payload.sv) && payload.sv >= 0 ? payload.sv : 0;
    const { revoked, raised } = await UserRepository.authenticate({ id: String(id), username, email, sv });
    if (revoked) throw new Error('AUTH_TOKEN_REVOKED');

    return { id: String(id), username, email, sv, svRaised: raised, expiresAt: payload.exp * 1000 };
  }
}

module.exports = new SocketAuthUseCase();
