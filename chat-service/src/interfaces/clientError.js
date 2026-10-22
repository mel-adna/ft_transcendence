const CODE = /^[A-Z][A-Z0-9_]*$/;

function toClientCode(err) {
  const message = err?.message ?? '';
  return CODE.test(message) ? message : 'INTERNAL_ERROR';
}

function sendHttpError(res, err, statusMap = {}) {
  const candidate = toClientCode(err);
  const status = statusMap[candidate] ?? 500;
  const code = status >= 500 ? 'INTERNAL_ERROR' : candidate;
  if (status >= 500) console.error('[http] server error:', err?.name ?? 'Error');
  return res.status(status).json({ error: code });
}

module.exports = { toClientCode, sendHttpError };
