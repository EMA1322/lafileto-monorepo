// Acceso a permisos por rol
import { prisma } from '../config/prisma.js';

export const rolePermissionRepository = {
  findByRole: (roleId) =>
    prisma.rolePermission.findMany({
      where: { roleId },
      orderBy: { moduleKey: 'asc' }
    }),

  upsertMany: (roleId, entries) => {
    const ops = entries.map((entry) =>
      prisma.rolePermission.upsert({
        where: { roleId_moduleKey: { roleId, moduleKey: entry.moduleKey } },
        update: {
          r: entry.r,
          w: entry.w,
          u: entry.u,
          d: entry.d
        },
        create: {
          roleId,
          moduleKey: entry.moduleKey,
          r: entry.r,
          w: entry.w,
          u: entry.u,
          d: entry.d
        }
      })
    );
    return prisma.$transaction(ops);
  }
};
