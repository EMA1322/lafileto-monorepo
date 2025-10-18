// Middleware simple: solo permite continuar si el usuario es role-admin
import { createError } from '../utils/errors.js';

export function requireAdminRole() {
  return (req, _res, next) => {
    if (!req.user) {
      return next(createError('AUTH_REQUIRED', 'Se requiere sesión para esta operación.'));
    }
    if (req.user.roleId !== 'role-admin') {
      return next(createError('PERMISSION_DENIED', 'Solo role-admin puede acceder a esta ruta.'));
    }
    return next();
  };
}
