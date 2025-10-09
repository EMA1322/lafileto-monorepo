// Servicio de autenticación: login + me
// - Implementa lockout por intentos fallidos
// - Construye effectivePermissions desde DB

import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository.js';
import { rolePermissionRepository } from '../repositories/rolePermissionRepository.js';
import { signJwt } from '../utils/jwt.js';
import { createError } from '../utils/errors.js';

// Reglas de lockout (puedes ajustar aquí)
const MAX_FAILED = 10;           // intentos fallidos
const LOCK_MS    = 15 * 60 * 1000; // 15 minutos

// Helper puro (testeable): calcula nuevo estado de lock/contador
export function calculateLockState(user, isPasswordOk, now = Date.now()) {
  if (isPasswordOk) return { reset: true, lockUntil: null, bump: false };

  const failed = (user.failedLoginAttempts || 0) + 1;
  const shouldLock = failed >= MAX_FAILED;
  return {
    reset: false,
    bump: true,
    lockUntil: shouldLock ? new Date(now + LOCK_MS) : null,
    failed
  };
}

async function buildEffectivePermissions(roleId) {
  const rows = await rolePermissionRepository.findByRole(roleId);
  const map = Object.create(null);
  for (const r of rows) {
    map[r.moduleKey] = { r: !!r.r, w: !!r.w, u: !!r.u, d: !!r.d };
  }
  return map;
}

export const authService = {
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    // No exponemos si existe/no existe (security by design)
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw createError('AUTH_INVALID', 'Credenciales inválidas.');
    }

    // ¿Cuenta bloqueada temporalmente?
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const mins = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw createError('RATE_LIMITED', `Cuenta bloqueada por intentos fallidos. Intenta en ${mins} min.`);
    }

    const isOk = bcrypt.compareSync(password, user.passwordHash);
    const lockState = calculateLockState(user, isOk);

    if (!isOk) {
      await userRepository.bumpFailedAttempt(user.id, lockState.lockUntil);
      // Si justo lo bloqueamos, informamos con RATE_LIMITED; si no, AUTH_INVALID.
      if (lockState.lockUntil) {
        throw createError('RATE_LIMITED', 'Cuenta bloqueada temporalmente por intentos fallidos.');
      }
      throw createError('AUTH_INVALID', 'Credenciales inválidas.');
    }

    // Reset contador/lock en éxito
    await userRepository.resetLoginState(user.id);

    // Permisos efectivos
    const effectivePermissions = await buildEffectivePermissions(user.roleId);

    // Firmamos JWT (incluimos algunos claims útiles para el Front)
    const token = signJwt({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      effectivePermissions // opcional: acelera el guard del Front/Back
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        status: user.status
      },
      effectivePermissions
    };
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user || user.deletedAt) {
      throw createError('AUTH_INVALID', 'Sesión inválida.');
    }
    const effectivePermissions = await buildEffectivePermissions(user.roleId);
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        status: user.status
      },
      effectivePermissions
    };
  }
};
