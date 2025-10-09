// Verifica Authorization: Bearer <token> y adjunta req.user
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createError } from '../utils/errors.js';

export function authJWT() {
  return (req, _res, next) => {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');

    if (!token) {
      return next(createError('AUTH_REQUIRED', 'Se requiere autenticación.'));
    }

    try {
      const payload = jwt.verify(token, env.jwt.secret);
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
