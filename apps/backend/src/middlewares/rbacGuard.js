// Enforce de permisos por rol: r|w|u|d sobre un moduleKey
// Si el token ya trae effectivePermissions, se usan. Si no, consulta DB.
import { prisma } from '../config/prisma.js';
import { createError } from '../utils/errors.js';

// action: 'r' | 'w' | 'u' | 'd'
export function rbacGuard(moduleKey, action = 'r', options = {}) {
  const deniedCode = typeof options.errorCode === 'string' && options.errorCode.trim().length > 0
    ? options.errorCode.trim()
    : 'PERMISSION_DENIED';
  const deniedMessage = typeof options.errorMessage === 'string' && options.errorMessage.trim().length > 0
    ? options.errorMessage.trim()
    : 'No tienes permiso para esta acción.';

  return async (req, _res, next) => {
    if (!req.user) {
      return next(createError('AUTH_REQUIRED', 'Se requiere sesión para esta ruta.'));
    }

    const roleId = req.user.roleId;
    if (!roleId) {
      return next(createError('AUTH_INVALID', 'Token sin roleId.'));
    }

    // 1) Si el token trae permisos efectivos, úsalo
    const fromToken = req.user.effectivePermissions?.[moduleKey];
    if (fromToken && fromToken[action]) return next();

    // 2) Consulta puntual a DB (roleId + moduleKey)
    try {
      const rp = await prisma.rolePermission.findUnique({
        where: { roleId_moduleKey: { roleId, moduleKey } },
        select: { r: true, w: true, u: true, d: true }
      });

      const allowed = !!rp?.[action];
      if (!allowed) {
        return next(createError(deniedCode, deniedMessage));
      }
      return next();
    } catch (err) {
      return next(createError('INTERNAL_ERROR', 'Error verificando permisos.', { cause: String(err) }));
    }
  };
}

