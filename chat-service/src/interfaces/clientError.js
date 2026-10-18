const CODE = /^[A-Z][A-Z0-9_]*$/;

function toClientCode(err) {
  const message = err?.message ?? '';
  return CODE.test(message) ? message : 'INTERNAL_ERROR';
}

function sendHttpError(res, err, statusMap = {}) {
  const code = toClientCode(err);
  if (code === 'INTERNAL_ERROR') console.error('[http] unexpected error:', err);
  return res.status(statusMap[code] ?? 500).json({ error: code });
}

module.exports = { toClientCode, sendHttpError };
