// Verifica Authorization: Bearer <token> y adjunta req.user
import { createError } from '../utils/errors.js';
import { verifyJwt } from '../utils/jwt.js';

export function authJWT() {
  return async (req, _res, next) => {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');

    if (!token) {
      return next(createError('AUTH_REQUIRED', 'Se requiere autenticación.'));
    }

    try {
      const payload = await verifyJwt(token);
      // Por convención, nuestros tokens incluirán: { sub, email, fullName, roleId, effectivePermissions? }
      req.user = {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        roleId: payload.roleId,
        effectivePermissions: payload.effectivePermissions // opcional en I1
      };
      next();
    } catch {
      return next(createError('AUTH_INVALID', 'Token inválido o expirado.'));
    }
  };
}
