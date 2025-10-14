// Manejador de errores global con envelope estándar
export function errorHandler(err, req, res, _next) {
  const status = Number(err.status || err.httpStatus || 500);
  const statusToCode = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "PERMISSION_DENIED",
    404: "NOT_FOUND",
    408: "REQUEST_TIMEOUT",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_ERROR",
    502: "INTERNAL_ERROR",
    503: "INTERNAL_ERROR",
    504: "REQUEST_TIMEOUT"
  };
  const code = err.code || statusToCode[status] || "INTERNAL_ERROR";
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[error]", req.id, err?.stack || err);
  }

  return res.status(status).json({
    ok: false,
    error: { code, message }
  });
}
