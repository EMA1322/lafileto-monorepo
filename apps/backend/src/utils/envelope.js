// Envelope de respuesta uniforme
export function ok(data = null, meta = null) {
  const out = { ok: true };
  if (data !== null) out.data = data;
  if (meta !== null) out.meta = meta;
  return out;
}

export function fail(code, message, details = null) {
  const out = { ok: false, error: { code, message } };
  if (details) out.error.details = details;
  return out;
}
