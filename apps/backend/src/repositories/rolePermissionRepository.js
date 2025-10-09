// Acceso a permisos por rol
import { prisma } from '../config/prisma.js';

export const rolePermissionRepository = {
  findByRole: (roleId) =>
    prisma.rolePermission.findMany({
      where: { roleId },
      orderBy: { moduleKey: 'asc' }
    }),

  upsertOne: (roleId, moduleKey, perms) =>
    prisma.rolePermission.upsert({
      where: { roleId_moduleKey: { roleId, moduleKey } },
      update: perms,
      create: { roleId, moduleKey, ...perms }
    })
};
