// Middleware de timeout de request: aborta requests que exceden el límite seguro.
// Comentado porque es diagnóstico temporal para el login colgado.
import { createError } from "../utils/errors.js";

export function requestTimeout(timeoutMs = 15000) {
  const limit = Number(timeoutMs);
  if (!Number.isFinite(limit) || limit <= 0) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    let finished = false;

    const clear = () => {
      finished = true;
      if (timer) clearTimeout(timer);
    };

    res.on("finish", clear);
    res.on("close", clear);

    const timer = setTimeout(() => {
      if (finished || res.headersSent) return;
      const err = createError(
        "REQUEST_TIMEOUT",
        `Request timed out after ${limit}ms`
      );
      err.details = { path: req.originalUrl };
      err.status = err.httpStatus; // aseguro status en errorHandler
      // TODO: remove debug log (timeout instrumentation)
      console.warn("[request-timeout]", req.id, req.method, req.originalUrl, `${limit}ms`);
      next(err);
    }, limit);

    next();
  };
}
