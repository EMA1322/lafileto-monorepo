// Manejador de errores global con envelope estándar
export function errorHandler(err, req, res, _next) {
  const status = Number(err.status || err.httpStatus || 500);
  const code =
    err.code ||
    (status === 404
      ? "NOT_FOUND"
      : status === 429
      ? "TOO_MANY_REQUESTS"
      : "INTERNAL_ERROR");
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[error]", req.id, err?.stack || err);
  }

  return res.status(status).json({
    ok: false,
    error: { code, message }
  });
}
