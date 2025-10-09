// Tabla de códigos de error + clase ApiError
// Comentarios en español; código en inglés.

export const ErrorCodes = {
  AUTH_REQUIRED:       401,
  AUTH_INVALID:        401,
  PERMISSION_DENIED:   403,
  RESOURCE_NOT_FOUND:  404,
  CONFLICT:            409,
  CATEGORY_REASSIGN_REQUIRED: 409,
  VALIDATION_ERROR:    422,
  RATE_LIMITED:        429,
  NOT_IMPLEMENTED:     501,
  INTERNAL_ERROR:      500
};

export class ApiError extends Error {
  constructor(code = 'INTERNAL_ERROR', message = 'Error interno', details = null, httpStatus = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details || undefined;
    this.httpStatus = httpStatus || ErrorCodes[code] || 500;
    Error.captureStackTrace?.(this, ApiError);
  }
}

// Helper: crea un ApiError rápido
export function createError(code, message, details) {
  return new ApiError(code, message, details);
}
