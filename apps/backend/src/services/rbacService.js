// Servicio RBAC: roles/modules/permissions + auditoría
import { roleRepository } from '../repositories/roleRepository.js';
import { moduleRepository } from '../repositories/moduleRepository.js';
import { rolePermissionRepository } from '../repositories/rolePermissionRepository.js';
import { auditService } from '../services/auditService.js'; // Auditoría deprecada: servicio convertido en no-op
import { createError } from '../utils/errors.js';

function mapRowsToArray(rows) {
  return rows.map((r) => ({
    moduleKey: r.moduleKey,
    r: !!r.r,
    w: !!r.w,
    u: !!r.u,
    d: !!r.d
  }));
}

export const rbacService = {
  // Roles
  listRoles: () => roleRepository.findAll(),

  // Modules
  listModules: () => moduleRepository.findAll(),

  // Permissions
  async getPermissions(roleId) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw createError('RESOURCE_NOT_FOUND', 'Rol no encontrado.');
    const rows = await rolePermissionRepository.findByRole(roleId);
    return { roleId, permissions: mapRowsToArray(rows) };
  },

  async savePermissions(roleId, permissions = [], actorUserId) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw createError('RESOURCE_NOT_FOUND', 'Rol no encontrado.');

    const normalized = Array.isArray(permissions)
      ? permissions.map((entry) => ({
          moduleKey: String(entry.moduleKey || '').trim(),
          r: !!entry.r,
          w: !!entry.w,
          u: !!entry.u,
          d: !!entry.d
        })).filter((entry) => entry.moduleKey.length > 0)
      : [];

    if (normalized.length > 0) {
      await rolePermissionRepository.upsertMany(roleId, normalized);
    }

    await auditService.record({
      actorUserId: actorUserId || null,
      action: 'permission_change',
      entity: 'role_permissions',
      entityId: roleId,
      summary: `Actualización de permisos para rol ${roleId}`,
      changedFields: normalized
    });

    const refreshed = await rolePermissionRepository.findByRole(roleId);
    return {
      roleId,
      updated: normalized.length,
      permissions: mapRowsToArray(refreshed)
    };
  }
};
