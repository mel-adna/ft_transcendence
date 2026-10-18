const socketAuthUseCase = require('../application/socket/SocketAuthUseCase');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    req.user = await socketAuthUseCase.execute({ token });
    req.user.token = token;
    next();
  } catch (err) {
    if (err.message?.startsWith('AUTH_')) {
      return res.status(401).json({ error: `Unauthorized: ${err.message}` });
    }
    console.error('[authMiddleware]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

module.exports = authMiddleware;
