const socketAuthUseCase = require('../application/socket/SocketAuthUseCase');
const socketServer = require('../infrastructure/socket/SocketServer');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    req.user = await socketAuthUseCase.execute({ token });
    if (req.user.svRaised) socketServer.disconnectStaleSessions(req.user.id, req.user.sv);
    req.user.token = token;
    next();
  } catch (err) {
    if (err.message === 'AUTH_AUTHORITY_UNAVAILABLE') {
      return res.status(503).json({ error: 'AUTH_AUTHORITY_UNAVAILABLE' });
    }
    if (err.message?.startsWith('AUTH_')) {
      return res.status(401).json({ error: `Unauthorized: ${err.message}` });
    }
    console.error('[authMiddleware]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

module.exports = authMiddleware;
