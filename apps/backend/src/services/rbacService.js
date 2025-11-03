// Servicio RBAC: roles/modules/permissions + auditoría
import { roleRepository } from '../repositories/roleRepository.js';
import { moduleRepository } from '../repositories/moduleRepository.js';
import { rolePermissionRepository } from '../repositories/rolePermissionRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { auditService } from '../services/auditService.js'; // Auditoría deprecada: servicio convertido en no-op
import { createError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';

function mapRowsToArray(rows) {
  return rows.map((r) => ({
    moduleKey: r.moduleKey,
    r: !!r.r,
    w: !!r.w,
    u: !!r.u,
    d: !!r.d,
    changeStatus: !!r.changeStatus
  }));
}

function slugifyRoleName(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function buildRoleId(rawRoleId, roleName) {
  if (rawRoleId && rawRoleId.trim().length > 0) {
    return rawRoleId.trim().toLowerCase();
  }
  const base = slugifyRoleName(roleName || 'rol');
  const suffix = base || 'nuevo';
  return suffix.startsWith('role-') ? suffix : `role-${suffix}`;
}

export const rbacService = {
  // Roles
  listRoles: () => roleRepository.findAll(),

  async createRole({ roleId, name }) {
    const normalizedName = name.trim();
    const finalRoleId = buildRoleId(roleId, normalizedName);

    const existing = await roleRepository.findById(finalRoleId);
    if (existing) {
      throw createError('RESOURCE_CONFLICT', 'El rol ya existe.');
    }

    const modules = await moduleRepository.findAll();
    const moduleKeys = modules.map((m) => m.moduleKey || m.key).filter(Boolean);

    const ops = [
      prisma.role.create({ data: { roleId: finalRoleId, name: normalizedName } })
    ];

    if (moduleKeys.length > 0) {
      ops.push(
        prisma.rolePermission.createMany({
          data: moduleKeys.map((moduleKey) => ({
            roleId: finalRoleId,
            moduleKey,
            r: false,
            w: false,
            u: false,
            d: false
          })),
          skipDuplicates: true
        })
      );
    }

    await prisma.$transaction(ops);

    return { roleId: finalRoleId, name: normalizedName };
  },

  async updateRole(roleId, { name }) {
    const normalizedName = name.trim();
    const existing = await roleRepository.findById(roleId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'El rol no existe.');
    }
    const updated = await roleRepository.updateName(roleId, normalizedName);
    return { roleId: updated.roleId, name: updated.name };
  },

  async deleteRole(roleId) {
    if (roleId === 'role-admin') {
      throw createError('RESOURCE_CONFLICT', 'No se puede eliminar el rol administrador.');
    }

    const existing = await roleRepository.findById(roleId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'El rol no existe.');
    }

    const users = await userRepository.countByRoleId(roleId);
    if (users > 0) {
      throw createError('ROLE_IN_USE', 'Hay usuarios asignados a este rol.');
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.role.delete({ where: { roleId } })
    ]);

    return { roleId };
  },

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
          d: !!entry.d,
          changeStatus: !!entry.changeStatus
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
