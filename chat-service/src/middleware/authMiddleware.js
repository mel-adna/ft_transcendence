const socketAuthUseCase = require('../application/socket/SocketAuthUseCase');

/**
 * Validates JWT from Authorization: Bearer <token>.
 * Attaches req.user = { id, username, email } on success.
 *
 * Delegates to SocketAuthUseCase so REST and WebSocket auth resolve identity
 * (and provision the local User row) the same way — this used to hard-require
 * a `payload.id` claim while the socket path tolerantly fell back to
 * `userId`/`sub`, so a bare Spring token (subject = email, no `id` claim)
 * would be accepted over the socket but rejected here.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    req.user = await socketAuthUseCase.execute({ token });
    // Kept so use cases can forward the caller's own identity to the Java
    // backend (e.g. JavaBackendClient's user search) without needing a
    // separate service-to-service credential.
    req.user.token = token;
    next();
  } catch (err) {
    // only token problems are a 401, anything else is on us
    if (err.message?.startsWith('AUTH_')) {
      return res.status(401).json({ error: `Unauthorized: ${err.message}` });
    }
    console.error('[authMiddleware]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

module.exports = authMiddleware;
