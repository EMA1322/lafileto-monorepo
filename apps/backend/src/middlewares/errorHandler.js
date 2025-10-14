import { ErrorCodes } from "../utils/errors.js";

// Tabla inversa: status HTTP → código estándar.
const STATUS_TO_CODE = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "PERMISSION_DENIED",
  404: "NOT_FOUND",
  408: "REQUEST_TIMEOUT",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  501: "NOT_IMPLEMENTED",
  504: "REQUEST_TIMEOUT"
};

// Mensajes seguros por status cuando no viene message.
const DEFAULT_MESSAGES = {
  400: "Solicitud inválida.",
  401: "No autorizado.",
  403: "Acceso denegado.",
  404: "Recurso no encontrado.",
  408: "La petición tardó demasiado.",
  409: "Conflicto con el estado actual del recurso.",
  422: "Datos inválidos.",
  429: "Demasiadas solicitudes.",
  500: "Error interno del servidor.",
  501: "Funcionalidad no implementada.",
  504: "La petición venció en el servidor."
};

// Manejador de errores global con envelope estándar.
export function errorHandler(err, req, res, _next) {
  const env = process.env.NODE_ENV || "development";

  const providedStatus = Number(err.status || err.httpStatus || err.statusCode);
  const normalizedCode = typeof err.code === "string" ? err.code.trim() : "";

  let status = Number.isFinite(providedStatus) ? providedStatus : undefined;
  let code = normalizedCode && ErrorCodes[normalizedCode]
    ? normalizedCode
    : undefined;

  if (!status && code) {
    status = ErrorCodes[code];
  }

  if (!code && status) {
    code = STATUS_TO_CODE[status];
  }

  if (!code) {
    code = "INTERNAL_ERROR";
  }

  if (!status || !Number.isFinite(status)) {
    status = ErrorCodes[code] || 500;
  }

  const message = err.message && typeof err.message === "string"
    ? err.message
    : DEFAULT_MESSAGES[status] || "Error interno del servidor.";

  if (env !== "production") {
    // Log detallado sólo en dev para evitar leaks en producción.
    console.error("[error]", req.id, err?.stack || err);
  }

  const payload = {
    ok: false,
    error: {
      code,
      message
    }
  };

  if (err?.details !== undefined) {
    payload.error.details = err.details;
  }

  return res.status(status).json(payload);
}
