// Tabla de códigos de error + clase ApiError
// Comentarios en español; código en inglés.

export const ErrorCodes = {
  // 400 → Request inválida (payload mal formado, parámetros incorrectos, etc.).
  BAD_REQUEST:                400,
  // 401 → Falta token o es inválido.
  UNAUTHORIZED:               401,
  AUTH_REQUIRED:              401,
  AUTH_INVALID:               401,
  // 403 → Usuario autenticado pero sin permisos suficientes.
  PERMISSION_DENIED:          403,
  RBAC_FORBIDDEN:             403,
  // 404 → Recurso inexistente o ID inválido.
  NOT_FOUND:                  404,
  RESOURCE_NOT_FOUND:         404,
  CATEGORY_NOT_FOUND:         404,
  // 408/504 → Request excedió el tiempo máximo permitido.
  REQUEST_TIMEOUT:            408,
  GATEWAY_TIMEOUT:            504,
  // 409 → Conflictos de negocio (duplicados, dependencias, etc.).
  CONFLICT:                   409,
  RESOURCE_CONFLICT:          409,
  CATEGORY_REASSIGN_REQUIRED: 409,
  CATEGORY_NAME_CONFLICT:     409,
  ROLE_IN_USE:                409,
  SELF_DELETE_FORBIDDEN:      409,
  LAST_ADMIN_FORBIDDEN:       409,
  // 422 → Validación semántica fallida.
  VALIDATION_ERROR:           422,
  // 429 → Rate limit superado o bloqueo temporal.
  RATE_LIMITED:               429,
  TOO_MANY_REQUESTS:          429,
  // 500+ → Errores inesperados.
  INTERNAL_ERROR:             500,
  NOT_IMPLEMENTED:            501
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
