const CODE = /^[A-Z][A-Z0-9_]*$/;

function toClientCode(err) {
  const message = err?.message ?? '';
  return CODE.test(message) ? message : 'INTERNAL_ERROR';
}

function sendHttpError(res, err, statusMap = {}) {
  const code = toClientCode(err);
  const status = statusMap[code] ?? 500;
  if (status >= 500) console.error('[http] server error:', err);
  return res.status(status).json({ error: code });
}

module.exports = { toClientCode, sendHttpError };
