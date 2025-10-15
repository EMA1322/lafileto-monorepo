// Servicio RBAC: roles/modules/permissions + auditoría
import { roleRepository } from '../repositories/roleRepository.js';
import { moduleRepository } from '../repositories/moduleRepository.js';
import { rolePermissionRepository } from '../repositories/rolePermissionRepository.js';
import { auditService } from '../services/auditService.js'; // Auditoría deprecada: servicio convertido en no-op
import { createError } from '../utils/errors.js';

// Helper puro (testeable): convierte filas -> matriz { moduleKey: {r,w,u,d} }
// src/services/rbacService.js
// Helper puro (testeable)
export function toPermissionMatrix(rows) {
  const out = {};
  for (const r of rows) {
    out[r.moduleKey] = { r: !!r.r, w: !!r.w, u: !!r.u, d: !!r.d };
  }
  return out;
}


export const rbacService = {
  // Roles
  listRoles: () => roleRepository.findAll(),

  async createRole({ roleId, name }) {
    const exists = await roleRepository.findById(roleId);
    if (exists) throw createError('CONFLICT', 'roleId ya existe.');
    return roleRepository.create({ roleId, name });
  },

  async updateRole(roleId, { name }) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw createError('RESOURCE_NOT_FOUND', 'Rol no encontrado.');
    return roleRepository.updateName(roleId, name);
  },

  // Modules
  listModules: () => moduleRepository.findAll(),

  // Permissions
  async getPermissions(roleId) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw createError('RESOURCE_NOT_FOUND', 'Rol no encontrado.');
    const rows = await rolePermissionRepository.findByRole(roleId);
    return toPermissionMatrix(rows);
  },

  async savePermissions(roleId, matrix, actorUserId) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw createError('RESOURCE_NOT_FOUND', 'Rol no encontrado.');

    // Upsert por cada moduleKey recibido
    const moduleKeys = Object.keys(matrix || {});
    for (const mk of moduleKeys) {
      const perms = {
        r: !!matrix[mk].r,
        w: !!matrix[mk].w,
        u: !!matrix[mk].u,
        d: !!matrix[mk].d
      };
      await rolePermissionRepository.upsertOne(roleId, mk, perms);
    }

    // Auditoría deprecada: registramos evento inofensivo para compatibilidad
    await auditService.record({
      actorUserId: actorUserId || null,
      action: 'permission_change',
      entity: 'role_permissions',
      entityId: roleId,
      summary: `Actualización de permisos para rol ${roleId}`,
      changedFields: matrix
    }); // Auditoría deprecada: llamada sin efecto persistente

    return { updated: moduleKeys.length };
  }
};
