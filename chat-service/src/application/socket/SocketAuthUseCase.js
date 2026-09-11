const jwt = require('jsonwebtoken');
const UserRepository = require('../../infrastructure/repositories/UserRepository');

/**
 * SocketAuthUseCase
 * Validates the JWT from the socket handshake and returns a normalized user.
 *
 * Hybrid-architecture note:
 * Auth tokens are issued by the Java/Spring backend (Member 1). This service
 * only *verifies* them — it never mints its own. To stay compatible across
 * token shapes we resolve identity tolerantly:
 *
 *   id       ← `id` claim, else `userId`, else the JWT subject (`sub`)
 *   username ← `username` claim, else local-part of the email, else `sub`
 *   email    ← `email` claim, else `sub` (Spring sets subject = email)
 *
 * So it already works with the current bare Spring token (subject = email),
 * and upgrades automatically once they add `id`/`username` claims — no change
 * needed here. The signing secret MUST match theirs: set JWT_SECRET in this
 * service to the same value as the Java app's `app.jwt.secret`.
 *
 * Key encoding: the Java side builds its signing key via
 * `Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey))` — i.e. it treats
 * JWT_SECRET as a Base64-encoded key, not raw UTF-8 bytes. jsonwebtoken's
 * jwt.verify(token, someString) uses the string's raw bytes directly, so
 * passing JWT_SECRET as-is silently produces a different key than Java's
 * and every real token fails with "invalid signature" (surfaced here as
 * AUTH_TOKEN_INVALID). Decoding as base64 first matches Java's derivation.
 */
const SIGNING_KEY = Buffer.from(process.env.JWT_SECRET ?? '', 'base64');

class SocketAuthUseCase {
  /**
   * @param {object} handshakeAuth - socket.handshake.auth
   * @returns {Promise<{ id: string, username: string|null, email: string|null }>}
   */
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

    // Resolve a stable user id across Node-issued and Spring-issued tokens.
    const id = payload.id ?? payload.userId ?? payload.sub;
    if (!id) {
      throw new Error('AUTH_PAYLOAD_INVALID');
    }

    const email = payload.email ?? payload.sub ?? null;
    const username =
      payload.username ??
      (typeof email === 'string' && email.includes('@') ? email.split('@')[0] : null) ??
      payload.sub ??
      null;

    // This service never authenticates users, but it does own a local User
    // row (FK target for messages/rooms/receipts) — provision it on first
    // contact so a real (non-seeded) account isn't broken on its first join.
    await UserRepository.ensureFromIdentity({ id: String(id), username, email });

    return {
      id: String(id),
      username,
      email,
    };
  }
}

module.exports = new SocketAuthUseCase();
