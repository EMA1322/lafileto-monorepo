// Acceso a roles
import { prisma } from '../config/prisma.js';

export const roleRepository = {
  findAll: () => prisma.role.findMany({ orderBy: { roleId: 'asc' } }),
  findById: (roleId) => prisma.role.findUnique({ where: { roleId } }),
  create: (payload) => prisma.role.create({ data: payload }),
  updateName: (roleId, name) =>
    prisma.role.update({ where: { roleId }, data: { name } })
};
