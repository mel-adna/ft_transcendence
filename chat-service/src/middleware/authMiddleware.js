const jwt = require('jsonwebtoken');

/**
 * Validates JWT from Authorization: Bearer <token>.
 * Attaches req.user = { id, username, email } on success.
 * Replace or extend when Member 1's auth middleware is ready.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.id) {
      return res.status(401).json({ error: 'Unauthorized: invalid token payload' });
    }
    req.user = {
      id: String(payload.id),
      username: payload.username ?? null,
      email: payload.email ?? null,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

module.exports = authMiddleware;
