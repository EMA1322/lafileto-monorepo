// Servicio de autenticación: login + me
// - Construye effectivePermissions desde DB

import { userRepository } from '../repositories/userRepository.js';
import { rolePermissionRepository } from '../repositories/rolePermissionRepository.js';
import { signJwt } from '../utils/jwt.js';
import { createError } from '../utils/errors.js';
import { comparePassword } from '../utils/bcrypt.js';

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
    if (!user || user.status !== 'ACTIVE') {
      throw createError('AUTH_INVALID', 'Credenciales inválidas.');
    }

    const isOk = await comparePassword(password, user.passwordHash);
    if (!isOk) {
      throw createError('AUTH_INVALID', 'Credenciales inválidas.');
    }

    // Permisos efectivos
    const effectivePermissions = await buildEffectivePermissions(user.roleId);

    // Firmamos JWT (incluimos algunos claims útiles para el Front)
    const token = await signJwt({
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
    if (!user) {
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
